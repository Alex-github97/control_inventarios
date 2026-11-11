/**
 * Proyección de kilometraje de llantas y plan de recambio.
 *
 *   Proyección = km recorridos + km/mm × mm útiles que le quedan
 *
 *  - ConfigProyeccion: los mm útiles (general y por dimensión) y la ventana del
 *    km diario, en Configuración.
 *  - PlanRecambio: cuántas llantas se cambian por mes, por tipo de eje
 *    (direccional, tracción, libre) y por dimensión; de TittanWare o de lo
 *    inspeccionado con TittanLite.
 *  - ProyeccionLlanta: la proyección de una llanta, para su historial.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell,
  TableHead, TablePagination, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add, DeleteForever, Download, EventRepeat } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { apiClient as api } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'

const B = '/eam/neumaticos/proyeccion'
const EJES = ['Direccional', 'Tracción', 'Libre', 'Sin dato de eje'] as const
// Orden categórico validado (CVD ΔE ≥ 9): azul, naranja, aqua. «Sin dato» va en
// gris y siempre con su rótulo: no es una serie que se compare.
const COLOR_EJE: Record<string, string> = { Direccional: '#2a78d6', 'Tracción': '#eb6834', Libre: '#1baf7a', 'Sin dato de eje': '#a8a29e' }
const SERIE = '#2a78d6'
const GRILLA = '#ECEAE4'
const TINTA2 = '#6b6a63'
const n = (x: number | null | undefined) => x == null ? '—' : Math.round(x).toLocaleString('es-CO')
const nombreMes = (m: string) => {
  if (m === 'Vencidas') return 'Vencidas'
  const t = new Date(`${m}-01T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

interface Proy {
  neumatico_id: number | null; codigo: string; placa: string | null; posicion: string | null; tipo_uso: string
  medida: string; marca: string | null; referencia: string | null; vida: string; profundidad_actual: number | null
  mm_utiles: number | null; mm_usados: number | null; mm_restantes: number | null; km_recorridos: number
  km_mm: number | null; fuente_km_mm: string; km_faltantes: number | null; km_proyectado: number | null
  km_diario: number | null; dias_restantes: number | null; fecha_cambio: string | null
}
interface Mes { mes: string; total: number; por_eje: Record<string, number>; por_medida: Record<string, number>; cruce: { eje: string; medida: string; cantidad: number }[] }
interface Plan {
  origen: string; total_llantas: number
  configuracion: { mm_utiles: number | null; por_medida: Record<string, number>; profundidad_minima: number; ventana_km_diario: number }
  plan: { meses: Mes[]; total: number; por_eje: Record<string, number>; por_medida: Record<string, number>
    sin_fecha: Record<string, number>; llantas: number; km_proyectado_promedio: number | null
    urgencia?: { rango: string; cantidad: number }[]; por_vehiculo?: { placa: string; cantidad: number }[]
    por_marca?: { marca: string; cantidad: number }[] }
  llantas: Proy[]
}

const EJE_DE: Record<string, string> = { DIRECCIONAL: 'Direccional', TRACCION: 'Tracción', LIBRE: 'Libre' }

async function descargar(ruta: string, params: Record<string, unknown>, nombre: string) {
  const r = await api.get(ruta, { params, responseType: 'blob', timeout: 600_000 })
  const url = URL.createObjectURL(r.data as Blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/* ── Configuración ─────────────────────────────────────────────────────────── */
export function ConfigProyeccion() {
  const qc = useQueryClient()
  const { data: cfg } = useQuery<any>({ queryKey: ['eam-neu-config'], queryFn: () => api.get('/eam/neumaticos/config').then(r => r.data) })
  const [general, setGeneral] = useState('')
  const [ventana, setVentana] = useState('90')
  const [filas, setFilas] = useState<{ medida: string; mm: string }[]>([])
  useEffect(() => {
    if (!cfg) return
    setGeneral(cfg.mm_utiles != null ? String(cfg.mm_utiles) : '')
    setVentana(String(cfg.ventana_km_diario ?? 90))
    setFilas(Object.entries(cfg.mm_utiles_por_medida ?? {}).map(([medida, mm]) => ({ medida, mm: String(mm) })))
  }, [cfg])
  const guardar = useMutation({
    mutationFn: () => api.put('/eam/neumaticos/config', {
      mm_utiles: general === '' ? null : Number(general),
      ventana_km_diario: Number(ventana) || 90,
      mm_utiles_por_medida: Object.fromEntries(filas.filter(f => f.medida.trim() && Number(f.mm) > 0)
        .map(f => [f.medida.trim().toUpperCase(), Number(f.mm)])),
    }),
    onSuccess: () => { toast.success('Configuración de la proyección guardada'); qc.invalidateQueries({ queryKey: ['eam-neu-config'] }) },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  return (
    <Card sx={{ bgcolor: '#FFFFFF' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
          <EventRepeat sx={{ color: '#2563EB' }} /><Typography fontWeight={700}>Proyección de kilometraje y plan de recambio</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Proyección = km recorridos + km/mm × mm útiles que le quedan. Los mm útiles son los utilizables de la llanta
          nueva hasta su retiro. Sin configurar, se toma la profundidad de diseño de cada llanta menos la mínima
          ({cfg?.profundidad_minima ?? 3} mm).
        </Typography>
        <Grid container spacing={1.5} mb={1.5}>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField size="small" fullWidth type="number" label="mm útiles (general)" value={general}
              onChange={e => setGeneral(e.target.value)} inputProps={{ min: 0, max: 40, step: 'any' }} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField size="small" fullWidth type="number" label="Días para el km diario" value={ventana}
              onChange={e => setVentana(e.target.value)} inputProps={{ min: 7, max: 730 }}
              helperText="Lecturas de odómetro de los últimos N días" />
          </Grid>
        </Grid>
        <Typography fontSize={13} fontWeight={700} mb={0.5}>mm útiles por dimensión (mandan sobre el general)</Typography>
        <Stack spacing={1} mb={1.5}>
          {filas.map((f, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <TextField size="small" label="Dimensión" value={f.medida} sx={{ width: 200 }}
                onChange={e => setFilas(fs => fs.map((x, j) => j === i ? { ...x, medida: e.target.value } : x))} />
              <TextField size="small" type="number" label="mm útiles" value={f.mm} sx={{ width: 130 }}
                onChange={e => setFilas(fs => fs.map((x, j) => j === i ? { ...x, mm: e.target.value } : x))}
                inputProps={{ min: 0, max: 40, step: 'any' }} />
              <IconButton size="small" color="error" aria-label="Quitar dimensión" onClick={() => setFilas(fs => fs.filter((_, j) => j !== i))}>
                <DeleteForever fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Box><Button size="small" startIcon={<Add />} onClick={() => setFilas(fs => [...fs, { medida: '', mm: '' }])}
            sx={{ textTransform: 'none' }}>Agregar dimensión</Button></Box>
        </Stack>
        <Button variant="contained" disabled={guardar.isPending} onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Guardar
        </Button>
      </CardContent>
    </Card>
  )
}

/* ── Proyección de una llanta (historial) ──────────────────────────────────── */
export function ProyeccionLlanta({ neumaticoId }: { neumaticoId: number }) {
  const { data, isLoading } = useQuery<{ proyeccion: Proy | null; motivo?: string }>({
    queryKey: ['eam-neu-proyeccion', neumaticoId],
    queryFn: () => api.get(`${B}/llanta/${neumaticoId}`, { timeout: 120_000 }).then(r => r.data),
  })
  if (isLoading) return <LinearProgress />
  const p = data?.proyeccion
  if (!p) return null
  return (
    <Alert severity={p.dias_restantes != null && p.dias_restantes <= 30 ? 'warning' : 'info'} icon={<EventRepeat />}>
      <Typography variant="body2" fontWeight={800}>
        Proyección: {n(p.km_proyectado)} km
        {p.fecha_cambio && ` · cambio estimado el ${new Date(`${p.fecha_cambio}T12:00:00`).toLocaleDateString('es-CO')}`}
      </Typography>
      <Typography variant="caption" display="block">
        {n(p.km_recorridos)} km recorridos + {p.km_mm != null ? `${p.km_mm.toLocaleString('es-CO')} km/mm` : 'sin km/mm'} × {p.mm_restantes ?? '—'} mm útiles restantes
        ({n(p.km_faltantes)} km). Km/mm {p.fuente_km_mm}. {p.km_diario ? `El vehículo recorre ${p.km_diario.toLocaleString('es-CO')} km/día.` : 'Sin km diario del vehículo.'}
      </Typography>
    </Alert>
  )
}

/* ── Plan de recambio ──────────────────────────────────────────────────────── */
export function PlanRecambio() {
  const [origen, setOrigen] = useState<'TITTANWARE' | 'LITE'>('TITTANWARE')
  const [meses, setMeses] = useState(6)
  const [pagina, setPagina] = useState(0)
  const [bajando, setBajando] = useState(false)
  const params = { origen, meses }
  const { data, isLoading, isFetching, isError } = useQuery<Plan>({
    queryKey: ['eam-plan-recambio', origen, meses],
    queryFn: () => api.get(`${B}/plan`, { params, timeout: 600_000 }).then(r => r.data),
    placeholderData: p => p,
  })
  const dimensiones = useMemo(() => Object.keys(data?.plan.por_medida ?? {}), [data])
  const bajar = async () => {
    setBajando(true)
    try { await descargar(`${B}/plan/excel`, params, `plan-recambio-${origen === 'LITE' ? 'lite-' : ''}${new Date().toISOString().slice(0, 10)}.xlsx`) }
    catch (e: any) { toast.error(mensajeDeError(e)) } finally { setBajando(false) }
  }
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}>
        <ToggleButtonGroup size="small" exclusive value={origen} onChange={(_, v) => { if (v) { setOrigen(v); setPagina(0) } }}>
          <ToggleButton value="TITTANWARE" sx={{ textTransform: 'none', px: 1.5 }}>Llantas de TittanWare</ToggleButton>
          <ToggleButton value="LITE" sx={{ textTransform: 'none', px: 1.5 }}>Inspeccionadas con TittanLite</ToggleButton>
        </ToggleButtonGroup>
        <TextField select size="small" label="Horizonte" value={meses} onChange={e => setMeses(Number(e.target.value))} sx={{ width: 150 }}>
          {[3, 6, 12, 18, 24].map(m => <MenuItem key={m} value={m}>{m} meses</MenuItem>)}
        </TextField>
        <Typography fontSize={12} color="text.secondary" sx={{ flex: 1 }}>
          {origen === 'LITE'
            ? 'Profundidad de la última inspección Lite y km/mm promedio de las llantas de la cuenta en TittanWare.'
            : 'Km/mm de cada llanta (o el histórico de su referencia) y km diario de cada vehículo.'}
        </Typography>
        <Button variant="contained" startIcon={<Download />} disabled={bajando || !data?.total_llantas} onClick={bajar}
          sx={{ textTransform: 'none', fontWeight: 700 }}>{bajando ? 'Generando…' : 'Descargar Excel'}</Button>
      </Stack>
      {(isLoading || isFetching) && <LinearProgress />}
      {isError && <Alert severity="error">No se pudo calcular el plan de recambio.</Alert>}
      {data && data.total_llantas === 0 && (
        <Alert severity="info">{origen === 'LITE' ? 'No hay inspecciones de TittanLite en los últimos 180 días.' : 'No hay llantas montadas.'}</Alert>
      )}
      {data && data.total_llantas > 0 && (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}><Kpi titulo="Llantas a cambiar" valor={n(data.plan.total)} nota={`en ${meses} meses, de ${n(data.total_llantas)} montadas`} /></Grid>
            {(['Direccional', 'Tracción', 'Libre'] as const).map(e => (
              <Grid key={e} size={{ xs: 6, md: 2 }}><Kpi titulo={e} valor={n(data.plan.por_eje[e] ?? 0)} color={COLOR_EJE[e]} /></Grid>
            ))}
            <Grid size={{ xs: 12, md: 3 }}><Kpi titulo="Km proyectado promedio" valor={`${n(data.plan.km_proyectado_promedio)} km`}
              nota={Object.keys(data.plan.sin_fecha).length ? `Sin fecha: ${Object.entries(data.plan.sin_fecha).map(([m, c]) => `${c} ${m}`).join(', ')}` : 'todas con fecha estimada'} /></Grid>
          </Grid>
          <TableroPlan data={data} />
          <Card variant="outlined">
            <CardContent sx={{ pb: 0 }}>
              <Typography fontWeight={700} fontSize={14}>Llantas a cambiar por mes y tipo de eje</Typography>
            </CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Mes</TableCell>
                  {EJES.map(e => <TableCell key={e} align="right" sx={{ fontWeight: 700, color: COLOR_EJE[e] }}>{e}</TableCell>)}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Dimensiones</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {data.plan.meses.map(m => (
                    <TableRow key={m.mes} sx={m.mes === 'Vencidas' ? { bgcolor: '#FEF2F2' } : undefined}>
                      <TableCell sx={{ fontWeight: 700 }}>{nombreMes(m.mes)}</TableCell>
                      {EJES.map(e => <TableCell key={e} align="right">{m.por_eje[e] ? n(m.por_eje[e]) : '—'}</TableCell>)}
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{n(m.total)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {Object.entries(m.por_medida).sort((a, b) => b[1] - a[1]).map(([med, c]) => `${med}: ${n(c)}`).join(' · ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ pb: 0 }}>
              <Typography fontWeight={700} fontSize={14}>Por dimensión y tipo de eje (todo el horizonte)</Typography>
            </CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Dimensión</TableCell>
                  {EJES.map(e => <TableCell key={e} align="right" sx={{ fontWeight: 700, color: COLOR_EJE[e] }}>{e}</TableCell>)}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {dimensiones.map(med => {
                    const cuenta = (e: string) => data.plan.meses.reduce((t, m) => t + (m.cruce.find(x => x.eje === e && x.medida === med)?.cantidad ?? 0), 0)
                    return (
                      <TableRow key={med}>
                        <TableCell sx={{ fontWeight: 700 }}>{med}</TableCell>
                        {EJES.map(e => <TableCell key={e} align="right">{cuenta(e) ? n(cuenta(e)) : '—'}</TableCell>)}
                        <TableCell align="right" sx={{ fontWeight: 800 }}>{n(data.plan.por_medida[med])}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ pb: 0 }}>
              <Typography fontWeight={700} fontSize={14}>Llantas, de la que se acaba primero a la última</Typography>
            </CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>{['Cambio', 'Placa', 'Posición', 'Llanta', 'Eje', 'Dimensión', 'Prof.', 'mm rest.', 'Km/mm', 'Km faltantes', 'Km proyectado', 'Km/día'].map(h =>
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5 }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {data.llantas.slice(pagina * 50, pagina * 50 + 50).map((p, i) => (
                    <TableRow key={`${p.codigo}-${i}`} sx={p.dias_restantes != null && p.dias_restantes <= 0 ? { bgcolor: '#FEF2F2' } : undefined}>
                      <TableCell>{p.fecha_cambio ? new Date(`${p.fecha_cambio}T12:00:00`).toLocaleDateString('es-CO') : '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{p.placa}</TableCell>
                      <TableCell>{p.posicion}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{p.codigo}</TableCell>
                      <TableCell>{EJE_DE[p.tipo_uso] ?? '—'}</TableCell>
                      <TableCell>{p.medida}</TableCell>
                      <TableCell>{p.profundidad_actual ?? '—'}</TableCell>
                      <TableCell>{p.mm_restantes ?? '—'}</TableCell>
                      <TableCell><Tooltip title={p.fuente_km_mm}><span>{p.km_mm != null ? p.km_mm.toLocaleString('es-CO') : '—'}</span></Tooltip></TableCell>
                      <TableCell>{n(p.km_faltantes)}</TableCell>
                      <TableCell>{n(p.km_proyectado)}</TableCell>
                      <TableCell>{p.km_diario ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <TablePagination component="div" count={data.llantas.length} page={pagina} rowsPerPage={50} rowsPerPageOptions={[50]}
              onPageChange={(_, p) => setPagina(p)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
          </Card>
        </>
      )}
    </Stack>
  )
}

/* ── Tablero ───────────────────────────────────────────────────────────────── */
const ejesConDatos = (plan: Plan['plan']) => EJES.filter(e => (plan.por_eje[e] ?? 0) > 0)

function TarjetaGrafico({ titulo, ayuda, alto = 260, children }: { titulo: string; ayuda?: string; alto?: number; children: React.ReactElement }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography fontWeight={700} fontSize={14}>{titulo}</Typography>
        {ayuda && <Typography fontSize={11.5} color="text.secondary" mb={1}>{ayuda}</Typography>}
        <Box sx={{ height: alto }}><ResponsiveContainer>{children}</ResponsiveContainer></Box>
      </CardContent>
    </Card>
  )
}

const ejeX = { tick: { fontSize: 11, fill: TINTA2 }, axisLine: false, tickLine: false }
const tooltipNum = (v: number, nombre: string) => [`${n(v)} llantas`, nombre]

function TableroPlan({ data }: { data: Plan }) {
  const ejes = ejesConDatos(data.plan)
  const porMes = data.plan.meses.map(m => ({ mes: m.mes === 'Vencidas' ? 'Vencidas' : nombreMes(m.mes).replace(' de ', ' '), ...m.por_eje }))
  const dims = Object.keys(data.plan.por_medida).slice(0, 8).map(med => {
    const fila: Record<string, string | number> = { medida: med }
    for (const e of ejes) fila[e] = data.plan.meses.reduce((t, m) => t + (m.cruce.find(x => x.eje === e && x.medida === med)?.cantidad ?? 0), 0)
    return fila
  })
  const urgencia = (data.plan.urgencia ?? []).filter(u => u.cantidad > 0)
  const vehiculos = data.plan.por_vehiculo ?? []
  // El tope redondeado va en el último segmento de cada barra apilada.
  const ultimo = ejes[ejes.length - 1]
  const apilado = (horizontal: boolean) => ejes.map(e => (
    <Bar key={e} dataKey={e} stackId="eje" fill={COLOR_EJE[e]} stroke="#FFFFFF" strokeWidth={2}
      radius={e === ultimo ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0} maxBarSize={horizontal ? 22 : 38} />
  ))
  return (
    <Grid container spacing={2} aria-label="Tablero del plan de recambio">
      <Grid size={{ xs: 12, lg: 8 }}>
        <TarjetaGrafico titulo="Llantas a cambiar por mes" ayuda="Apiladas por tipo de eje. «Vencidas» ya pasaron su fecha estimada.">
          <BarChart data={porMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRILLA} />
            <XAxis dataKey="mes" {...ejeX} interval={0} />
            <YAxis {...ejeX} width={48} allowDecimals={false} tickFormatter={v => n(v)} />
            <RTooltip formatter={tooltipNum} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={v => <span style={{ color: TINTA2 }}>{v}</span>} />
            {apilado(false)}
          </BarChart>
        </TarjetaGrafico>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <TarjetaGrafico titulo="Urgencia" ayuda="Cuántas llantas se acaban en cada plazo, dentro del horizonte.">
          <BarChart data={urgencia} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRILLA} />
            <XAxis type="number" {...ejeX} allowDecimals={false} tickFormatter={v => n(v)} />
            <YAxis type="category" dataKey="rango" {...ejeX} width={104} />
            <RTooltip formatter={(v: number) => [`${n(v)} llantas`, 'Llantas']} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
            <Bar dataKey="cantidad" fill={SERIE} radius={[0, 4, 4, 0]} maxBarSize={22}
              label={{ position: 'right', fontSize: 11, fill: TINTA2, formatter: (v: number) => n(v) }} />
          </BarChart>
        </TarjetaGrafico>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <TarjetaGrafico titulo="Por dimensión y tipo de eje" ayuda="Las 8 dimensiones con más cambios en el horizonte." alto={Math.max(200, dims.length * 34 + 60)}>
          <BarChart data={dims} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRILLA} />
            <XAxis type="number" {...ejeX} allowDecimals={false} tickFormatter={v => n(v)} />
            <YAxis type="category" dataKey="medida" {...ejeX} width={96} />
            <RTooltip formatter={tooltipNum} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={v => <span style={{ color: TINTA2 }}>{v}</span>} />
            {apilado(true)}
          </BarChart>
        </TarjetaGrafico>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <TarjetaGrafico titulo="Vehículos con más llantas por cambiar" ayuda="Los 12 primeros dentro del horizonte." alto={Math.max(200, vehiculos.length * 26 + 40)}>
          <BarChart data={vehiculos} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRILLA} />
            <XAxis type="number" {...ejeX} allowDecimals={false} />
            <YAxis type="category" dataKey="placa" {...ejeX} width={80} />
            <RTooltip formatter={(v: number) => [`${n(v)} llantas`, 'Llantas']} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
            <Bar dataKey="cantidad" fill={SERIE} radius={[0, 4, 4, 0]} maxBarSize={18}
              label={{ position: 'right', fontSize: 11, fill: TINTA2 }} />
          </BarChart>
        </TarjetaGrafico>
      </Grid>
    </Grid>
  )
}

function Kpi({ titulo, valor, nota, color }: { titulo: string; valor: string; nota?: string; color?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography fontSize={11.5} color="text.secondary">{titulo}</Typography>
        <Typography fontSize={22} fontWeight={800} sx={{ color: color ?? 'text.primary', lineHeight: 1.3 }}>{valor}</Typography>
        {nota && <Typography fontSize={11} color="text.secondary">{nota}</Typography>}
      </CardContent>
    </Card>
  )
}
