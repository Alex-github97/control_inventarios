/**
 * Combustible — transacciones, rendimiento y metas de km/galón.
 *
 * Antes eran 1.597 líneas sobre datos escritos en el código. Ahora todo sale de
 * `/eam/combustible`.
 *
 * El rendimiento se calcula «tanque a tanque»: solo entre dos tanqueos llenos
 * se sabe cuánto combustible consumió realmente la distancia recorrida. Por eso
 * la pantalla insiste con el interruptor de tanque lleno y explica por qué un
 * tanqueo puede quedar sin rendimiento, en vez de mostrar un guion sin motivo.
 */
import { useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Switch,
  FormControlLabel, Tabs, Tab, Divider, InputAdornment, LinearProgress,
} from '@mui/material'
import {
  Add, Search, LocalGasStation, WarningAmber, DeleteOutline, Speed,
  TrendingDown, Flag, Refresh,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'

const mensaje = (e: any) =>
  e?.response?.data?.detail ?? e?.message ?? 'No se pudo completar la operación'

const pesos = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const numero = (v?: number | null, d = 1) =>
  v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: d })

const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric' }) : '—'

interface Registro {
  id: number; activo_id: number; fecha: string
  tipo_combustible?: string | null
  cantidad: number; unidad: string
  precio_unitario?: number | null; subtotal?: number | null
  iva_pct?: number | null; iva_valor?: number | null; costo_total?: number | null
  odometro?: number | null; km_recorridos?: number | null
  rendimiento?: number | null; tanque_lleno: boolean
  meta_km_gal?: number | null; cumple_meta?: boolean | null
  desviacion_pct?: number | null
  proveedor?: string | null; factura?: string | null
  conductor?: string | null; estacion?: string | null
  placa?: string | null; activo_codigo?: string | null; activo_nombre?: string | null
  marca?: string | null; linea?: string | null
}

interface Meta {
  id: number; tipo_activo?: string | null; marca?: string | null; linea?: string | null
  motor_marca?: string | null; motor_linea?: string | null
  meta_km_gal: number; tolerancia_pct: number
  tipo_combustible?: string | null; nota?: string | null
  activo: boolean; especificidad?: number
}

interface FilaRendimiento {
  etiqueta: string; km: number; galones: number; costo: number
  tanqueos: number; alertas: number
  rendimiento: number | null; meta: number | null
  costo_por_km: number | null; desviacion_pct: number | null
}

interface Reporte {
  periodo_dias: number; tanqueos: number; sin_rendimiento: number
  km_totales: number; galones_totales: number; costo_total: number
  rendimiento_flota: number | null; costo_por_km: number | null
  por_vehiculo: FilaRendimiento[]; por_marca: FilaRendimiento[]
  por_linea: FilaRendimiento[]; por_motor: FilaRendimiento[]
}

interface AlertaFila {
  activo_id: number; placa: string; activo: string
  marca?: string | null; linea?: string | null; motor?: string | null
  meta: number; rendimiento: number; desviacion_pct: number
  km: number; galones: number; tanqueos: number; incumplidos: number
  ultimo: string; severidad: string
}

const R = '/eam/combustible'

export default function EAMCombustible() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [registrando, setRegistrando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [dias, setDias] = useState(180)

  const { data: registros = [], isLoading } = useQuery<Registro[]>({
    queryKey: ['comb-registros'],
    queryFn: () => api.get(`${R}/registros`).then(r => r.data),
  })
  const { data: reporte } = useQuery<Reporte>({
    queryKey: ['comb-rendimiento', dias],
    queryFn: () => api.get(`${R}/rendimiento`, { params: { dias } }).then(r => r.data),
  })
  const { data: alertas = [] } = useQuery<AlertaFila[]>({
    queryKey: ['comb-alertas'], queryFn: () => api.get(`${R}/alertas`).then(r => r.data),
  })
  const { data: metas = [] } = useQuery<Meta[]>({
    queryKey: ['comb-metas'], queryFn: () => api.get(`${R}/metas`).then(r => r.data),
  })

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['comb-registros'] })
    qc.invalidateQueries({ queryKey: ['comb-rendimiento'] })
    qc.invalidateQueries({ queryKey: ['comb-alertas'] })
  }

  const filtrados = registros.filter(r =>
    !busqueda || `${r.placa} ${r.activo_codigo} ${r.estacion} ${r.factura}`
      .toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <Layout title="Combustible">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-start" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Typography variant="h6" fontWeight={800}>Combustible</Typography>
            <Typography variant="caption" color="text.secondary">
              Tanqueos, rendimiento tanque a tanque y metas de km/galón
            </Typography>
          </Box>
          <Button startIcon={<Add />} variant="contained" onClick={() => setRegistrando(true)}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            Registrar tanqueo
          </Button>
        </Stack>

        {alertas.length > 0 && (
          <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
            {alertas.length} {alertas.length === 1 ? 'vehículo está' : 'vehículos están'} por
            debajo de su meta de rendimiento:{' '}
            {alertas.slice(0, 3).map(a => `${a.placa} (${a.rendimiento} km/gal)`).join(' · ')}
          </Alert>
        )}

        {metas.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }} action={
            <Button size="small" onClick={() => setTab(3)}>Configurar metas</Button>
          }>
            No hay metas de km/galón. Sin ellas se registran los tanqueos y se calcula el
            rendimiento, pero nadie sabe si está bien o mal.
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          <Tab label={`Tanqueos (${registros.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Rendimiento" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Alertas (${alertas.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Metas (${metas.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {/* ── Tanqueos ──────────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            <TextField size="small" placeholder="Buscar placa, estación o factura…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ mb: 2, width: 320 }} />
            {isLoading ? <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /> : (
              <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['FECHA', 'PLACA', 'COMBUSTIBLE', 'CANTIDAD', 'UNITARIO', 'IVA',
                        'TOTAL', 'ODÓMETRO', 'KM/GAL', ''].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtrados.map(r => (
                      <TableRow key={r.id} hover>
                        <TableCell>{fecha(r.fecha)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {r.placa ?? r.activo_codigo}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[r.marca, r.linea].filter(Boolean).join(' ')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{r.tipo_combustible ?? '—'}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {numero(r.cantidad, 2)}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {' '}{r.unidad === 'LITRO' ? 'L' : 'gal'}
                          </Typography>
                          {!r.tanque_lleno && (
                            <Tooltip title="Tanqueo parcial: no produce rendimiento por sí solo, se suma al del próximo tanque lleno">
                              <Chip label="parcial" size="small" sx={{
                                ml: 0.5, height: 16, fontSize: 9, fontWeight: 700,
                                bgcolor: `${PALETA.acero}1A`, color: PALETA.grafito }} />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {pesos(r.precio_unitario)}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                          {r.iva_valor ? `${pesos(r.iva_valor)} (${r.iva_pct}%)` : '—'}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                          {pesos(r.costo_total)}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {numero(r.odometro, 0)}
                          {r.km_recorridos != null && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              +{numero(r.km_recorridos, 0)} km
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.rendimiento == null ? (
                            <Tooltip title={!r.tanque_lleno
                              ? 'Tanqueo parcial: entra al cálculo del próximo tanque lleno'
                              : 'Falta el tanqueo lleno anterior o la lectura del odómetro'}>
                              <Typography variant="caption" color="text.secondary">
                                sin medir
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {numero(r.rendimiento, 2)}
                              </Typography>
                              {r.cumple_meta === false && (
                                <Tooltip title={`Meta ${r.meta_km_gal} km/gal · ${r.desviacion_pct}%`}>
                                  <TrendingDown sx={{ fontSize: 16, color: ESTADO.peligro }} />
                                </Tooltip>
                              )}
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => {
                            if (!window.confirm('¿Eliminar este tanqueo? El rendimiento de los siguientes queda desactualizado hasta recalcular.')) return
                            api.delete(`${R}/registros/${r.id}`).then(() => { refrescar(); toast.success('Eliminado') })
                          }}><DeleteOutline fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtrados.length === 0 && (
                      <TableRow><TableCell colSpan={10} sx={{ py: 5, textAlign: 'center' }}>
                        <LocalGasStation sx={{ fontSize: 36, color: PALETA.acero, opacity: 0.4 }} />
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Todavía no hay tanqueos registrados.
                        </Typography>
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </Box>
        )}

        {/* ── Rendimiento ───────────────────────────────────────────────── */}
        {tab === 1 && reporte && (
          <Box>
            <Stack direction="row" spacing={1.5} mb={2}>
              <TextField select size="small" label="Periodo" value={dias} sx={{ width: 150 }}
                onChange={e => setDias(Number(e.target.value))}>
                <MenuItem value={30}>30 días</MenuItem>
                <MenuItem value={90}>90 días</MenuItem>
                <MenuItem value={180}>6 meses</MenuItem>
                <MenuItem value={365}>1 año</MenuItem>
              </TextField>
              <Box sx={{ flex: 1 }} />
              <Button startIcon={<Refresh />} sx={{ textTransform: 'none' }}
                onClick={() => api.post(`${R}/recalcular`).then((x: any) => {
                  refrescar(); toast.success(`${x.data.recalculados} tanqueos recalculados`)
                })}>
                Recalcular histórico
              </Button>
            </Stack>

            <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
              <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap
                divider={<Divider orientation="vertical" flexItem />}>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">Rendimiento de la flota</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {numero(reporte.rendimiento_flota, 2)}
                    <Typography component="span" variant="caption" color="text.secondary"> km/gal</Typography>
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography variant="caption" color="text.secondary">Costo por kilómetro</Typography>
                  <Typography variant="h6" fontWeight={800}>{pesos(reporte.costo_por_km)}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography variant="caption" color="text.secondary">Galones</Typography>
                  <Typography variant="h6" fontWeight={800}>{numero(reporte.galones_totales)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pesos(reporte.costo_total)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">Tanqueos</Typography>
                  <Typography variant="h6" fontWeight={800}>{reporte.tanqueos}</Typography>
                  {reporte.sin_rendimiento > 0 && (
                    <Tooltip title="Tanqueos parciales, sin odómetro o sin un tanque lleno anterior con el cual comparar">
                      <Typography variant="caption" sx={{ color: ESTADO.alerta }}>
                        {reporte.sin_rendimiento} sin poder medir
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              </Stack>
            </Card>

            <Box sx={{ display: 'grid', gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <TablaRendimiento titulo="Por vehículo" filas={reporte.por_vehiculo} />
              <TablaRendimiento titulo="Por marca" filas={reporte.por_marca} />
              <TablaRendimiento titulo="Por línea" filas={reporte.por_linea} />
              <TablaRendimiento titulo="Por motor" filas={reporte.por_motor} />
            </Box>
          </Box>
        )}

        {/* ── Alertas ───────────────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              La alerta señala el <b>vehículo</b>, no el tanqueo suelto: un mal tanqueo puede ser
              una carretera en subida, pero un promedio por debajo de la meta es el equipo.
            </Alert>
            <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['PLACA', 'MARCA / LÍNEA', 'MOTOR', 'RENDIMIENTO', 'META',
                      'DESVIACIÓN', 'TANQUEOS', 'SEVERIDAD'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alertas.map(a => (
                    <TableRow key={a.activo_id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{a.placa}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {[a.marca, a.linea].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{a.motor ?? '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: ESTADO.peligro }}>
                        {numero(a.rendimiento, 2)}
                      </TableCell>
                      <TableCell>{numero(a.meta, 2)}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ESTADO.peligro }}>
                        {a.desviacion_pct}%
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {a.incumplidos} de {a.tanqueos} por debajo
                      </TableCell>
                      <TableCell>
                        <Chip label={a.severidad === 'ALTA' ? 'Alta' : 'Media'} size="small" sx={{
                          height: 20, fontSize: 10, fontWeight: 800,
                          bgcolor: `${a.severidad === 'ALTA' ? ESTADO.peligro : ESTADO.alerta}1A`,
                          color: a.severidad === 'ALTA' ? ESTADO.peligro : ESTADO.alerta }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {alertas.length === 0 && (
                    <TableRow><TableCell colSpan={8} sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Ningún vehículo por debajo de su meta.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Box>
        )}

        {tab === 3 && <Metas />}

        {registrando && (
          <DialogoTanqueo onCerrar={() => setRegistrando(false)}
            onListo={() => { setRegistrando(false); refrescar() }} />
        )}
      </Box>
    </Layout>
  )
}

/** Tabla de rendimiento por eje, con su barra contra la meta. */
function TablaRendimiento({ titulo, filas }: { titulo: string; filas: FilaRendimiento[] }) {
  return (
    <Card sx={{ borderRadius: 3, p: 2.5 }}>
      <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
      <Typography variant="caption" color="text.secondary">
        Promedio ponderado por kilómetros, no promedio de promedios
      </Typography>
      {filas.length === 0 ? (
        <Typography variant="body2" sx={{ py: 3, textAlign: 'center', color: PALETA.acero }}>
          Sin datos en el periodo
        </Typography>
      ) : (
        <Stack spacing={1.5} mt={2}>
          {filas.slice(0, 10).map(f => {
            const pct = f.meta && f.rendimiento
              ? Math.min(130, (f.rendimiento / f.meta) * 100) : null
            const color = pct == null ? COLOR_MODULO
              : pct >= 100 ? ESTADO.exito : pct >= 90 ? ESTADO.alerta : ESTADO.peligro
            return (
              <Box key={f.etiqueta}>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>
                    {f.etiqueta}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {numero(f.km, 0)} km · {pesos(f.costo_por_km)}/km
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color }}>
                    {numero(f.rendimiento, 2)}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={pct ?? 0} sx={{
                  mt: 0.4, height: 6, borderRadius: 99, bgcolor: PALETA.niebla,
                  '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: color } }} />
                {f.meta && (
                  <Typography variant="caption" color="text.secondary">
                    meta {numero(f.meta, 1)} km/gal
                    {f.desviacion_pct != null && ` · ${f.desviacion_pct > 0 ? '+' : ''}${f.desviacion_pct}%`}
                    {f.alertas > 0 && ` · ${f.alertas} tanqueos bajo meta`}
                  </Typography>
                )}
              </Box>
            )
          })}
        </Stack>
      )}
    </Card>
  )
}

/* ═══ Registrar un tanqueo ═════════════════════════════════════════════════ */
function DialogoTanqueo({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const [f, setF] = useState<any>({
    fecha: new Date().toISOString().slice(0, 16),
    unidad: 'GALON', iva_pct: 19, tanque_lleno: true,
  })

  const { data: activos = [] } = useQuery<any[]>({
    queryKey: ['eam-activos-comb'],
    queryFn: () => api.get('/eam/activos').then(r =>
      Array.isArray(r.data) ? r.data : (r.data?.items ?? [])),
  })
  const { data: tipos = [] } = useQuery<string[]>({
    queryKey: ['comb-tipos'], queryFn: () => api.get(`${R}/tipos`).then(r => r.data),
  })

  const equipo = activos.find(a => a.id === f.activo_id)

  // El total se previsualiza acá, pero lo calcula el servidor: es un dato
  // contable, y si lo arma el navegador dos versiones distintas del frontend
  // pueden guardar cifras distintas para la misma compra.
  const subtotal = (Number(f.cantidad) || 0) * (Number(f.precio_unitario) || 0)
  const iva = subtotal * (Number(f.iva_pct) || 0) / 100

  const guardar = useMutation({
    mutationFn: () => api.post(`${R}/registros`, {
      activo_id: f.activo_id,
      fecha: `${f.fecha}:00`,
      tipo_combustible: f.tipo_combustible || null,
      cantidad: Number(f.cantidad),
      unidad: f.unidad,
      precio_unitario: f.precio_unitario === '' || f.precio_unitario == null
        ? null : Number(f.precio_unitario),
      iva_pct: Number(f.iva_pct) || 0,
      odometro: f.odometro === '' || f.odometro == null ? null : Number(f.odometro),
      tanque_lleno: !!f.tanque_lleno,
      proveedor: f.proveedor || null, factura: f.factura || null,
      conductor: f.conductor || null, estacion: f.estacion || null,
      observaciones: f.observaciones || null,
    }).then(r => r.data),
    onSuccess: (r: any) => {
      toast.success(r.rendimiento != null
        ? `Registrado · ${r.rendimiento} km/gal${r.cumple_meta === false ? ' — POR DEBAJO DE LA META' : ''}`
        : 'Tanqueo registrado', { duration: 5000 })
      onListo()
    },
    onError: (e: any) => toast.error(mensaje(e), { duration: 7000 }),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Registrar tanqueo</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select size="small" label="Vehículo" value={f.activo_id ?? ''}
            onChange={e => setF({ ...f, activo_id: Number(e.target.value) })}
            helperText={equipo?.odometro_actual
              ? `Último odómetro registrado: ${numero(equipo.odometro_actual, 0)} km` : undefined}>
            {activos.map(a => (
              <MenuItem key={a.id} value={a.id}>
                {a.placa ? `${a.placa} · ` : ''}{a.codigo} · {a.nombre}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Fecha y hora" type="datetime-local" fullWidth
              value={f.fecha} InputLabelProps={{ shrink: true }}
              onChange={e => setF({ ...f, fecha: e.target.value })} />
            <TextField select size="small" label="Combustible" fullWidth
              value={f.tipo_combustible ?? ''}
              onChange={e => setF({ ...f, tipo_combustible: e.target.value })}>
              {tipos.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Cantidad" type="number" fullWidth
              value={f.cantidad ?? ''}
              onChange={e => setF({ ...f, cantidad: e.target.value })} />
            <TextField select size="small" label="Unidad" sx={{ width: 130 }} value={f.unidad}
              onChange={e => setF({ ...f, unidad: e.target.value })}>
              <MenuItem value="GALON">Galones</MenuItem>
              <MenuItem value="LITRO">Litros</MenuItem>
            </TextField>
            <TextField size="small" label="Precio unitario" type="number" fullWidth
              value={f.precio_unitario ?? ''}
              onChange={e => setF({ ...f, precio_unitario: e.target.value })} />
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField size="small" label="IVA (%)" type="number" sx={{ width: 110 }}
              value={f.iva_pct} onChange={e => setF({ ...f, iva_pct: e.target.value })} />
            <Box sx={{ flex: 1, textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Subtotal {pesos(subtotal)} + IVA {pesos(iva)}
              </Typography>
              <Typography variant="h6" fontWeight={800}>{pesos(subtotal + iva)}</Typography>
            </Box>
          </Stack>

          <Divider />
          <TextField size="small" label="Odómetro" type="number" value={f.odometro ?? ''}
            onChange={e => setF({ ...f, odometro: e.target.value })}
            helperText="Sin esta lectura no se puede calcular el rendimiento" />
          <FormControlLabel label={<Box>
            <Typography variant="body2">Tanque lleno</Typography>
            <Typography variant="caption" color="text.secondary">
              El rendimiento solo se puede medir entre dos tanques llenos. Un tanqueo parcial
              se guarda igual y entra al cálculo del siguiente lleno.
            </Typography></Box>}
            control={<Switch checked={!!f.tanque_lleno}
              onChange={e => setF({ ...f, tanque_lleno: e.target.checked })} />} />

          <Divider />
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Estación" fullWidth value={f.estacion ?? ''}
              onChange={e => setF({ ...f, estacion: e.target.value })} />
            <TextField size="small" label="Factura" fullWidth value={f.factura ?? ''}
              onChange={e => setF({ ...f, factura: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Proveedor" fullWidth value={f.proveedor ?? ''}
              onChange={e => setF({ ...f, proveedor: e.target.value })} />
            <TextField size="small" label="Conductor" fullWidth value={f.conductor ?? ''}
              onChange={e => setF({ ...f, conductor: e.target.value })} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained"
          disabled={!f.activo_id || !f.cantidad || guardar.isPending}
          onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {guardar.isPending ? 'Guardando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══ Metas de km/galón ════════════════════════════════════════════════════ */
function Metas() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Meta | null>(null)
  const [f, setF] = useState<any>({})

  const { data = [] } = useQuery<Meta[]>({
    queryKey: ['comb-metas'], queryFn: () => api.get(`${R}/metas`).then(r => r.data) })
  const { data: filtros } = useQuery<{ tipos: string[]; marcas: string[] }>({
    queryKey: ['eam-dash-filtros'],
    queryFn: () => api.get('/eam/dashboard/filtros').then(r => r.data) })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['comb-metas'] })
    qc.invalidateQueries({ queryKey: ['comb-alertas'] })
  }

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { ...f, meta_km_gal: Number(f.meta_km_gal),
                       tolerancia_pct: Number(f.tolerancia_pct) || 0 }
      return edicion ? api.put(`${R}/metas/${edicion.id}`, cuerpo).then(r => r.data)
                     : api.post(`${R}/metas`, cuerpo).then(r => r.data)
    },
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Meta guardada') },
    onError: (e: any) => toast.error(mensaje(e), { duration: 7000 }),
  })

  const ambito = (m: Meta) =>
    [m.tipo_activo, m.marca, m.linea,
     [m.motor_marca, m.motor_linea].filter(Boolean).join(' ') || null]
      .filter(Boolean).join(' › ') || 'Toda la flota'

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Las metas se declaran por jerarquía —tipo → marca → línea → motor— y <b>manda la más
        específica</b>. Así se fija una meta para toda la flota y se afina para los equipos que
        llevan un motor concreto, sin escribir una meta por placa.
      </Alert>
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setEdicion(null); setF({ tolerancia_pct: 5 }); setAbierto(true) }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Nueva meta</Button>
      </Stack>
      <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['ÁMBITO', 'NIVELES', 'META', 'TOLERANCIA', 'ALERTA POR DEBAJO DE',
                'NOTA', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(m => (
              <TableRow key={m.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{ambito(m)}</TableCell>
                <TableCell>
                  <Tooltip title="Entre varias metas que apliquen, gana la que declare más niveles">
                    <Chip label={m.especificidad ?? 0} size="small" sx={{
                      height: 19, fontSize: 10, fontWeight: 700,
                      bgcolor: `${COLOR_MODULO}1A`, color: COLOR_MODULO }} />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {numero(m.meta_km_gal, 2)}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {' '}km/gal
                  </Typography>
                </TableCell>
                <TableCell>{m.tolerancia_pct}%</TableCell>
                <TableCell sx={{ color: ESTADO.alerta, fontWeight: 700 }}>
                  {numero(m.meta_km_gal * (1 - m.tolerancia_pct / 100), 2)}
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: PALETA.grafito }}>{m.nota ?? '—'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => { setEdicion(m); setF({ ...m }); setAbierto(true) }}>
                    <Flag fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() =>
                    api.delete(`${R}/metas/${m.id}`).then(() => invalidar())}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: 'center' }}>
                <Speed sx={{ fontSize: 36, color: PALETA.acero, opacity: 0.4 }} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Sin metas configuradas.
                </Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? 'Editar meta' : 'Nueva meta de rendimiento'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Deje vacío lo que no quiera acotar. Cada nivel que declare hace la meta más
              específica, y la más específica es la que se aplica.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField select size="small" label="Tipo de activo" fullWidth
                value={f.tipo_activo ?? ''}
                onChange={e => setF({ ...f, tipo_activo: e.target.value || null })}>
                <MenuItem value="">Cualquiera</MenuItem>
                {(filtros?.tipos ?? []).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Marca" fullWidth value={f.marca ?? ''}
                onChange={e => setF({ ...f, marca: e.target.value || null })}>
                <MenuItem value="">Cualquiera</MenuItem>
                {(filtros?.marcas ?? []).map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField size="small" label="Línea" value={f.linea ?? ''}
              onChange={e => setF({ ...f, linea: e.target.value || null })} />
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Marca del motor" fullWidth value={f.motor_marca ?? ''}
                onChange={e => setF({ ...f, motor_marca: e.target.value || null })} />
              <TextField size="small" label="Línea del motor" fullWidth value={f.motor_linea ?? ''}
                onChange={e => setF({ ...f, motor_linea: e.target.value || null })} />
            </Stack>

            <Divider />
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Meta (km/galón)" type="number" fullWidth
                value={f.meta_km_gal ?? ''}
                onChange={e => setF({ ...f, meta_km_gal: e.target.value })} />
              <TextField size="small" label="Tolerancia (%)" type="number" fullWidth
                value={f.tolerancia_pct ?? 5}
                onChange={e => setF({ ...f, tolerancia_pct: e.target.value })}
                helperText="Cuánto por debajo se tolera antes de alertar" />
            </Stack>
            {f.meta_km_gal && (
              <Alert severity="info" sx={{ py: 0.25 }}>
                Alertará por debajo de{' '}
                <b>{numero(Number(f.meta_km_gal) * (1 - (Number(f.tolerancia_pct) || 0) / 100), 2)} km/gal</b>.
                La tolerancia existe porque un tanqueo en montaña rinde menos que uno en plano,
                y alertar por una décima convierte el módulo en ruido que nadie mira.
              </Alert>
            )}
            <TextField size="small" label="Nota" value={f.nota ?? ''}
              onChange={e => setF({ ...f, nota: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.meta_km_gal || guardar.isPending}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
