/**
 * TarifaX · Comparativo SICETAC vs tarifa del cliente
 *
 * Cruza las tarifas negociadas con cada cliente (consolidado comercial) contra
 * el costo SICETAC de la misma ruta y vehículo, mes a mes. SICETAC se carga por
 * mes (enero a diciembre); el tarifario vigente de TarifaX sirve de primer
 * periodo. Solo las tarifas por tipo de vehículo son comparables: SICETAC es el
 * costo de un viaje.
 *
 * Variación = (tarifa del cliente − SICETAC) / SICETAC. Se resume ponderada
 * (total cobrado contra total SICETAC), no como promedio de porcentajes.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Paper, Typography, Button, Stack, Chip, TextField, MenuItem, Autocomplete, Alert, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  CompareArrows, CloudUpload, Delete, ExpandMore, FileDownload, CheckCircle, RadioButtonUnchecked, Refresh,
  EditLocationAlt, FilterAltOff, TrendingDown, TrendingUp, AccessTime, DirectionsCar, WarningAmber,
} from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceLine,
  BarChart, Bar, Cell, LabelList,
} from 'recharts'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { Encabezado, errorApi } from '@/components/comun/Registro'
import { apiClient as api } from '@/api/client'
import { COLOR_MODULO } from '@/config/marca'
import { CascadaSicetac } from '@/components/tarifax/CascadaSicetac'
import { ConfigVehiculos } from '@/components/tarifax/ConfigVehiculos'
import { EncabezadosOrden, useOrden, type ColumnaOrden } from '@/components/tarifax/OrdenTabla'
import { DialogoFlota, ResumenFlota, TablaFlota, filasExcelFlota, type Flota, type FlotaConfig } from '@/components/tarifax/FlotaPropia'

const COLOR = COLOR_MODULO
// Par divergente validado (CVD y contraste) sobre la superficie clara.
const ENCIMA = '#2a78d6'     // el cliente paga por encima de SICETAC
const DEBAJO = '#e34948'     // el cliente paga por debajo de SICETAC
const GRILLA = '#e6e5e0'
const BASE = '/tarifax/comparativo'
const LARGO = { timeout: 600000 }

const pesos = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const millones = (v?: number | null) => v == null ? '—' : `$ ${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
const pct = (v?: number | null, signo = true) => v == null ? '—' : `${signo && v > 0 ? '+' : ''}${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`
const num = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 0 })
const fecha = (s?: string | null) => s ? new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''

interface Mes {
  periodo: string; mes: number; nombre: string; cargado: boolean; archivo: string | null; rutas: number; cargado_en: string | null; usuario: string | null
  estado: 'LISTO' | 'EN_COLA' | 'PROCESANDO' | 'ERROR' | 'INTERRUMPIDO' | null; mensaje: string | null
  filas_leidas: number | null; filas_totales: number | null; reprocesable: boolean
}
const enCurso = (m: Mes) => m.estado === 'EN_COLA' || m.estado === 'PROCESANDO'
/** Lo que se ve del procesamiento de un mes: en cola, leyendo (con porcentaje si se sabe el total) o cruzando. */
function textoProceso(m: Mes) {
  if (m.estado === 'EN_COLA') return 'En cola: se procesa al terminar el mes anterior'
  const n = m.filas_leidas ?? 0, total = m.filas_totales ?? 0
  if (!n) return 'Abriendo el archivo…'
  if (total && n >= total) return `${num(n)} filas leídas · cruzando con las tarifas…`
  return total ? `Leyendo… ${Math.min(99, Math.floor(n / total * 100))} % (${num(n)} de ${num(total)} filas)` : `Leyendo… ${num(n)} filas`
}
interface Vehiculo { categoria: string; tarifas: number; tipo_sicetac: string | null; por: 'MAPEO' | 'SINONIMO' | null; sinonimo_de: string | null }
interface Estado {
  vehiculos: Vehiculo[]
  negociaciones: { total: number; comparables: number; clientes: number; archivo: string | null; cargado_en: string | null }
  anio: number; anios: number[]; meses: Mes[]; vigente: boolean
}
interface Fila {
  periodo: string; nombre_periodo?: string; cliente: string; servicio: string | null; origen: string; destino: string
  categoria: string | null; tipo_vehiculo: string | null; carroceria: string | null; distancia: number | null
  tarifa: number | null; sicetac: number | null; diferencia: number | null; variacion: number | null; estado: string
  sicetac_base?: number | null; horas_valor?: number | null; dpto_origen?: string | null; dpto_destino?: string | null
  tipo_tarifa?: string | null; tipo_carga?: string | null; horas_usadas?: number | null; fecha_sicetac?: string | null
}
interface Tablero {
  opciones: { periodos: { periodo: string; nombre: string }[]; clientes: string[]; origenes: string[]; destinos: string[]; servicios: string[]; categorias: string[]; carrocerias: string[]; tipos_carga?: string[]; dptos_origen: string[]; dptos_destino: string[]; tipos_tarifa: string[] }
  kpis: null | { tarifas: number; clientes: number; rutas: number; variacion: number | null; mediana: number; por_debajo: number; por_debajo_pct: number; tarifa_total: number; sicetac_total: number; sin_referencia: number; cobertura_pct: number; sicetac_base_total: number; horas_total: number; horas: number | null; horas_sin_valor: number; horas_prom: number }
  por_mes: { periodo: string; nombre: string; tarifas: number; variacion: number | null; tarifa_prom: number; sicetac_prom: number; sicetac_base_prom: number; horas_prom: number; variacion_prom: number | null; por_debajo: number }[]
  por_cliente: { cliente: string; tarifas: number; rutas: number; variacion: number | null; por_debajo: number }[]
  por_categoria: { categoria: string; tipo_vehiculo: string; tarifas: number; variacion: number | null }[]
  detalle: Fila[]; detalle_total?: number; sin_referencia: Fila[]; sin_referencia_total: number; carroceria: string
  no_comparables: NoComparable[]; no_comparables_total: number
  flota: Flota | null
}
interface NoComparable { cliente: string; servicio: string | null; origen: string; destino: string; tipo_tarifa: string | null; tarifa: number | null; motivo: string }
type Filtros = { periodos: string[]; clientes: string[]; origenes: string[]; destinos: string[]; servicios: string[]; categorias: string[]
                 dptosOrigen: string[]; dptosDestino: string[]; tiposTarifa: string[]; posicion: '' | 'ENCIMA' | 'DEBAJO'; carroceria: string; tipoCarga: string }
const VACIO: Filtros = { periodos: [], clientes: [], origenes: [], destinos: [], servicios: [], categorias: [], dptosOrigen: [], dptosDestino: [], tiposTarifa: [], posicion: '', carroceria: 'FURGON', tipoCarga: 'GENERAL' }
// Horas logísticas del análisis; vacío = las que trae cada ruta en el SICETAC.
// (Clave nueva: antes «0» era el valor por defecto y ahora significa «sin horas».)
const CLAVE_HORAS = 'tx-comparativo-horas-v2'
const horasGuardadas = (): number | null => {
  try { const v = localStorage.getItem(CLAVE_HORAS); return v == null || v === '' ? null : Math.max(0, Number(v) || 0) } catch { return null }
}

const motivoSinRef = (r: Fila) => r.estado === 'SIN_VEHICULO' ? 'Vehículo sin equivalencia SICETAC' : 'Ruta no publicada en SICETAC'
const ruta = (r: { origen: string; destino: string }) => `${r.origen} → ${r.destino}`
// Columnas de cada pestaña: cada una se ordena con un clic en su encabezado.
const COLS_COMPARADAS: ColumnaOrden<Fila>[] = [
  { titulo: 'Mes', valor: r => r.periodo }, { titulo: 'Cliente', valor: r => r.cliente }, { titulo: 'Ruta', valor: ruta },
  { titulo: 'Vehículo', valor: r => r.categoria }, { titulo: 'Km', valor: r => r.distancia, numero: true },
  { titulo: 'Tarifa cliente', valor: r => r.tarifa, numero: true }, { titulo: 'SICETAC', valor: r => r.sicetac, numero: true },
  { titulo: 'Diferencia', valor: r => r.diferencia, numero: true }, { titulo: 'Variación', valor: r => r.variacion, numero: true },
]
const COLS_SIN_REF: ColumnaOrden<Fila>[] = [
  { titulo: 'Cliente', valor: r => r.cliente }, { titulo: 'Ruta', valor: ruta }, { titulo: 'Vehículo', valor: r => r.categoria },
  { titulo: 'Tarifa cliente', valor: r => r.tarifa, numero: true }, { titulo: 'Motivo', valor: motivoSinRef },
]
const COLS_NO_COMP: ColumnaOrden<NoComparable>[] = [
  { titulo: 'Cliente', valor: r => r.cliente }, { titulo: 'Tipo de servicio', valor: r => r.servicio },
  { titulo: 'Tipo de tarifa', valor: r => r.tipo_tarifa }, { titulo: 'Ruta', valor: ruta },
  { titulo: 'Tarifa', valor: r => r.tarifa, numero: true }, { titulo: 'Motivo', valor: r => r.motivo },
]
const SIN_FILAS: Fila[] = []
const SIN_NC: NoComparable[] = []

function exportar(nombre: string, filas: Record<string, unknown>[]) {
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Datos')
  XLSX.writeFile(libro, `${nombre}.xlsx`)
}

/** Cifra del encabezado: el número en tinta de texto; el color solo en la marca. */
function Indicador({ titulo, valor, sub, marca }: { titulo: string; valor: string; sub?: string; marca?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Stack direction="row" alignItems="center" gap={1}>
        {marca && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: marca }} />}
        <Typography fontSize={12} color="text.secondary">{titulo}</Typography>
      </Stack>
      <Typography fontSize={26} fontWeight={800} lineHeight={1.2} mt={0.5}>{valor}</Typography>
      {sub && <Typography fontSize={12} color="text.secondary">{sub}</Typography>}
    </Paper>
  )
}

function Variacion({ v }: { v: number | null }) {
  if (v == null) return <>—</>
  const c = v < 0 ? DEBAJO : ENCIMA
  return (
    <Stack direction="row" alignItems="center" gap={0.5} justifyContent="flex-end">
      {v < 0 ? <TrendingDown sx={{ fontSize: 16, color: c }} /> : <TrendingUp sx={{ fontSize: 16, color: c }} />}
      <Typography fontSize={13} fontWeight={700}>{pct(v)}</Typography>
    </Stack>
  )
}

function Multiple({ etiqueta, opciones, valor, onChange, nombres, vacio = 'Todos' }: {
  etiqueta: string; opciones: string[]; valor: string[]; onChange: (v: string[]) => void; nombres?: Record<string, string>; vacio?: string
}) {
  return (
    <Autocomplete multiple size="small" limitTags={1} options={opciones} value={valor} disableCloseOnSelect
      getOptionLabel={o => nombres?.[o] ?? o} onChange={(_, v) => onChange(v)} sx={{ minWidth: 190, flex: 1 }}
      renderInput={p => <TextField {...p} label={etiqueta} placeholder={valor.length ? '' : vacio} InputLabelProps={{ shrink: true }} />} />
  )
}

export default function TarifaxComparativo() {
  const qc = useQueryClient()
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [f, setF] = useState<Filtros>(VACIO)
  const [cargando, setCargando] = useState<string | null>(null)
  const [aliasAbierto, setAliasAbierto] = useState(false)
  const [tab, setTab] = useState(0)
  const [pagina, setPagina] = useState(0)
  // Horas logísticas del análisis: las decide quien analiza; se recuerdan en este navegador.
  const [horas, setHoras] = useState<number | null>(horasGuardadas)
  const [horasAbierto, setHorasAbierto] = useState(false)
  const [vehiculosAbierto, setVehiculosAbierto] = useState(false)
  const [flotaAbierto, setFlotaAbierto] = useState(false)
  // La barra de pestañas se mueve hacia los lados con la rueda del mouse
  // (sin tener que apuntar a las flechas) mientras le quede recorrido.
  const barraTabs = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = barraTabs.current?.querySelector('.MuiTabs-scroller') as HTMLElement | null
    if (!el) return
    const rueda = (ev: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY
      const alFinal = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      if ((d > 0 && alFinal) || (d < 0 && el.scrollLeft <= 0)) return
      ev.preventDefault()
      el.scrollLeft += d
    }
    el.addEventListener('wheel', rueda, { passive: false })
    return () => el.removeEventListener('wheel', rueda)
  })
  // null = sin elegir: se abre solo si todavía no hay negociaciones (decidido ya con el estado cargado).
  const [cargueAbierto, setCargueAbierto] = useState<boolean | null>(null)
  useEffect(() => { try { localStorage.setItem(CLAVE_HORAS, horas == null ? '' : String(horas)) } catch { /* sin almacenamiento */ } }, [horas])
  const archivoNeg = useRef<HTMLInputElement>(null)
  const archivoMes = useRef<HTMLInputElement>(null)
  const mesElegido = useRef<number>(1)

  const estado = useQuery<Estado>({
    queryKey: ['tx-comp-estado', anio], queryFn: () => api.get(`${BASE}/estado`, { params: { anio } }).then(r => r.data),
    refetchInterval: q => (q.state.data?.meses ?? []).some(enCurso) ? 4000 : false,
  })
  const [subida, setSubida] = useState<{ mes: number; pct: number } | null>(null)
  // Al terminar un procesamiento en segundo plano: aviso y tablero al día.
  const procesando = useRef<Set<string>>(new Set())
  useEffect(() => {
    const ahora = new Set((estado.data?.meses ?? []).filter(enCurso).map(m => m.periodo))
    for (const per of procesando.current) {
      if (!ahora.has(per)) {
        const m = estado.data?.meses.find(x => x.periodo === per)
        if (m?.estado === 'LISTO') toast.success(`${m.nombre}: ${num(m.rutas)} rutas SICETAC procesadas`, { duration: 7000 })
        else if (m?.estado === 'ERROR') toast.error(`${m.nombre}: ${m.mensaje}`, { duration: 10000 })
        qc.invalidateQueries({ queryKey: ['tx-comp-tablero'] })
      }
    }
    procesando.current = ahora
  }, [estado.data])  // eslint-disable-line react-hooks/exhaustive-deps
  const params = useMemo(() => ({
    periodos: f.periodos.join('|') || undefined, clientes: f.clientes.join('|') || undefined,
    origenes: f.origenes.join('|') || undefined, destinos: f.destinos.join('|') || undefined,
    servicios: f.servicios.join('|') || undefined, categorias: f.categorias.join('|') || undefined, carroceria: f.carroceria,
    tipo_carga: f.tipoCarga,
    dptos_origen: f.dptosOrigen.join('|') || undefined, dptos_destino: f.dptosDestino.join('|') || undefined,
    tipos_tarifa: f.tiposTarifa.join('|') || undefined,
    posicion: f.posicion || undefined, horas: horas ?? undefined,
  }), [f, horas])
  const tablero = useQuery<Tablero>({ queryKey: ['tx-comp-tablero', params], queryFn: () => api.get(`${BASE}/tablero`, { params }).then(r => r.data) })
  const t = tablero.data
  const flotaCfg = useQuery<FlotaConfig>({ queryKey: ['tx-comp-flota'], queryFn: () => api.get(`${BASE}/flota`).then(r => r.data) })
  const nombresPer = useMemo(() => Object.fromEntries((t?.opciones.periodos ?? []).map(p => [p.periodo, p.nombre])), [t])

  // Sin mes elegido, el servidor compara cada tarifa con su SICETAC más reciente.
  useEffect(() => setPagina(0), [params])
  // El tipo de carga elegido puede no existir para otra carrocería (no hay
  // «General» en furgón refrigerado): se pasa al primero que sí exista.
  useEffect(() => {
    const tipos = t?.opciones.tipos_carga ?? []
    if (tipos.length && !tipos.includes(f.tipoCarga)) setF(x => ({ ...x, tipoCarga: tipos.includes('GENERAL') ? 'GENERAL' : tipos[0] }))
  }, [t?.opciones.tipos_carga])  // eslint-disable-line react-hooks/exhaustive-deps

  const refrescar = () => { qc.invalidateQueries({ queryKey: ['tx-comp-estado'] }); qc.invalidateQueries({ queryKey: ['tx-comp-tablero'] }) }
  const subir = async (ruta: string, archivo: File, clave: string, exito: (r: any) => string) => {
    const datos = new FormData()
    datos.append('archivo', archivo)
    setCargando(clave)
    try {
      const r = await api.post(ruta, datos, LARGO).then(x => x.data)
      toast.success(exito(r), { duration: 7000 })
      refrescar()
    } catch (e) { toast.error(errorApi(e, 'No se pudo cargar el archivo')) } finally { setCargando(null) }
  }
  const onNegociaciones = (e: React.ChangeEvent<HTMLInputElement>) => {
    const entrada = e.target, a = entrada.files?.[0]
    // El campo se limpia después de enviar: limpiarlo antes puede dejar el archivo vacío.
    if (a) subir(`${BASE}/negociaciones`, a, 'neg', r => `${num(r.filas)} tarifas de ${r.clientes} clientes · ${num(r.comparables)} comparables con SICETAC`).finally(() => { entrada.value = '' })
  }
  const onMes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const entrada = e.target, a = entrada.files?.[0]
    const m = mesElegido.current
    if (!a) return
    if (a.size > 1024 * 1024 * 1024) { toast.error('El archivo pesa más de 1 GB.'); entrada.value = ''; return }
    const datos = new FormData()
    datos.append('archivo', a)
    setCargando(`m${m}`)
    setSubida({ mes: m, pct: 0 })
    api.post(`${BASE}/sicetac/${anio}/${m}`, datos, {
      timeout: 0,   // un archivo de cientos de MB puede tardar en subir
      onUploadProgress: ev => setSubida({ mes: m, pct: ev.total ? Math.round(ev.loaded / ev.total * 100) : 0 }),
    }).then(r => {
      toast.success(`${r.data.nombre}: archivo recibido (${r.data.mb} MB). Se está procesando; puede seguir trabajando.`, { duration: 7000 })
      refrescar()
    }).catch(err => toast.error(errorApi(err, 'No se pudo cargar el archivo')))
      .finally(() => { setCargando(null); setSubida(null); entrada.value = '' })
  }
  const recalcularVehiculos = async () => {
    const id = toast.loading('Recalculando la comparación con las nuevas equivalencias…')
    try { await api.post(`${BASE}/recalcular`, {}, LARGO); toast.success('Comparación recalculada', { id }); refrescar() }
    catch (e) { toast.error(errorApi(e), { id }) }
  }
  const reprocesarMes = async (m: Mes) => {
    try { await api.post(`${BASE}/sicetac/${anio}/${m.mes}/reprocesar`); toast.success(`${m.nombre}: se vuelve a procesar el archivo ya subido`); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }
  const borrarMes = async (m: Mes) => {
    if (!window.confirm(`¿Quitar el SICETAC de ${m.nombre} ${anio}? Su comparación sale del tablero.`)) return
    try { await api.delete(`${BASE}/sicetac/${anio}/${m.mes}`); toast.success(`${m.nombre} quitado`); setF(x => ({ ...x, periodos: [] })); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }

  const e = estado.data
  const k = t?.kpis
  const opc = t?.opciones
  const hayFiltros = f.clientes.length + f.origenes.length + f.destinos.length + f.servicios.length + f.categorias.length
    + f.dptosOrigen.length + f.dptosDestino.length + f.tiposTarifa.length > 0 || !!f.posicion
  const porCliente = (t?.por_cliente ?? []).filter(c => c.variacion != null)
  const comparadas = useOrden(t?.detalle ?? SIN_FILAS, COLS_COMPARADAS)
  const sinRef = useOrden(t?.sin_referencia ?? SIN_FILAS, COLS_SIN_REF)
  const noComp = useOrden(t?.no_comparables ?? SIN_NC, COLS_NO_COMP)
  const filasDetalle = comparadas.filas
  useEffect(() => setPagina(0), [comparadas.orden])

  return (
    <Layout title="TarifaX — Comparativo SICETAC">
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<CompareArrows sx={{ fontSize: 28 }} />} titulo="Comparativo SICETAC vs tarifa del cliente" color={COLOR}
          subtitulo="Cada ruta negociada frente al costo SICETAC del mismo vehículo, mes a mes" />

        {/* ── Cargue de datos ── */}
        <Accordion expanded={cargueAbierto ?? (!!e && !e.negociaciones.total)} onChange={(_, v) => setCargueAbierto(v)} disableGutters variant="outlined" sx={{ borderRadius: 2, mb: 2, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <CloudUpload sx={{ color: COLOR }} />
              <Typography fontWeight={700}>Cargue de datos</Typography>
              <Chip size="small" label={e?.negociaciones.total ? `${num(e.negociaciones.total)} tarifas de ${e.negociaciones.clientes} clientes` : 'Sin negociaciones'}
                color={e?.negociaciones.total ? 'success' : 'warning'} variant="outlined" />
              <Chip size="small" variant="outlined" label={`SICETAC ${anio}: ${(e?.meses ?? []).filter(m => m.cargado).length} de 12 meses`} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <input ref={archivoNeg} type="file" hidden accept=".xlsx,.xls,.csv" onChange={onNegociaciones} />
            <input ref={archivoMes} type="file" hidden accept=".xlsx,.xls,.csv" onChange={onMes} />
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }}>
                <Box flex={1}>
                  <Typography fontWeight={700}>Tarifas negociadas con los clientes</Typography>
                  <Typography fontSize={13} color="text.secondary">
                    {e?.negociaciones.total
                      ? `${e.negociaciones.archivo} · ${num(e.negociaciones.comparables)} de ${num(e.negociaciones.total)} son por tipo de vehículo y se comparan con SICETAC · cargado ${fecha(e.negociaciones.cargado_en)}`
                      : 'Columnas: CLIENTE, TIPO DE SERVICIO, ORIGEN, DEPARTAMENTO ORIGEN, DESTINO, DEPARTAMENTO DESTINO, TIPO DE TARIFA, TARIFA. Cargar un archivo reemplaza el anterior.'}
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<CloudUpload />} disabled={!!cargando} onClick={() => archivoNeg.current?.click()} sx={{ bgcolor: COLOR }}>
                  {e?.negociaciones.total ? 'Reemplazar negociaciones' : 'Cargar negociaciones'}
                </Button>
              </Stack>
              {cargando === 'neg' && <LinearProgress sx={{ mt: 1.5 }} />}
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }} mb={1.25}>
                <Box flex={1}>
                  <Typography fontWeight={700}><DirectionsCar sx={{ fontSize: 18, verticalAlign: 'text-bottom', mr: 0.5, color: COLOR }} />Equivalencias de vehículos</Typography>
                  <Typography fontSize={13} color="text.secondary">
                    Cómo se traduce cada vehículo de las tarifas de los clientes a la configuración SICETAC. Es la misma configuración del motor de tarifas: cambiarla aquí la cambia allá.
                  </Typography>
                </Box>
                <Button variant="outlined" startIcon={<DirectionsCar />} onClick={() => setVehiculosAbierto(true)}>Editar equivalencias</Button>
              </Stack>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {(e?.vehiculos ?? []).map(v => (
                  <Tooltip key={v.categoria} title={v.tipo_sicetac
                    ? (v.por === 'SINONIMO' ? `Se toma la equivalencia de ${v.sinonimo_de}: agregue ${v.categoria} si debe ser otra` : 'Equivalencia configurada')
                    : 'Sin equivalencia: estas tarifas no se pueden comparar'}>
                    <Chip size="small" variant="outlined" color={v.tipo_sicetac ? 'default' : 'warning'}
                      icon={v.tipo_sicetac ? undefined : <WarningAmber />}
                      label={`${v.categoria} → ${v.tipo_sicetac ? v.tipo_sicetac.split(' ')[0] : 'sin equivalencia'} · ${num(v.tarifas)} tarifas${v.por === 'SINONIMO' ? ` (como ${v.sinonimo_de})` : ''}`} />
                  </Tooltip>
                ))}
                {!e?.vehiculos?.length && <Typography fontSize={12} color="text.secondary">Cargue las negociaciones para ver sus vehículos.</Typography>}
              </Stack>
            </Paper>
            <ResumenFlota config={flotaCfg.data} onEditar={() => setFlotaAbierto(true)} />
            <Stack direction="row" alignItems="center" gap={1.5} mb={1.5}>
              <Typography fontWeight={700}>SICETAC por mes</Typography>
              <TextField select size="small" label="Año" value={anio} onChange={ev => setAnio(Number(ev.target.value))} sx={{ width: 110 }}>
                {Array.from(new Set([...(e?.anios ?? []), anio - 1, anio, anio + 1])).sort().map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </TextField>
              <Typography fontSize={12} color="text.secondary" flex={1}>
                El archivo del SICETAC oficial de cada mes, tal como se descarga: se toman la vía estándar y el vehículo cargado.
                Hasta 1 GB; puede venir en varias hojas. Los archivos se procesan de a uno (un Excel de 1,3 millones de filas tarda unos 5 minutos; el CSV, bastante menos).
              </Typography>
            </Stack>
            <Grid container spacing={1.5}>
              {(e?.meses ?? []).map(m => (
                <Grid key={m.periodo} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%', borderColor: m.cargado ? 'success.light' : undefined }}>
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      {m.cargado ? <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} /> : <RadioButtonUnchecked sx={{ fontSize: 18, color: 'text.disabled' }} />}
                      <Typography fontWeight={700} flex={1}>{m.nombre}</Typography>
                      {m.cargado && <Tooltip title={`Quitar ${m.nombre}`}><IconButton size="small" aria-label={`Quitar ${m.nombre}`} onClick={() => borrarMes(m)}><Delete fontSize="small" /></IconButton></Tooltip>}
                    </Stack>
                    <Typography fontSize={11} color={m.estado === 'ERROR' || m.estado === 'INTERRUMPIDO' ? 'error.main' : 'text.secondary'} sx={{ minHeight: 30 }}
                      title={m.mensaje ?? ''}>
                      {subida?.mes === m.mes ? `Subiendo… ${subida.pct} %`
                        : enCurso(m) ? textoProceso(m)
                        : m.estado === 'ERROR' ? `Error: ${(m.mensaje ?? '').slice(0, 70)}${(m.mensaje ?? '').length > 70 ? '…' : ''}`
                        : m.estado === 'INTERRUMPIDO' ? 'Se interrumpió el procesamiento (se reinició el servidor)'
                        : m.cargado ? `${num(m.rutas)} rutas · ${fecha(m.cargado_en)}` : 'Sin cargar'}
                    </Typography>
                    {m.reprocesable && !enCurso(m) && <Button fullWidth size="small" variant="outlined" disabled={!!cargando}
                      aria-label={`Reprocesar SICETAC de ${m.nombre}`} onClick={() => reprocesarMes(m)} sx={{ mb: 0.5 }}>
                      Reprocesar
                    </Button>}
                    <Button fullWidth size="small" variant={m.cargado || m.reprocesable ? 'text' : 'outlined'} disabled={!!cargando || enCurso(m)}
                      aria-label={`Cargar SICETAC de ${m.nombre}`}
                      onClick={() => { mesElegido.current = m.mes; archivoMes.current?.click() }}>
                      {cargando === `m${m.mes}` ? 'Subiendo…' : m.estado === 'EN_COLA' ? 'En cola…' : m.estado === 'PROCESANDO' ? 'Procesando…'
                        : m.reprocesable ? 'Subir otro archivo'
                        : m.estado === 'ERROR' || m.estado === 'INTERRUMPIDO' ? 'Reintentar' : m.cargado ? 'Reemplazar' : 'Cargar'}
                    </Button>
                    {subida?.mes === m.mes && <LinearProgress variant="determinate" value={subida.pct} sx={{ mt: 0.5 }} />}
                    {subida?.mes !== m.mes && m.estado === 'PROCESANDO' && (m.filas_totales && m.filas_leidas && m.filas_leidas < m.filas_totales
                      ? <LinearProgress variant="determinate" value={Math.floor(m.filas_leidas / m.filas_totales * 100)} sx={{ mt: 0.5 }} />
                      : <LinearProgress sx={{ mt: 0.5 }} />)}
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {e?.vigente && <Typography fontSize={12} color="text.secondary" mt={1.5}>
              Mientras no cargue meses, el tablero compara contra el «Tarifario TarifaX vigente», el mismo que usa el motor de tarifas.
            </Typography>}
          </AccordionDetails>
        </Accordion>

        {!e?.negociaciones.total && !estado.isLoading && (
          <Alert severity="info">Cargue primero el archivo de tarifas negociadas con los clientes para ver la comparación.</Alert>
        )}

        {/* ── Filtros: una fila sobre las gráficas ── */}
        {!!opc?.periodos.length && <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}>
          <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
            <Multiple etiqueta="Mes SICETAC" vacio="El más reciente" opciones={opc.periodos.map(p => p.periodo)} nombres={nombresPer} valor={f.periodos} onChange={v => setF(x => ({ ...x, periodos: v }))} />
            <Multiple etiqueta="Cliente" opciones={opc.clientes} valor={f.clientes} onChange={v => setF(x => ({ ...x, clientes: v }))} />
            <Multiple etiqueta="Origen" opciones={opc.origenes} valor={f.origenes} onChange={v => setF(x => ({ ...x, origenes: v }))} />
            <Multiple etiqueta="Destino" opciones={opc.destinos} valor={f.destinos} onChange={v => setF(x => ({ ...x, destinos: v }))} />
            <Multiple etiqueta="Tipo de servicio" opciones={opc.servicios} valor={f.servicios} onChange={v => setF(x => ({ ...x, servicios: v }))} />
            <Multiple etiqueta="Tipo de tarifa" opciones={opc.tipos_tarifa ?? []} valor={f.tiposTarifa} onChange={v => setF(x => ({ ...x, tiposTarifa: v }))} />
            <Multiple etiqueta="Tipo de vehículo" opciones={opc.categorias} valor={f.categorias} onChange={v => setF(x => ({ ...x, categorias: v }))} />
            <Multiple etiqueta="Depto. origen" opciones={opc.dptos_origen ?? []} valor={f.dptosOrigen} onChange={v => setF(x => ({ ...x, dptosOrigen: v }))} />
            <Multiple etiqueta="Depto. destino" opciones={opc.dptos_destino ?? []} valor={f.dptosDestino} onChange={v => setF(x => ({ ...x, dptosDestino: v }))} />
            <TextField select size="small" label="Frente a SICETAC" value={f.posicion} sx={{ minWidth: 170 }}
              onChange={ev => setF(x => ({ ...x, posicion: ev.target.value as Filtros['posicion'] }))}>
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="ENCIMA">Por encima de SICETAC</MenuItem>
              <MenuItem value="DEBAJO">Por debajo de SICETAC</MenuItem>
            </TextField>
            <TextField select size="small" label="Carrocería SICETAC" value={f.carroceria} sx={{ minWidth: 170 }}
              onChange={ev => setF(x => ({ ...x, carroceria: ev.target.value }))}>
              {(opc.carrocerias.length ? opc.carrocerias : ['FURGON']).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            {!!opc.tipos_carga?.length && <TextField select size="small" label="Tipo de carga SICETAC" value={opc.tipos_carga.includes(f.tipoCarga) ? f.tipoCarga : ''} sx={{ minWidth: 170 }}
              onChange={ev => setF(x => ({ ...x, tipoCarga: ev.target.value }))}>
              {opc.tipos_carga.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>}
            <TextField size="small" type="number" label="Horas logísticas" value={horas ?? ''} sx={{ width: 170 }}
              placeholder="Las del SICETAC" InputLabelProps={{ shrink: true }}
              inputProps={{ min: 0, max: 240, step: 0.5, 'aria-label': 'Horas logísticas' }}
              helperText={horas == null ? 'Vacío: las del SICETAC' : 'Reemplazan las del SICETAC'}
              onChange={ev => setHoras(ev.target.value === '' ? null : Math.min(240, Math.max(0, Number(ev.target.value) || 0)))} />
            <Button size="small" startIcon={<AccessTime />} onClick={() => setHorasAbierto(true)}>Valor de la hora</Button>
            {hayFiltros && <Button size="small" startIcon={<FilterAltOff />} onClick={() => setF(x => ({ ...VACIO, periodos: x.periodos, carroceria: x.carroceria, tipoCarga: x.tipoCarga }))}>Quitar filtros</Button>}
          </Stack>
          {!!k?.horas_sin_valor && <Alert severity="warning" sx={{ mt: 1 }} action={<Button size="small" onClick={() => setHorasAbierto(true)}>Definir valor</Button>}>
            {num(k.horas_sin_valor)} tarifas no tienen valor de hora logística: ni su archivo SICETAC lo trae ni está definido para su vehículo, así que se comparan sin horas.
            Los meses cargados antes del 20 de octubre de 2026 tampoco lo traen: vuelva a cargarlos.
          </Alert>}
          {!f.periodos.length && <Typography fontSize={12} color="text.secondary" mt={1}>
            Sin mes elegido, cada ruta se compara con el SICETAC más reciente que la publica (el mes aparece en el detalle). Elija un mes para comparar contra ese mes.
          </Typography>}
          {f.periodos.length > 1 && <Typography fontSize={12} color="text.secondary" mt={1}>
            Con varios meses, cada tarifa cuenta una vez por mes: compare la evolución en la gráfica por mes.
          </Typography>}
        </Paper>}
        {tablero.isFetching && <LinearProgress sx={{ mb: 1 }} />}
        {!k && !!t?.no_comparables_total && (
          <Alert severity="info" sx={{ mb: 2 }} action={<Button size="small" onClick={() => setTab(2)}>Verlas</Button>}>
            Las {num(t.no_comparables_total)} tarifas de este filtro no son por viaje (por kilo, por caja o por volumen, como el paqueteo):
            SICETAC da el costo de un viaje, así que no tienen contra qué compararse. Están en la pestaña «No comparables con SICETAC».
          </Alert>
        )}

        {k && <>
          {/* ── Indicadores ── */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Indicador titulo="Variación vs SICETAC" valor={pct(k.variacion)} marca={k.variacion != null && k.variacion < 0 ? DEBAJO : ENCIMA}
                sub={`${millones(k.tarifa_total)} cobrado frente a ${millones(k.sicetac_total)} SICETAC${k.horas_prom ? ` (incluye ${num(k.horas_prom)} h logísticas)` : ''} · mediana ${pct(k.mediana)}`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Indicador titulo="Tarifas comparadas" valor={num(k.tarifas)} sub={`${k.clientes} clientes · ${num(k.rutas)} rutas`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Indicador titulo="Por debajo de SICETAC" valor={num(k.por_debajo)} marca={DEBAJO} sub={`${pct(k.por_debajo_pct, false)} de las tarifas comparadas`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Indicador titulo="Cobertura SICETAC" valor={pct(k.cobertura_pct, false)} sub={`${num(k.sin_referencia)} rutas sin referencia en SICETAC`} />
            </Grid>
          </Grid>

          {/* ── Cascada por mes ── */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography fontWeight={700}>Cascada por mes: SICETAC frente a tarifa del cliente</Typography>
            <Typography fontSize={12} color="text.secondary" mb={1.5}>
              Promedios por viaje de las tarifas filtradas{k.horas_prom ? `, con ${num(k.horas_prom)} horas logísticas${horas == null ? ' (las del SICETAC)' : ''}` : ''}. La barra de variación es la diferencia entre ambos promedios.
            </Typography>
            <CascadaSicetac meses={t?.por_mes ?? []} horas={k.horas_prom ?? 0} />
          </Paper>

          {/* ── Gráficas ── */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Typography fontWeight={700}>Variación por mes</Typography>
                <Typography fontSize={12} color="text.secondary" mb={1}>Total cobrado frente a total SICETAC de los meses elegidos</Typography>
                {(t?.por_mes.length ?? 0) < 2
                  ? <Box sx={{ py: 5, textAlign: 'center' }}>
                      <Typography fontSize={34} fontWeight={800}>{pct(t?.por_mes[0]?.variacion)}</Typography>
                      <Typography fontSize={12} color="text.secondary">{t?.por_mes[0]?.nombre} · elija o cargue más meses para ver la evolución</Typography>
                    </Box>
                  : <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={t!.por_mes} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={GRILLA} vertical={false} />
                        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRILLA }} />
                        <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                        <ReferenceLine y={0} stroke="#8a8984" />
                        <RTooltip formatter={(v: number) => [pct(v), 'Variación']} labelStyle={{ fontWeight: 700 }} />
                        <Line type="monotone" dataKey="variacion" stroke={ENCIMA} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Stack direction="row" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <Typography fontWeight={700}>Variación por cliente</Typography>
                    <Typography fontSize={12} color="text.secondary">Clic en una barra para filtrar el cliente</Typography>
                  </Box>
                  <Stack direction="row" gap={1.5}>
                    {[[ENCIMA, 'Por encima de SICETAC'], [DEBAJO, 'Por debajo']].map(([c, l]) => (
                      <Stack key={l} direction="row" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: c }} /><Typography fontSize={11} color="text.secondary">{l}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
                <ResponsiveContainer width="100%" height={Math.max(220, porCliente.length * 30 + 30)}>
                  <BarChart data={porCliente} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 0 }} barCategoryGap={4}>
                    <CartesianGrid stroke={GRILLA} horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="cliente" width={230} tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={(v: string) => v.length > 34 ? `${v.slice(0, 33)}…` : v} />
                    <ReferenceLine x={0} stroke="#8a8984" />
                    <RTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      formatter={(v: number, _n, p: any) => [`${pct(v)} · ${p.payload.tarifas} tarifas · ${p.payload.por_debajo} por debajo`, 'Variación']} />
                    <Bar dataKey="variacion" radius={4} maxBarSize={18} style={{ cursor: 'pointer' }}
                      onClick={(d: any) => setF(x => ({ ...x, clientes: [d.cliente] }))}>
                      {porCliente.map(c => <Cell key={c.cliente} fill={(c.variacion ?? 0) < 0 ? DEBAJO : ENCIMA} />)}
                      <LabelList dataKey="variacion" position="right" formatter={(v: number) => pct(v)} style={{ fontSize: 11, fill: '#52514e' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>}

        {/* ── Detalle ── */}
        {(k || (t?.sin_referencia_total ?? 0) > 0 || (t?.no_comparables_total ?? 0) > 0 || !!t?.flota) && <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 1 }} gap={1}>
            <Tabs ref={barraTabs} value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ flex: 1, minWidth: 0 }}>
              <Tab label={`Rutas comparadas (${num(t?.detalle_total ?? filasDetalle.length)})`} />
              <Tab label={`Sin referencia SICETAC (${num(t?.sin_referencia_total)})`} />
              <Tab label={`No comparables con SICETAC (${num(t?.no_comparables_total)})`} />
              <Tab label={`Costo flota propia${t?.flota?.configurado ? ` (${num(t.flota.total)})` : ''}`} />
            </Tabs>
            <Button size="small" startIcon={<EditLocationAlt />} onClick={() => setAliasAbierto(true)}>Equivalencias de ciudades</Button>
            <Button size="small" startIcon={<FileDownload />} onClick={() => tab === 3 ? exportar('costo-flota-propia', filasExcelFlota(t?.flota)) : tab === 2 ? exportar('no-comparables-sicetac', (t?.no_comparables ?? []).map(r => ({
                Cliente: r.cliente, 'Tipo de servicio': r.servicio, 'Tipo de tarifa': r.tipo_tarifa, Origen: r.origen, Destino: r.destino,
                Tarifa: r.tarifa, Motivo: r.motivo,
              }))) : exportar(tab === 0 ? 'comparativo-sicetac' : 'sin-referencia-sicetac',
              (tab === 0 ? filasDetalle : t?.sin_referencia ?? []).map(r => ({
                Mes: nombresPer[r.periodo] ?? r.periodo, 'Fecha SICETAC': r.fecha_sicetac, Cliente: r.cliente, 'Tipo de servicio': r.servicio, Origen: r.origen, Destino: r.destino,
                'Tipo de tarifa': r.tipo_tarifa, 'Tipo de vehículo': r.categoria, 'Configuración SICETAC': r.tipo_vehiculo, Carrocería: r.carroceria, 'Distancia (km)': r.distancia,
                'Depto. origen': r.dpto_origen, 'Depto. destino': r.dpto_destino,
                'Tipo de carga SICETAC': r.tipo_carga, 'Tarifa cliente': r.tarifa, 'SICETAC sin horas': r.sicetac_base,
                'Horas logísticas': r.horas_usadas, 'Valor horas logísticas': r.horas_valor,
                'SICETAC total': r.sicetac, Diferencia: r.diferencia, 'Variación %': r.variacion,
                ...(tab === 1 ? { Motivo: r.estado === 'SIN_VEHICULO' ? 'Vehículo sin equivalencia SICETAC' : 'Ruta no publicada en SICETAC' } : {}),
              })))}>Excel</Button>
          </Stack>
          {tab === 3 ? <TablaFlota flota={t?.flota} onConfigurar={() => setFlotaAbierto(true)} /> : tab === 2 ? <>
            <Alert severity="info" sx={{ m: 2 }}>
              SICETAC es el costo de referencia de un viaje completo por vehículo. Estas tarifas se cobran por kilo, por caja o por volumen
              (o vienen en cero), así que no tienen contra qué compararse. Se listan para que el filtro por tipo de tarifa y de servicio
              separe el paqueteo de lo masivo.
            </Alert>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ '& td, & th': { px: 1 } }}>
                <TableHead><TableRow><EncabezadosOrden columnas={COLS_NO_COMP} orden={noComp.orden} ordenar={noComp.ordenar} /></TableRow></TableHead>
                <TableBody>
                  {noComp.filas.slice(0, 300).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 12, maxWidth: 200 }}><Typography fontSize={12} noWrap title={r.cliente}>{r.cliente}</Typography></TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.servicio}</TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.tipo_tarifa}</TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.origen} → {r.destino}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(r.tarifa)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.motivo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {(t?.no_comparables_total ?? 0) > 300 && <Typography fontSize={12} color="text.secondary" sx={{ px: 2, py: 1.5 }}>
              Se muestran 300 de {num(t?.no_comparables_total)}; el Excel trae hasta 500. Filtre para acotar.
            </Typography>}
          </> : tab === 0 ? <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ '& td, & th': { px: 1 } }}>
                <TableHead><TableRow><EncabezadosOrden columnas={COLS_COMPARADAS} orden={comparadas.orden} ordenar={comparadas.ordenar} /></TableRow></TableHead>
                <TableBody>
                  {filasDetalle.slice(pagina * 25, pagina * 25 + 25).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{nombresPer[r.periodo] ?? r.periodo}
                        {r.fecha_sicetac && <Typography fontSize={11} color="text.secondary">SICETAC {r.fecha_sicetac}</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 170 }}>
                        <Typography fontSize={12} noWrap title={r.cliente}>{r.cliente}</Typography>
                        <Typography fontSize={11} color="text.secondary" noWrap>{r.servicio}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.origen} → {r.destino}</TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }} title={r.tipo_tarifa ?? ''}>{r.categoria}
                        <Typography fontSize={11} color="text.secondary" noWrap title={r.tipo_vehiculo ?? ''}>SICETAC {(r.tipo_vehiculo ?? '').split(' ')[0]}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12 }}>{num(r.distancia)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(r.tarifa)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(r.sicetac)}
                        {!!r.horas_valor && <Typography fontSize={11} color="text.secondary">incluye {num(r.horas_usadas)} h: {pesos(r.horas_valor)}</Typography>}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(r.diferencia)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Variacion v={r.variacion} /></TableCell>
                    </TableRow>
                  ))}
                  {!filasDetalle.length && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>Ninguna ruta con referencia SICETAC para estos filtros.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Box>
            <TablePagination component="div" count={filasDetalle.length} page={pagina} onPageChange={(_, p) => setPagina(p)}
              rowsPerPage={25} rowsPerPageOptions={[25]} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
            {(t?.detalle_total ?? 0) > filasDetalle.length && <Typography fontSize={12} color="text.secondary" sx={{ px: 2, pb: 1.5 }}>
              Se muestran las {num(filasDetalle.length)} de mayor diferencia negativa primero; filtre para acotar.
            </Typography>}
          </> : <>
            <Alert severity="info" sx={{ m: 2 }}>
              Estas tarifas no se pudieron comparar: SICETAC no publica la ruta para ese vehículo (trayectos urbanos o pares que el tarifario no trae),
              o la ciudad está escrita distinto. Si es lo segundo, agréguela en <b>Equivalencias de ciudades</b>.
            </Alert>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><EncabezadosOrden columnas={COLS_SIN_REF} orden={sinRef.orden} ordenar={sinRef.ordenar} /></TableRow></TableHead>
                <TableBody>
                  {sinRef.filas.slice(0, 300).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 12 }}>{r.cliente}</TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.origen} → {r.destino}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.categoria}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(r.tarifa)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{motivoSinRef(r)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>}
        </Paper>}
      </Box>
      <DialogoAlias abierto={aliasAbierto} onCerrar={() => setAliasAbierto(false)} onGuardado={refrescar} />
      <DialogoFlota abierto={flotaAbierto} onCerrar={() => setFlotaAbierto(false)} color={COLOR}
        onGuardado={() => { qc.invalidateQueries({ queryKey: ['tx-comp-flota'] }); qc.invalidateQueries({ queryKey: ['tx-comp-tablero'] }) }} />
      <DialogoHoras abierto={horasAbierto} onCerrar={() => setHorasAbierto(false)} onGuardado={refrescar} />
      <ConfigVehiculos open={vehiculosAbierto} onClose={() => setVehiculosAbierto(false)} onGuardado={recalcularVehiculos}
        nota={<Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
          Los vehículos de las tarifas de clientes son: {(e?.vehiculos ?? []).map(v => v.categoria).join(', ') || '—'}. Al guardar se recalcula toda la comparación.
        </Alert>} />
    </Layout>
  )
}

function DialogoAlias({ abierto, onCerrar, onGuardado }: { abierto: boolean; onCerrar: () => void; onGuardado: () => void }) {
  const [filas, setFilas] = useState<[string, string][]>([])
  const [guardando, setGuardando] = useState(false)
  useEffect(() => {
    if (abierto) api.get(`${BASE}/alias`).then(r => setFilas(Object.entries(r.data) as [string, string][]))
  }, [abierto])
  const guardar = async () => {
    setGuardando(true)
    try {
      const r = await api.put(`${BASE}/alias`, { alias: Object.fromEntries(filas.filter(([a, b]) => a.trim() && b.trim())) }, LARGO).then(x => x.data)
      toast.success(`${r.alias} equivalencias guardadas · comparación recalculada`)
      onGuardado(); onCerrar()
    } catch (e) { toast.error(errorApi(e)) } finally { setGuardando(false) }
  }
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle>Equivalencias de ciudades</DialogTitle>
      <DialogContent>
        <Typography fontSize={13} color="text.secondary" mb={2}>
          Cómo escribe la ciudad el consolidado de clientes y cómo la publica SICETAC (por ejemplo, BOGOTA → BOGOTA, D.C.). Al guardar se recalcula toda la comparación.
        </Typography>
        {filas.map(([a, b], i) => (
          <Stack key={i} direction="row" gap={1} mb={1} alignItems="center">
            <TextField size="small" label="En el consolidado" value={a} sx={{ flex: 1 }} onChange={ev => setFilas(fs => fs.map((x, j) => j === i ? [ev.target.value, x[1]] : x))} />
            <Typography color="text.secondary">→</Typography>
            <TextField size="small" label="En SICETAC" value={b} sx={{ flex: 1 }} onChange={ev => setFilas(fs => fs.map((x, j) => j === i ? [x[0], ev.target.value] : x))} />
            <IconButton aria-label="Quitar equivalencia" onClick={() => setFilas(fs => fs.filter((_, j) => j !== i))}><Delete fontSize="small" /></IconButton>
          </Stack>
        ))}
        <Button size="small" onClick={() => setFilas(fs => [...fs, ['', '']])}>Agregar equivalencia</Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar}>Cancelar</Button>
        <Button variant="contained" disabled={guardando} startIcon={<Refresh />} onClick={guardar} sx={{ bgcolor: COLOR }}>Guardar y recalcular</Button>
      </DialogActions>
    </Dialog>
  )
}


function DialogoHoras({ abierto, onCerrar, onGuardado }: { abierto: boolean; onCerrar: () => void; onGuardado: () => void }) {
  const [tipos, setTipos] = useState<string[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [conArchivo, setConArchivo] = useState<{ periodo: string; nombre: string }[]>([])
  useEffect(() => {
    if (abierto) api.get(`${BASE}/horas-logisticas`).then(r => {
      setTipos(r.data.tipos)
      setValores(Object.fromEntries(Object.entries(r.data.valores).map(([k, v]) => [k, String(v)])))
      setConArchivo(r.data.periodos_con_valor_en_archivo)
    })
  }, [abierto])
  const guardar = async () => {
    try {
      await api.put(`${BASE}/horas-logisticas`, { valores: Object.fromEntries(Object.entries(valores).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])) })
      toast.success('Valor de la hora logística guardado')
      onGuardado(); onCerrar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle>Valor de una hora logística por vehículo</DialogTitle>
      <DialogContent>
        <Typography fontSize={13} color="text.secondary" mb={2}>
          Cuánto vale una hora logística (espera en cargue y descargue) para cada configuración SICETAC. Las horas que se suman las elige en el tablero.
          Si el archivo SICETAC de un mes trae su propio valor por hora, se usa ese y no esta tabla.
        </Typography>
        {!!conArchivo.length && <Alert severity="info" sx={{ mb: 2 }}>Traen su propio valor por hora: {conArchivo.map(p => p.nombre).join(', ')}.</Alert>}
        {tipos.map(t => (
          <TextField key={t} fullWidth size="small" type="number" sx={{ mb: 1.5 }} label={`Configuración ${t}`}
            value={valores[t] ?? ''} inputProps={{ min: 0, step: 1000 }} InputProps={{ startAdornment: <Typography color="text.secondary" mr={1}>$</Typography> }}
            onChange={ev => setValores(v => ({ ...v, [t]: ev.target.value }))} />
        ))}
        {!tipos.length && <Typography color="text.secondary">Cargue primero las negociaciones para ver las configuraciones.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} sx={{ bgcolor: COLOR }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}
