/**
 * Lubricación · Operación.
 *
 * Antes esta pantalla eran 1.732 líneas sobre datos escritos en el código
 * —`useState(LUBE_POINTS_INITIAL)`— y nada se guardaba. Ahora todo sale de
 * `/eam/lube`.
 *
 * El ciclo que refleja: un activo tiene compartimentos; un compartimento tiene
 * una carga viva; la carga se rellena y se muestrea; cada muestra se evalúa y
 * produce una severidad; una severidad alta abre un diagnóstico que se confirma
 * o se desmiente al intervenir.
 */
import { useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Tabs, Tab,
  Divider, LinearProgress, InputAdornment, Switch, FormControlLabel,
} from '@mui/material'
import {
  Add, Science, Search, WaterDrop, Opacity, TrendingUp, Settings,
  UploadFile, FactCheck, WarningAmber, LocalGasStation, Insights,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO, SERIES } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import {
  lubeApi, COLOR_SEVERIDAD, ETIQUETA_SEVERIDAD, ETIQUETA_DISPARO,
  type Compartimento, type Muestra, type ResultadoMuestra,
} from '@/api/lube'

const mensaje = (e: any) =>
  e?.response?.data?.detail ?? e?.message ?? 'No se pudo completar la operación'

const pesos = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const colorEstado = (e: string) =>
  e === 'CRITICO' ? ESTADO.peligro : e === 'MARGINAL' ? ESTADO.alerta : ESTADO.exito

const colorSeveridad = (s?: string | null) =>
  !s || s === 'PENDIENTE' ? PALETA.acero
    : s === 'NORMAL' ? ESTADO.exito
    : s === 'MARGINAL' ? ESTADO.alerta : ESTADO.peligro

function Severidad({ valor }: { valor?: string | null }) {
  const color = colorSeveridad(valor)
  return (
    <Chip label={ETIQUETA_SEVERIDAD[valor ?? 'PENDIENTE'] ?? valor} size="small" sx={{
      height: 21, fontSize: 10.5, fontWeight: 800,
      bgcolor: `${color}1F`, color,
    }} />
  )
}

/** Barra de vida de la carga contra lo recomendado. */
function VidaCarga({ actual, recomendada, unidad }: {
  actual?: number | null; recomendada?: number | null; unidad?: string | null
}) {
  if (actual == null) return <Typography variant="caption" color="text.secondary">Sin lecturas</Typography>
  const pct = recomendada ? Math.min(100, (actual / recomendada) * 100) : null
  const color = pct == null ? COLOR_MODULO : pct >= 100 ? ESTADO.peligro : pct >= 85 ? ESTADO.alerta : ESTADO.exito
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {actual.toLocaleString('es-CO')}{recomendada ? ` / ${recomendada.toLocaleString('es-CO')}` : ''}
        <Typography component="span" variant="caption" color="text.secondary">
          {' '}{(unidad ?? 'HORAS').toLowerCase()}
        </Typography>
      </Typography>
      {pct != null && (
        <LinearProgress variant="determinate" value={pct} sx={{
          mt: 0.4, height: 5, borderRadius: 99, bgcolor: PALETA.niebla,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
        }} />
      )}
    </Box>
  )
}

/** Ranking horizontal: con pocas categorías se lee mejor que una torta. */
function Ranking({ titulo, ayuda, filas, campo = 'cantidad', color, formato }: {
  titulo: string; ayuda: string; filas: any[]; campo?: string; color: string
  formato?: (f: any) => string
}) {
  const tope = Math.max(1, ...filas.map(f => f[campo] ?? 0))
  return (
    <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
      <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
      <Typography variant="caption" color="text.secondary">{ayuda}</Typography>
      {filas.length === 0 ? (
        <Typography variant="body2" sx={{ py: 3, textAlign: 'center', color: PALETA.acero }}>
          Sin datos todavía
        </Typography>
      ) : (
        <Stack spacing={1.25} mt={2}>
          {filas.map(f => (
            <Box key={f.etiqueta}>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>{f.etiqueta}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {formato ? formato(f) : f[campo]}
                </Typography>
              </Stack>
              <Box sx={{
                mt: 0.4, height: 7, borderRadius: 99, bgcolor: color,
                width: `${((f[campo] ?? 0) / tope) * 100}%`, minWidth: 4,
              }} />
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  )
}

export default function EAMLubricacion() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [verMuestra, setVerMuestra] = useState<number | null>(null)
  const [nuevaMuestra, setNuevaMuestra] = useState<Compartimento | null>(null)
  const [nuevaCarga, setNuevaCarga] = useState<Compartimento | null>(null)

  const { data: compartimentos = [], isLoading } = useQuery({
    queryKey: ['lube-compartimentos'], queryFn: () => lubeApi.compartimentos.listar(),
  })
  const { data: muestras = [] } = useQuery({
    queryKey: ['lube-muestras'], queryFn: () => lubeApi.muestras.listar(),
  })
  const { data: pendientes = [] } = useQuery({
    queryKey: ['lube-pendientes'], queryFn: () => lubeApi.pendientes(),
  })
  const { data: analitica } = useQuery({
    queryKey: ['lube-analitica'], queryFn: () => lubeApi.analitica(),
  })

  const filtrados = useMemo(() => compartimentos.filter(c =>
    !busqueda || `${c.activo_codigo} ${c.nombre} ${c.tipo_compartimento} ${c.producto_actual}`
      .toLowerCase().includes(busqueda.toLowerCase())), [compartimentos, busqueda])

  const criticas = muestras.filter(m => m.severidad === 'CRITICO' || m.severidad === 'ACCION_INMEDIATA')

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['lube-compartimentos'] })
    qc.invalidateQueries({ queryKey: ['lube-muestras'] })
    qc.invalidateQueries({ queryKey: ['lube-pendientes'] })
    qc.invalidateQueries({ queryKey: ['lube-analitica'] })
  }

  const sinConfigurar = compartimentos.length === 0

  return (
    <Layout title="Lubricación">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-start" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Typography variant="h6" fontWeight={800}>Lubricación</Typography>
            <Typography variant="caption" color="text.secondary">
              Análisis de aceite por compartimento, con la vida y el costo de cada carga
            </Typography>
          </Box>
          <Button startIcon={<Settings />} variant="outlined"
            onClick={() => navigate('/eam/lubricacion/config')}
            sx={{ textTransform: 'none' }}>
            Configuración
          </Button>
        </Stack>

        {sinConfigurar && !isLoading && (
          <Alert severity="info" sx={{ mb: 2 }} action={
            <Button size="small" onClick={() => navigate('/eam/lubricacion/config')}>
              Ir a configuración
            </Button>
          }>
            Todavía no hay compartimentos. Los catálogos ya vienen sembrados —parámetros,
            tipos, límites de arranque—; falta crear las marcas y productos de lubricante que
            usa la empresa y darle compartimentos a los activos.
          </Alert>
        )}

        {criticas.length > 0 && (
          <Alert severity="error" icon={<WarningAmber />} sx={{ mb: 2 }}>
            Hay {criticas.length} {criticas.length === 1 ? 'muestra crítica' : 'muestras críticas'} sin
            resolver. {criticas.slice(0, 3).map(m => `${m.activo_codigo} · ${m.numero}`).join(' · ')}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          <Tab label={`Compartimentos (${compartimentos.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Muestras (${muestras.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Por muestrear (${pendientes.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Tablero" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {/* ── Compartimentos ─────────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            <TextField size="small" placeholder="Buscar activo, compartimento o producto…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ mb: 2, width: 340 }} />

            {isLoading ? <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /> : (
              <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['ACTIVO', 'COMPARTIMENTO', 'PRODUCTO EN USO', 'VIDA DE LA CARGA',
                        'ÚLTIMA MUESTRA', 'ESTADO', ''].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtrados.map(c => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {c.activo_codigo}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{c.activo_nombre}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography variant="body2">{c.nombre}</Typography>
                            {c.critico && <Chip label="Crítico" size="small" sx={{
                              height: 17, fontSize: 9, fontWeight: 800,
                              bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {c.tipo_compartimento}
                            {!c.tiene_puerto_muestreo && ' · sin puerto de muestreo'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {c.producto_actual ?? (
                            <Typography variant="caption" color="text.secondary">Sin carga abierta</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <VidaCarga actual={c.vida_actual} recomendada={c.vida_recomendada}
                            unidad={c.unidad_vida} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{fecha(c.fecha_ultima_muestra)}</Typography>
                        </TableCell>
                        <TableCell><Severidad valor={c.severidad_ultima} /></TableCell>
                        <TableCell align="right">
                          <Tooltip title="Registrar muestra">
                            <span>
                              <IconButton size="small" onClick={() => setNuevaMuestra(c)}>
                                <Science fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={c.carga_id ? 'Cambiar el aceite (cierra la carga actual)' : 'Abrir la primera carga'}>
                            <IconButton size="small" onClick={() => setNuevaCarga(c)}>
                              <WaterDrop fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </Box>
        )}

        {/* ── Muestras ───────────────────────────────────────────────────────── */}
        {tab === 1 && (
          <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['MUESTRA', 'ACTIVO', 'COMPARTIMENTO', 'TOMADA', 'VIDA DEL ACEITE',
                    'SEVERIDAD'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {muestras.map(m => (
                  <TableRow key={m.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => setVerMuestra(m.id)}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{m.numero}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{m.activo_codigo}</TableCell>
                    <TableCell>{m.compartimento}</TableCell>
                    <TableCell>{fecha(m.fecha_toma)}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {m.horas_aceite != null ? m.horas_aceite.toLocaleString('es-CO') : '—'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Severidad valor={m.severidad} />
                        {m.severidad_manual && (
                          <Tooltip title="Severidad fijada por un analista">
                            <FactCheck sx={{ fontSize: 14, color: PALETA.acero }} />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {muestras.length === 0 && (
                  <TableRow><TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Todavía no hay muestras registradas.
                    </Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* ── Por muestrear ──────────────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Sale de comparar la vida acumulada de cada carga contra la frecuencia de muestreo
              del compartimento. Si no se muestrea cuando toca, el resto de los números del
              tablero son adorno.
            </Alert>
            <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['ACTIVO', 'COMPARTIMENTO', 'VIDA ACTUAL', 'FRECUENCIA',
                      'ÚLTIMA MUESTRA', 'MOTIVO', ''].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendientes.map(p => (
                    <TableRow key={p.compartimento_id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {p.activo}
                        {p.critico && <Chip label="Crítico" size="small" sx={{
                          ml: 0.75, height: 16, fontSize: 9, fontWeight: 800,
                          bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />}
                      </TableCell>
                      <TableCell>{p.compartimento}<br />
                        <Typography variant="caption" color="text.secondary">{p.tipo}</Typography>
                      </TableCell>
                      <TableCell>{p.vida_actual ?? '—'} {p.unidad.toLowerCase()}</TableCell>
                      <TableCell>{p.frecuencia_muestreo ?? '—'}</TableCell>
                      <TableCell>{fecha(p.ultima_muestra)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: ESTADO.alerta, fontWeight: 700 }}>
                          {p.motivo}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<Science />} sx={{ textTransform: 'none' }}
                          onClick={() => {
                            const c = compartimentos.find(x => x.id === p.compartimento_id)
                            if (c) setNuevaMuestra(c)
                          }}>
                          Registrar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendientes.length === 0 && (
                    <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Nada pendiente. Todos los compartimentos con carga viva están al día.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Box>
        )}

        {/* ── Tablero ────────────────────────────────────────────────────────── */}
        {tab === 3 && analitica && (
          <Box>
            <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                <Box sx={{ flex: 1, minWidth: 130 }}>
                  <Typography variant="caption" color="text.secondary">Muestras</Typography>
                  <Typography variant="h6" fontWeight={800}>{analitica.total_muestras}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flex: 1, minWidth: 130 }}>
                  <Typography variant="caption" color="text.secondary">Críticas</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{
                    color: analitica.criticas ? ESTADO.peligro : ESTADO.exito }}>
                    {analitica.criticas}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flex: 1, minWidth: 170 }}>
                  <Typography variant="caption" color="text.secondary">Acierto del diagnóstico</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {analitica.diagnostico.acierto_pct != null
                      ? `${analitica.diagnostico.acierto_pct}%` : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analitica.diagnostico.confirmados} confirmados · {analitica.diagnostico.desmentidos} desmentidos
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flex: 1, minWidth: 170 }}>
                  <Typography variant="caption" color="text.secondary">Sin puerto de muestreo</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{
                    color: analitica.sin_puerto_muestreo ? ESTADO.alerta : ESTADO.exito }}>
                    {analitica.sin_puerto_muestreo} <Typography component="span" variant="caption"
                      color="text.secondary">de {analitica.compartimentos}</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    condiciona la calidad del dato
                  </Typography>
                </Box>
              </Stack>
            </Card>

            {analitica.drenajes.some(d => d.evitable) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Hay cargas drenadas por motivos marcados como evitables. Esos cambios son
                oportunidad perdida: el aceite salió antes de tiempo por algo que se podía
                prevenir.
              </Alert>
            )}

            <Box sx={{ display: 'grid', gap: 2, mb: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Ranking titulo="Parámetros que más disparan"
                ayuda="Qué está fallando, agrupado" filas={analitica.parametros}
                color={ESTADO.peligro} />
              <Ranking titulo="Motivos de drenaje"
                ayuda="Por qué se saca el aceite, y cuánto rindió"
                filas={analitica.drenajes} color={ESTADO.alerta}
                formato={f => `${f.cantidad} · ${f.vida_promedio ?? '—'} prom.`} />
              <Ranking titulo="Por marca"
                ayuda="Qué flota concentra los análisis críticos" filas={analitica.por_marca}
                color={PALETA.grafito}
                formato={f => `${f.cantidad}${f.criticas ? ` · ${f.criticas} críticas` : ''}`} />
              <Ranking titulo="Costo por unidad de vida"
                ayuda="Aceite, filtro, mano de obra y rellenos, por hora o kilómetro lubricado"
                filas={analitica.costos} campo="costo_por_unidad" color={COLOR_MODULO}
                formato={f => `${pesos(f.costo_por_unidad)} / ${(f.unidad ?? '').toLowerCase()}`} />
            </Box>
          </Box>
        )}

        {verMuestra && (
          <DetalleMuestra id={verMuestra} onCerrar={() => setVerMuestra(null)} onCambio={refrescar} />
        )}
        {nuevaMuestra && (
          <DialogoMuestra compartimento={nuevaMuestra}
            onCerrar={() => setNuevaMuestra(null)} onListo={refrescar} />
        )}
        {nuevaCarga && (
          <DialogoCarga compartimento={nuevaCarga}
            onCerrar={() => setNuevaCarga(null)} onListo={refrescar} />
        )}
      </Box>
    </Layout>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Detalle de una muestra: los resultados con su evaluación, y el diagnóstico.
   Va a nivel de módulo y no dentro del componente padre: definida adentro,
   React la trataría como un tipo nuevo en cada render y la remontaría entera.
   ═══════════════════════════════════════════════════════════════════════════ */
function DetalleMuestra({ id, onCerrar, onCambio }: {
  id: number; onCerrar: () => void; onCambio: () => void
}) {
  const qc = useQueryClient()
  const [conclusion, setConclusion] = useState('')
  const [recomendacion, setRecomendacion] = useState('')
  const [modoFalla, setModoFalla] = useState<number | ''>('')

  const { data: muestra, isLoading } = useQuery({
    queryKey: ['lube-muestra', id], queryFn: () => lubeApi.muestras.obtener(id),
  })
  const { data: modos = [] } = useQuery({
    queryKey: ['lube-modos'], queryFn: () => lubeApi.modosFalla.listar(),
  })
  const { data: diagnosticos = [] } = useQuery({
    queryKey: ['lube-diagnosticos', id], queryFn: () => lubeApi.diagnosticos.listar({ muestra_id: id }),
  })

  const crearDiag = useMutation({
    mutationFn: () => lubeApi.diagnosticos.crear({
      muestra_id: id, modo_falla_id: modoFalla || null,
      severidad: muestra?.severidad ?? 'NORMAL', conclusion, recomendacion,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lube-diagnosticos', id] })
      setConclusion(''); setRecomendacion(''); setModoFalla('')
      toast.success('Diagnóstico registrado')
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const verificar = useMutation({
    mutationFn: ({ did, v, h }: { did: number; v: string; h: string }) =>
      lubeApi.diagnosticos.verificar(did, v, h),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lube-diagnosticos', id] })
      onCambio(); toast.success('Verificación registrada')
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const reevaluar = useMutation({
    mutationFn: () => lubeApi.muestras.reevaluar(id),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['lube-muestra', id] })
      onCambio(); toast.success(`Reevaluada: ${ETIQUETA_SEVERIDAD[r.severidad] ?? r.severidad}`)
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const porGrupo = useMemo(() => {
    const g: Record<string, ResultadoMuestra[]> = {}
    for (const r of muestra?.resultados ?? []) (g[r.grupo] ??= []).push(r)
    return g
  }, [muestra])

  const ETIQUETA_GRUPO: Record<string, string> = {
    DESGASTE: 'Metales de desgaste', CONTAMINACION: 'Contaminantes',
    ADITIVO: 'Aditivos', PROPIEDAD: 'Propiedades del fluido',
  }

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>
              {muestra?.numero ?? 'Muestra'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {muestra?.activo_codigo} · {muestra?.compartimento} · tomada el {fecha(muestra?.fecha_toma)}
              {muestra?.horas_aceite != null && ` · ${muestra.horas_aceite} de vida del aceite`}
            </Typography>
          </Box>
          <Severidad valor={muestra?.severidad} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? <Skeleton variant="rectangular" height={280} /> : (
          <Box>
            {muestra?.severidad_manual && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Esta severidad la fijó un analista a mano. Reevaluar la devuelve al criterio
                automático.
              </Alert>
            )}

            {Object.entries(porGrupo).map(([grupo, filas]) => (
              <Box key={grupo} mb={2}>
                <Typography variant="caption" sx={{
                  fontWeight: 800, letterSpacing: '0.08em', color: PALETA.grafito }}>
                  {(ETIQUETA_GRUPO[grupo] ?? grupo).toUpperCase()}
                </Typography>
                <Table size="small" sx={{ mt: 0.5 }}>
                  <TableBody>
                    {filas.map(r => (
                      <TableRow key={r.id}>
                        <TableCell sx={{ width: '32%' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.nombre}</Typography>
                          {r.origen_probable && (
                            <Typography variant="caption" color="text.secondary">
                              {r.origen_probable}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                          {r.valor_texto ?? r.valor ?? '—'}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {' '}{r.unidad}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.tasa_cambio != null && (
                            <Tooltip title="Variación por cada 100 unidades de vida del aceite">
                              <Stack direction="row" spacing={0.4} alignItems="center">
                                <TrendingUp sx={{
                                  fontSize: 14,
                                  color: r.tasa_cambio > 0 ? ESTADO.alerta : PALETA.acero,
                                  transform: r.tasa_cambio < 0 ? 'scaleY(-1)' : 'none' }} />
                                <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {r.tasa_cambio > 0 ? '+' : ''}{r.tasa_cambio}
                                </Typography>
                              </Stack>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {r.estado !== 'NORMAL' && (
                            <Chip
                              label={`${r.estado === 'CRITICO' ? 'Crítico' : 'Marginal'}${
                                r.disparo_por ? ` · ${ETIQUETA_DISPARO[r.disparo_por] ?? ''}` : ''}`}
                              size="small" sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: `${colorEstado(r.estado)}1A`, color: colorEstado(r.estado),
                              }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))}

            {(muestra?.resultados ?? []).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                Esta muestra todavía no tiene resultados cargados.
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={800} mb={1}>Diagnóstico</Typography>

            {diagnosticos.map(d => (
              <Card key={d.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {modos.find(m => m.id === d.modo_falla_id)?.nombre ?? 'Sin modo de falla'}
                    </Typography>
                    {d.conclusion && <Typography variant="caption" display="block">{d.conclusion}</Typography>}
                    {d.recomendacion && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Recomendación: {d.recomendacion}
                      </Typography>
                    )}
                    {d.hallazgo && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                        Al intervenir: {d.hallazgo}
                      </Typography>
                    )}
                  </Box>
                  {d.verificacion === 'PENDIENTE' ? (
                    <Stack spacing={0.5}>
                      <Button size="small" sx={{ textTransform: 'none' }}
                        onClick={() => {
                          const h = window.prompt('¿Qué se encontró al intervenir?') ?? ''
                          if (h) verificar.mutate({ did: d.id, v: 'CONFIRMADO', h })
                        }}>Confirmar</Button>
                      <Button size="small" color="inherit" sx={{ textTransform: 'none' }}
                        onClick={() => {
                          const h = window.prompt('¿Qué se encontró en realidad?') ?? ''
                          if (h) verificar.mutate({ did: d.id, v: 'DESMENTIDO', h })
                        }}>Desmentir</Button>
                    </Stack>
                  ) : (
                    <Chip label={d.verificacion === 'CONFIRMADO' ? 'Confirmado' : 'Desmentido'}
                      size="small" sx={{
                        height: 20, fontSize: 10, fontWeight: 700,
                        bgcolor: d.verificacion === 'CONFIRMADO' ? `${ESTADO.exito}1A` : `${PALETA.acero}1A`,
                        color: d.verificacion === 'CONFIRMADO' ? ESTADO.exito : PALETA.grafito }} />
                  )}
                </Stack>
              </Card>
            ))}

            <Stack spacing={1.5} mt={1.5}>
              <TextField select size="small" label="Modo de falla" value={modoFalla}
                onChange={e => setModoFalla(Number(e.target.value) || '')}>
                <MenuItem value="">—</MenuItem>
                {modos.map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Conclusión" multiline rows={2}
                value={conclusion} onChange={e => setConclusion(e.target.value)} />
              <TextField size="small" label="Recomendación" multiline rows={2}
                value={recomendacion} onChange={e => setRecomendacion(e.target.value)} />
              <Box>
                <Button variant="outlined" size="small" startIcon={<Add />}
                  disabled={crearDiag.isPending || (!conclusion && !modoFalla)}
                  onClick={() => crearDiag.mutate()} sx={{ textTransform: 'none' }}>
                  Registrar diagnóstico
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => reevaluar.mutate()} sx={{ textTransform: 'none' }}>
          Reevaluar contra los límites
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Registro de una muestra, con el lector de boletines.
   ═══════════════════════════════════════════════════════════════════════════ */
function DialogoMuestra({ compartimento, onCerrar, onListo }: {
  compartimento: Compartimento; onCerrar: () => void; onListo: () => void
}) {
  const [numero, setNumero] = useState('')
  const [fechaToma, setFechaToma] = useState(new Date().toISOString().slice(0, 10))
  const [medidor, setMedidor] = useState('')
  const [laboratorio, setLaboratorio] = useState<number | ''>('')
  const [metodo, setMetodo] = useState<number | ''>(compartimento.metodo_muestreo_id ?? '')
  const [valores, setValores] = useState<Record<string, string>>({})
  const [leyendo, setLeyendo] = useState(false)

  const { data: parametros = [] } = useQuery({
    queryKey: ['lube-parametros'], queryFn: () => lubeApi.parametros.listar(),
  })
  const { data: labs = [] } = useQuery({
    queryKey: ['lube-labs'], queryFn: () => lubeApi.laboratorios.listar(),
  })
  const { data: metodos = [] } = useQuery({
    queryKey: ['lube-metodos'], queryFn: () => lubeApi.metodos.listar(),
  })

  const guardar = useMutation({
    mutationFn: () => lubeApi.muestras.crear({
      numero, compartimento_id: compartimento.id,
      fecha_toma: `${fechaToma}T08:00:00`,
      medidor_equipo: medidor === '' ? null : Number(medidor),
      laboratorio_id: laboratorio || null, metodo_id: metodo || null,
      resultados: Object.entries(valores)
        .filter(([, v]) => v !== '')
        .map(([codigo, v]) => ({ codigo, valor: Number(v) })),
    }),
    onSuccess: (r: any) => {
      const sev = r?.evaluacion?.severidad
      toast.success(sev ? `Muestra evaluada: ${ETIQUETA_SEVERIDAD[sev] ?? sev}` : 'Muestra registrada')
      onListo(); onCerrar()
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  /** Precarga desde el boletín del laboratorio con el lector que ya existía. */
  const leer = async (archivo: File) => {
    setLeyendo(true)
    try {
      const d = await lubeApi.leerBoletin(archivo)
      const campos = d?.campos ?? d ?? {}
      const nuevos: Record<string, string> = {}
      for (const p of parametros) {
        const v = campos[p.codigo]
        if (v != null && String(v).trim() !== '') nuevos[p.codigo] = String(v).replace(',', '.')
      }
      setValores(prev => ({ ...prev, ...nuevos }))
      if (campos.muestra_id && !numero) setNumero(String(campos.muestra_id))
      if (campos.horas && !medidor) setMedidor(String(campos.horas).replace(/[^\d.]/g, ''))
      const n = Object.keys(nuevos).length
      toast.success(n ? `Se leyeron ${n} parámetros del boletín` : 'No se reconoció ningún parámetro')
    } catch (e: any) {
      toast.error(mensaje(e))
    } finally {
      setLeyendo(false)
    }
  }

  const porGrupo = useMemo(() => {
    const g: Record<string, typeof parametros> = {}
    for (const p of parametros) (g[p.grupo] ??= []).push(p)
    return g
  }, [parametros])

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Registrar muestra
        <Typography variant="caption" display="block" color="text.secondary">
          {compartimento.activo_codigo} · {compartimento.nombre}
          {!compartimento.carga_id && ' · ATENCIÓN: no hay carga abierta, la muestra quedará suelta'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Button component="label" variant="outlined" startIcon={<UploadFile />}
              disabled={leyendo} sx={{ textTransform: 'none' }}>
              {leyendo ? 'Leyendo el boletín…' : 'Cargar boletín del laboratorio (PDF o foto)'}
              <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg"
                onChange={e => { const f = e.target.files?.[0]; if (f) leer(f) }} />
            </Button>
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Se extraen los parámetros con el lector propio, sin enviar el archivo a ningún
              servicio externo. Todo lo que reconozca queda editable.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="N.º de muestra" value={numero} required
              onChange={e => setNumero(e.target.value)} sx={{ minWidth: 170 }} />
            <TextField size="small" label="Fecha de toma" type="date" value={fechaToma}
              onChange={e => setFechaToma(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 170 }} />
            <TextField size="small" label="Lectura del equipo" type="number" value={medidor}
              onChange={e => setMedidor(e.target.value)} sx={{ minWidth: 170 }}
              helperText="De acá sale la vida del aceite" />
            <TextField select size="small" label="Laboratorio" value={laboratorio}
              onChange={e => setLaboratorio(Number(e.target.value) || '')} sx={{ minWidth: 170 }}>
              <MenuItem value="">—</MenuItem>
              {labs.map(l => <MenuItem key={l.id} value={l.id}>{l.nombre}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Método de toma" value={metodo}
              onChange={e => setMetodo(Number(e.target.value) || '')} sx={{ minWidth: 210 }}>
              <MenuItem value="">—</MenuItem>
              {metodos.map(m => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nombre}{m.calidad === 'NO_RECOMENDADO' ? ' (no recomendado)' : ''}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Divider />
          {Object.entries(porGrupo).map(([grupo, filas]) => (
            <Box key={grupo}>
              <Typography variant="caption" sx={{
                fontWeight: 800, letterSpacing: '0.08em', color: PALETA.grafito }}>
                {grupo}
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.25, mt: 0.75,
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                {filas.map(p => (
                  <TextField key={p.codigo} size="small" type="number"
                    label={`${p.nombre}${p.unidad ? ` (${p.unidad})` : ''}`}
                    value={valores[p.codigo] ?? ''}
                    onChange={e => setValores({ ...valores, [p.codigo]: e.target.value })} />
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={!numero || guardar.isPending}
          onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {guardar.isPending ? 'Evaluando…' : 'Guardar y evaluar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Apertura de una carga: es el cambio de aceite.
   ═══════════════════════════════════════════════════════════════════════════ */
function DialogoCarga({ compartimento, onCerrar, onListo }: {
  compartimento: Compartimento; onCerrar: () => void; onListo: () => void
}) {
  const [producto, setProducto] = useState<number | ''>(compartimento.producto_recomendado_id ?? '')
  const [fechaLlenado, setFechaLlenado] = useState(new Date().toISOString().slice(0, 10))
  const [medidor, setMedidor] = useState('')
  const [volumen, setVolumen] = useState(String(compartimento.capacidad_litros ?? ''))
  const [costoAceite, setCostoAceite] = useState('')
  const [costoFiltro, setCostoFiltro] = useState('')
  const [costoObra, setCostoObra] = useState('')
  const [motivo, setMotivo] = useState<number | ''>('')

  const { data: productos = [] } = useQuery({
    queryKey: ['lube-productos'], queryFn: () => lubeApi.productos.listar(),
  })
  const { data: motivos = [] } = useQuery({
    queryKey: ['lube-motivos'], queryFn: () => lubeApi.motivos.listar(),
  })

  const abrir = useMutation({
    mutationFn: async () => {
      // Si había una carga viva, se cierra con su motivo antes de abrir la
      // nueva. El servidor la cerraría igual, pero sin motivo, y el motivo es
      // justo el dato que hace útil el tablero de drenajes.
      if (compartimento.carga_id && motivo) {
        await lubeApi.cargas.drenar(compartimento.carga_id, {
          fecha_drenaje: `${fechaLlenado}T07:00:00`,
          medidor_fin: medidor === '' ? null : Number(medidor),
          motivo_drenaje_id: motivo,
        })
      }
      return lubeApi.cargas.abrir({
        compartimento_id: compartimento.id,
        producto_id: producto || null,
        fecha_llenado: `${fechaLlenado}T08:00:00`,
        medidor_inicio: medidor === '' ? null : Number(medidor),
        volumen_litros: volumen === '' ? null : Number(volumen),
        costo_aceite: costoAceite === '' ? null : Number(costoAceite),
        costo_filtro: costoFiltro === '' ? null : Number(costoFiltro),
        costo_mano_obra: costoObra === '' ? null : Number(costoObra),
      })
    },
    onSuccess: () => { toast.success('Carga registrada'); onListo(); onCerrar() },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {compartimento.carga_id ? 'Cambio de aceite' : 'Primera carga'}
        <Typography variant="caption" display="block" color="text.secondary">
          {compartimento.activo_codigo} · {compartimento.nombre}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {compartimento.carga_id && (
            <Alert severity="info">
              Esto cierra la carga que está viva y abre una nueva. Indique por qué se drenó:
              es el dato que permite saber después cuántos cambios se hicieron por calendario
              con el aceite todavía bueno.
            </Alert>
          )}
          {compartimento.carga_id && (
            <TextField select size="small" label="Motivo del drenaje" value={motivo}
              onChange={e => setMotivo(Number(e.target.value) || '')}>
              <MenuItem value="">—</MenuItem>
              {motivos.map(m => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nombre}{m.evitable ? ' (evitable)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField select size="small" label="Producto" value={producto}
            onChange={e => setProducto(Number(e.target.value) || '')}>
            <MenuItem value="">—</MenuItem>
            {productos.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.marca} {p.nombre}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Fecha" type="date" value={fechaLlenado} fullWidth
              onChange={e => setFechaLlenado(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="Lectura del equipo" type="number" fullWidth
              value={medidor} onChange={e => setMedidor(e.target.value)}
              helperText="Contra esto se mide la vida" />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Litros" type="number" fullWidth
              value={volumen} onChange={e => setVolumen(e.target.value)} />
            <TextField size="small" label="Costo del aceite" type="number" fullWidth
              value={costoAceite} onChange={e => setCostoAceite(e.target.value)} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Costo del filtro" type="number" fullWidth
              value={costoFiltro} onChange={e => setCostoFiltro(e.target.value)} />
            <TextField size="small" label="Mano de obra" type="number" fullWidth
              value={costoObra} onChange={e => setCostoObra(e.target.value)} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Los costos son lo que permite calcular el costo por hora lubricada, que es el
            número que hace comparable un equipo con otro.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={abrir.isPending}
          onClick={() => abrir.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {abrir.isPending ? 'Guardando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
