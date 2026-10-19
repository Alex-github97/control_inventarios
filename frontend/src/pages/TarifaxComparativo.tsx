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
  EditLocationAlt, FilterAltOff, TrendingDown, TrendingUp,
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

interface Mes { periodo: string; mes: number; nombre: string; cargado: boolean; archivo: string | null; rutas: number; cargado_en: string | null; usuario: string | null }
interface Estado {
  negociaciones: { total: number; comparables: number; clientes: number; archivo: string | null; cargado_en: string | null }
  anio: number; anios: number[]; meses: Mes[]; vigente: boolean
}
interface Fila {
  periodo: string; nombre_periodo?: string; cliente: string; servicio: string | null; origen: string; destino: string
  categoria: string | null; tipo_vehiculo: string | null; carroceria: string | null; distancia: number | null
  tarifa: number | null; sicetac: number | null; diferencia: number | null; variacion: number | null; estado: string
}
interface Tablero {
  opciones: { periodos: { periodo: string; nombre: string }[]; clientes: string[]; origenes: string[]; destinos: string[]; servicios: string[]; categorias: string[]; carrocerias: string[] }
  kpis: null | { tarifas: number; clientes: number; rutas: number; variacion: number | null; mediana: number; por_debajo: number; por_debajo_pct: number; tarifa_total: number; sicetac_total: number; sin_referencia: number; cobertura_pct: number }
  por_mes: { periodo: string; nombre: string; tarifas: number; variacion: number | null; tarifa_prom: number; sicetac_prom: number; por_debajo: number }[]
  por_cliente: { cliente: string; tarifas: number; rutas: number; variacion: number | null; por_debajo: number }[]
  por_categoria: { categoria: string; tipo_vehiculo: string; tarifas: number; variacion: number | null }[]
  detalle: Fila[]; detalle_total?: number; sin_referencia: Fila[]; sin_referencia_total: number; carroceria: string
}
type Filtros = { periodos: string[]; clientes: string[]; origenes: string[]; destinos: string[]; servicios: string[]; categorias: string[]; carroceria: string }
const VACIO: Filtros = { periodos: [], clientes: [], origenes: [], destinos: [], servicios: [], categorias: [], carroceria: 'FURGON' }

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

function Multiple({ etiqueta, opciones, valor, onChange, nombres }: {
  etiqueta: string; opciones: string[]; valor: string[]; onChange: (v: string[]) => void; nombres?: Record<string, string>
}) {
  return (
    <Autocomplete multiple size="small" limitTags={1} options={opciones} value={valor} disableCloseOnSelect
      getOptionLabel={o => nombres?.[o] ?? o} onChange={(_, v) => onChange(v)} sx={{ minWidth: 190, flex: 1 }}
      renderInput={p => <TextField {...p} label={etiqueta} placeholder={valor.length ? '' : 'Todos'} />} />
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
  const archivoNeg = useRef<HTMLInputElement>(null)
  const archivoMes = useRef<HTMLInputElement>(null)
  const mesElegido = useRef<number>(1)

  const estado = useQuery<Estado>({ queryKey: ['tx-comp-estado', anio], queryFn: () => api.get(`${BASE}/estado`, { params: { anio } }).then(r => r.data) })
  const params = useMemo(() => ({
    periodos: f.periodos.join('|') || undefined, clientes: f.clientes.join('|') || undefined,
    origenes: f.origenes.join('|') || undefined, destinos: f.destinos.join('|') || undefined,
    servicios: f.servicios.join('|') || undefined, categorias: f.categorias.join('|') || undefined, carroceria: f.carroceria,
  }), [f])
  const tablero = useQuery<Tablero>({ queryKey: ['tx-comp-tablero', params], queryFn: () => api.get(`${BASE}/tablero`, { params }).then(r => r.data) })
  const t = tablero.data
  const nombresPer = useMemo(() => Object.fromEntries((t?.opciones.periodos ?? []).map(p => [p.periodo, p.nombre])), [t])

  // Sin mes elegido se muestra el más reciente: mezclar meses contaría cada tarifa varias veces.
  useEffect(() => {
    const per = t?.opciones.periodos ?? []
    if (!f.periodos.length && per.length) setF(x => ({ ...x, periodos: [per[per.length - 1].periodo] }))
  }, [t?.opciones.periodos])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPagina(0), [params])

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
    if (a) subir(`${BASE}/sicetac/${anio}/${m}`, a, `m${m}`, r => `${r.nombre}: ${num(r.rutas)} rutas SICETAC · ${num(r.tarifas_con_referencia)} tarifas con referencia`)
      .finally(() => { entrada.value = '' })
  }
  const borrarMes = async (m: Mes) => {
    if (!window.confirm(`¿Quitar el SICETAC de ${m.nombre} ${anio}? Su comparación sale del tablero.`)) return
    try { await api.delete(`${BASE}/sicetac/${anio}/${m.mes}`); toast.success(`${m.nombre} quitado`); setF(x => ({ ...x, periodos: [] })); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }

  const e = estado.data
  const k = t?.kpis
  const opc = t?.opciones
  const hayFiltros = f.clientes.length + f.origenes.length + f.destinos.length + f.servicios.length + f.categorias.length > 0
  const porCliente = (t?.por_cliente ?? []).filter(c => c.variacion != null)
  const filasDetalle = t?.detalle ?? []

  return (
    <Layout title="TarifaX — Comparativo SICETAC">
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<CompareArrows sx={{ fontSize: 28 }} />} titulo="Comparativo SICETAC vs tarifa del cliente" color={COLOR}
          subtitulo="Cada ruta negociada frente al costo SICETAC del mismo vehículo, mes a mes" />

        {/* ── Cargue de datos ── */}
        <Accordion defaultExpanded={!e?.negociaciones.total} disableGutters variant="outlined" sx={{ borderRadius: 2, mb: 2, '&:before': { display: 'none' } }}>
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
            <Stack direction="row" alignItems="center" gap={1.5} mb={1.5}>
              <Typography fontWeight={700}>SICETAC por mes</Typography>
              <TextField select size="small" label="Año" value={anio} onChange={ev => setAnio(Number(ev.target.value))} sx={{ width: 110 }}>
                {Array.from(new Set([...(e?.anios ?? []), anio - 1, anio, anio + 1])).sort().map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </TextField>
              <Typography fontSize={12} color="text.secondary" flex={1}>
                El archivo de cada mes debe traer las columnas del tarifario de TarifaX: ORIGEN, DESTINO, TIPO_VEHICULO, TIPO_CARROCERIA, COSTO_TOTAL_VIAJE y DISTANCIA.
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
                    <Typography fontSize={11} color="text.secondary" sx={{ minHeight: 30 }}>
                      {m.cargado ? `${num(m.rutas)} rutas · ${fecha(m.cargado_en)}` : 'Sin cargar'}
                    </Typography>
                    <Button fullWidth size="small" variant={m.cargado ? 'text' : 'outlined'} disabled={!!cargando}
                      aria-label={`Cargar SICETAC de ${m.nombre}`}
                      onClick={() => { mesElegido.current = m.mes; archivoMes.current?.click() }}>
                      {cargando === `m${m.mes}` ? 'Cargando…' : m.cargado ? 'Reemplazar' : 'Cargar'}
                    </Button>
                    {cargando === `m${m.mes}` && <LinearProgress sx={{ mt: 0.5 }} />}
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
            <Multiple etiqueta="Mes" opciones={opc.periodos.map(p => p.periodo)} nombres={nombresPer} valor={f.periodos} onChange={v => setF(x => ({ ...x, periodos: v }))} />
            <Multiple etiqueta="Cliente" opciones={opc.clientes} valor={f.clientes} onChange={v => setF(x => ({ ...x, clientes: v }))} />
            <Multiple etiqueta="Origen" opciones={opc.origenes} valor={f.origenes} onChange={v => setF(x => ({ ...x, origenes: v }))} />
            <Multiple etiqueta="Destino" opciones={opc.destinos} valor={f.destinos} onChange={v => setF(x => ({ ...x, destinos: v }))} />
            <Multiple etiqueta="Servicio" opciones={opc.servicios} valor={f.servicios} onChange={v => setF(x => ({ ...x, servicios: v }))} />
            <Multiple etiqueta="Vehículo" opciones={opc.categorias} valor={f.categorias} onChange={v => setF(x => ({ ...x, categorias: v }))} />
            <TextField select size="small" label="Carrocería SICETAC" value={f.carroceria} sx={{ minWidth: 170 }}
              onChange={ev => setF(x => ({ ...x, carroceria: ev.target.value }))}>
              {(opc.carrocerias.length ? opc.carrocerias : ['FURGON']).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            {hayFiltros && <Button size="small" startIcon={<FilterAltOff />} onClick={() => setF(x => ({ ...VACIO, periodos: x.periodos, carroceria: x.carroceria }))}>Quitar filtros</Button>}
          </Stack>
          {f.periodos.length > 1 && <Typography fontSize={12} color="text.secondary" mt={1}>
            Con varios meses, cada tarifa cuenta una vez por mes: compare la evolución en la gráfica por mes.
          </Typography>}
        </Paper>}
        {tablero.isFetching && <LinearProgress sx={{ mb: 1 }} />}

        {k && <>
          {/* ── Indicadores ── */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Indicador titulo="Variación vs SICETAC" valor={pct(k.variacion)} marca={k.variacion != null && k.variacion < 0 ? DEBAJO : ENCIMA}
                sub={`${millones(k.tarifa_total)} cobrado frente a ${millones(k.sicetac_total)} SICETAC · mediana ${pct(k.mediana)}`} />
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
        {(k || (t?.sin_referencia_total ?? 0) > 0) && <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 1 }} gap={1}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1 }}>
              <Tab label={`Rutas comparadas (${num(t?.detalle_total ?? filasDetalle.length)})`} />
              <Tab label={`Sin referencia SICETAC (${num(t?.sin_referencia_total)})`} />
            </Tabs>
            <Button size="small" startIcon={<EditLocationAlt />} onClick={() => setAliasAbierto(true)}>Equivalencias de ciudades</Button>
            <Button size="small" startIcon={<FileDownload />} onClick={() => exportar(tab === 0 ? 'comparativo-sicetac' : 'sin-referencia-sicetac',
              (tab === 0 ? filasDetalle : t?.sin_referencia ?? []).map(r => ({
                Mes: nombresPer[r.periodo] ?? r.periodo, Cliente: r.cliente, Servicio: r.servicio, Origen: r.origen, Destino: r.destino,
                Vehículo: r.categoria, 'Configuración SICETAC': r.tipo_vehiculo, Carrocería: r.carroceria, 'Distancia (km)': r.distancia,
                'Tarifa cliente': r.tarifa, 'Costo SICETAC': r.sicetac, Diferencia: r.diferencia, 'Variación %': r.variacion,
                ...(tab === 1 ? { Motivo: r.estado === 'SIN_VEHICULO' ? 'Vehículo sin equivalencia SICETAC' : 'Ruta no publicada en SICETAC' } : {}),
              })))}>Excel</Button>
          </Stack>
          {tab === 0 ? <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ '& td, & th': { px: 1 } }}>
                <TableHead><TableRow>
                  {['Mes', 'Cliente', 'Ruta', 'Vehículo', 'Km', 'Tarifa cliente', 'SICETAC', 'Diferencia', 'Variación'].map((h, i) =>
                    <TableCell key={h} align={i >= 4 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {filasDetalle.slice(pagina * 25, pagina * 25 + 25).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{nombresPer[r.periodo] ?? r.periodo}</TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 170 }}>
                        <Typography fontSize={12} noWrap title={r.cliente}>{r.cliente}</Typography>
                        <Typography fontSize={11} color="text.secondary" noWrap>{r.servicio}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.origen} → {r.destino}</TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.categoria}
                        <Typography fontSize={11} color="text.secondary" noWrap title={r.tipo_vehiculo ?? ''}>SICETAC {(r.tipo_vehiculo ?? '').split(' ')[0]}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12 }}>{num(r.distancia)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(r.tarifa)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(r.sicetac)}</TableCell>
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
                <TableHead><TableRow>{['Cliente', 'Ruta', 'Vehículo', 'Tarifa cliente', 'Motivo'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {(t?.sin_referencia ?? []).slice(0, 300).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 12 }}>{r.cliente}</TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.origen} → {r.destino}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.categoria}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{pesos(r.tarifa)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.estado === 'SIN_VEHICULO' ? 'Vehículo sin equivalencia SICETAC' : 'Ruta no publicada en SICETAC'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>}
        </Paper>}
      </Box>
      <DialogoAlias abierto={aliasAbierto} onCerrar={() => setAliasAbierto(false)} onGuardado={refrescar} />
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
