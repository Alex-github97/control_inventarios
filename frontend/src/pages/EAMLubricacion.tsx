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
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Tabs, Tab,
  Divider, LinearProgress, InputAdornment, Autocomplete, TablePagination,
  FormControlLabel, Switch,
} from '@mui/material'
import {
  Add, Science, Search, WaterDrop, TrendingUp, Settings,
  UploadFile, FactCheck, WarningAmber, Insights, Opacity,
  EventRepeat, Inventory2, ReportProblem, PlaylistAddCheck, PictureAsPdf, Edit,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { CargueMasivo } from '@/components/catalogo/CargueMasivo'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import {
  lubeApi, informesLubeApi, ETIQUETA_SEVERIDAD, ETIQUETA_DISPARO,
  type Compartimento, type Pendiente, type ResultadoMuestra, type Muestra, type Carga, type Relleno,
} from '@/api/lube'
import { mensajeDeError } from '@/utils/errorApi'
import { apiClient as api } from '@/api/client'
import { LubrIA } from '@/components/lubricacion/LubrIA'

const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** «hace 12 días»: la fecha sola obliga a hacer la cuenta en la cabeza. */
const haceCuanto = (v?: string | null) => {
  if (!v) return ''
  const dias = Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 60) return `hace ${dias} días`
  const meses = Math.round(dias / 30)
  return meses < 24 ? `hace ${meses} meses` : `hace ${Math.round(dias / 365)} años`
}

const num = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 1 })

/** La unidad de la vida del aceite, como se lee: «km», «h», «días». */
export const unidadCorta = (u?: string | null) =>
  ({ KM: 'km', HORAS: 'h', DIAS: 'días' } as Record<string, string>)[(u ?? '').toUpperCase()]
  ?? (u ?? '').toLowerCase()

const hoy = () => new Date().toISOString().slice(0, 10)

const ETIQUETA_GRUPO: Record<string, string> = {
  DESGASTE: 'Metales de desgaste', CONTAMINACION: 'Contaminantes',
  ADITIVO: 'Aditivos', PROPIEDAD: 'Propiedades del fluido',
}

const colorEstado = (e: string) =>
  e === 'CRITICO' ? ESTADO.peligro : e === 'MARGINAL' ? ESTADO.alerta : ESTADO.exito

const colorSeveridad = (s?: string | null) =>
  !s || s === 'PENDIENTE' ? PALETA.acero
    : s === 'NORMAL' ? ESTADO.exito
    : s === 'MARGINAL' ? ESTADO.alerta : ESTADO.peligro

const esCritica = (s?: string | null) => s === 'CRITICO' || s === 'ACCION_INMEDIATA'

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
  if (actual == null) {
    return (
      <Tooltip title="La carga no tiene lectura de llenado, o el equipo no tiene medidor registrado. Anote la lectura al registrar la próxima muestra o el próximo cambio.">
        <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>Sin lecturas</Typography>
      </Tooltip>
    )
  }
  const pct = recomendada ? Math.min(100, (actual / recomendada) * 100) : null
  const color = pct == null ? COLOR_MODULO : pct >= 100 ? ESTADO.peligro : pct >= 85 ? ESTADO.alerta : ESTADO.exito
  return (
    <Tooltip title={recomendada
      ? `Lleva ${num(actual)} ${unidadCorta(unidad)} de ${num(recomendada)} recomendados para este producto en este compartimento (${Math.round((actual / recomendada) * 100)} %).`
      : 'Vida de la carga desde el llenado. Para ver el avance contra lo recomendado, configure la aplicación del producto en este tipo de compartimento.'}>
      <Box sx={{ minWidth: 120, cursor: 'help' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {num(actual)}{recomendada ? ` / ${num(recomendada)}` : ''}
          <Typography component="span" variant="caption" color="text.secondary">
            {' '}{unidadCorta(unidad)}
          </Typography>
        </Typography>
        {pct != null && (
          <LinearProgress variant="determinate" value={pct} sx={{
            mt: 0.4, height: 5, borderRadius: 99, bgcolor: PALETA.niebla,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
          }} />
        )}
      </Box>
    </Tooltip>
  )
}

/** Una cifra del encabezado: dice qué es al pasar el puntero y lleva a la lista. */
function Cifra({ icono, valor, titulo, pie, color, ayuda, activo, onClick }: {
  icono: ReactNode; valor: ReactNode; titulo: string; pie?: string; color: string
  ayuda: string; activo?: boolean; onClick?: () => void
}) {
  return (
    <Tooltip title={ayuda} arrow placement="bottom-start" enterDelay={250}>
      <Card onClick={onClick} sx={{
        flex: '1 1 180px', p: 1.75, borderRadius: 3, cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${activo ? color : PALETA.niebla}`,
        boxShadow: activo ? `0 0 0 3px ${color}22` : 'none',
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
        '&:hover': onClick ? { borderColor: color, transform: 'translateY(-1px)' } : undefined,
      }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{
            width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center',
            bgcolor: `${color}14`, color,
          }}>{icono}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1,
                              fontVariantNumeric: 'tabular-nums' }}>{valor}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {titulo}
            </Typography>
          </Box>
        </Stack>
        {pie && (
          <Typography variant="caption" display="block" sx={{ mt: 0.75, color: 'text.secondary' }}>
            {pie}
          </Typography>
        )}
      </Card>
    </Tooltip>
  )
}

function Paginador({ total, pagina, porPagina, onPagina, onPorPagina }: {
  total: number; pagina: number; porPagina: number
  onPagina: (p: number) => void; onPorPagina: (n: number) => void
}) {
  if (total <= 25) return null
  return (
    <TablePagination component="div" count={total} page={pagina} rowsPerPage={porPagina}
      rowsPerPageOptions={[25, 50, 100]}
      onPageChange={(_, p) => onPagina(p)}
      onRowsPerPageChange={e => { onPorPagina(Number(e.target.value)); onPagina(0) }}
      labelRowsPerPage="Filas"
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count.toLocaleString('es-CO')}`}
      sx={{ borderTop: `1px solid ${PALETA.niebla}` }} />
  )
}

const encabezado = { fontWeight: 700, fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' } as const

function Vacio({ columnas, children }: { columnas: number; children: ReactNode }) {
  return (
    <TableRow><TableCell colSpan={columnas} sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">{children}</Typography>
    </TableCell></TableRow>
  )
}

const ESTADOS_PENDIENTE: Record<Pendiente['estado'], { etiqueta: string; color: string; ayuda: string }> = {
  VENCIDO: { etiqueta: 'Vencido', color: ESTADO.peligro,
    ayuda: 'Ya recorrió más que la frecuencia de muestreo desde la última toma de esta carga (o desde el llenado).' },
  PROXIMO: { etiqueta: 'Próximo', color: ESTADO.alerta,
    ayuda: 'Le falta menos del 10 % para la frecuencia: conviene programar la toma.' },
  SIN_HISTORIA: { etiqueta: 'Sin línea base', color: PALETA.grafito,
    ayuda: 'Nunca se ha muestreado. Sin una primera muestra, las tendencias de las siguientes no tienen contra qué compararse.' },
}

type FiltroEstado = '' | 'CRITICA' | 'MARGINAL' | 'NORMAL' | 'PENDIENTE'

export default function EAMLubricacion() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [verMuestra, setVerMuestra] = useState<number | null>(null)
  const [nuevaMuestra, setNuevaMuestra] = useState<Compartimento | null>(null)
  const [nuevaCarga, setNuevaCarga] = useState<Compartimento | null>(null)
  const [relleno, setRelleno] = useState<Compartimento | null>(null)
  const [ficha, setFicha] = useState<Compartimento | 'nuevo' | null>(null)
  /** El paso previo al formulario cuando se entra por el botón de arriba: a qué
   *  compartimento pertenece la muestra. Desde la tabla ya se sabe. */
  const [eligiendo, setEligiendo] = useState(false)

  // Compartimentos: filtros y página.
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [pagC, setPagC] = useState(0)
  const [porPagC, setPorPagC] = useState(25)

  // Pendientes.
  const [filtroPend, setFiltroPend] = useState<'' | Pendiente['estado']>('')
  const [pagP, setPagP] = useState(0)
  const [porPagP, setPorPagP] = useState(25)

  const { data: compartimentos = [], isLoading } = useQuery({
    queryKey: ['lube-compartimentos'], queryFn: () => lubeApi.compartimentos.listar(),
  })
  const { data: pendientes = [], isLoading: cargandoPend } = useQuery({
    queryKey: ['lube-pendientes'], queryFn: () => lubeApi.pendientes(),
  })
  // Solo el total, para el encabezado. La lista paginada vive en su pestaña.
  const { data: totalMuestras } = useQuery({
    queryKey: ['lube-muestras', 'total'],
    queryFn: () => lubeApi.muestras.pagina({ limite: 1 }).then(r => r.total),
  })

  const porId = useMemo(() => new Map(compartimentos.map(c => [c.id, c])), [compartimentos])
  const tipos = useMemo(() => [...new Set(compartimentos.map(c => c.tipo_compartimento)
    .filter(Boolean) as string[])].sort(), [compartimentos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return compartimentos.filter(c =>
      (!q || `${c.activo_codigo} ${c.activo_nombre} ${c.nombre} ${c.tipo_compartimento} ${c.producto_actual}`
        .toLowerCase().includes(q))
      && (!filtroTipo || c.tipo_compartimento === filtroTipo)
      && (!soloCriticos || c.critico)
      && (!filtroEstado
        || (filtroEstado === 'CRITICA' && esCritica(c.severidad_ultima))
        || (filtroEstado === 'PENDIENTE' && (!c.severidad_ultima || c.severidad_ultima === 'PENDIENTE'))
        || c.severidad_ultima === filtroEstado))
  }, [compartimentos, busqueda, filtroTipo, soloCriticos, filtroEstado])

  // Volver a la primera página cuando cambia el filtro: quedarse en la 8 de
  // una lista que ahora tiene dos páginas muestra una tabla vacía.
  useEffect(() => { setPagC(0) }, [busqueda, filtroTipo, soloCriticos, filtroEstado])
  useEffect(() => { setPagP(0) }, [filtroPend])

  const criticos = useMemo(() => compartimentos.filter(c => esCritica(c.severidad_ultima)), [compartimentos])
  const conteoPend = useMemo(() => {
    const n = { VENCIDO: 0, PROXIMO: 0, SIN_HISTORIA: 0 } as Record<Pendiente['estado'], number>
    for (const p of pendientes) n[p.estado] = (n[p.estado] ?? 0) + 1
    return n
  }, [pendientes])
  const pendFiltrados = useMemo(
    () => pendientes.filter(p => !filtroPend || p.estado === filtroPend), [pendientes, filtroPend])
  const sinCarga = compartimentos.filter(c => !c.carga_id).length

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['lube-compartimentos'] })
    qc.invalidateQueries({ queryKey: ['lube-muestras'] })
    qc.invalidateQueries({ queryKey: ['lube-pendientes'] })
  }

  const verCriticos = () => {
    setTab(0); setFiltroEstado('CRITICA'); setBusqueda(''); setFiltroTipo(''); setSoloCriticos(false)
  }
  const verPendientes = (e: '' | Pendiente['estado']) => { setTab(2); setFiltroPend(e) }

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
          {/* Registrar una muestra es lo que más se hace en esta pantalla, así
              que va primero y con nombre propio. */}
          <Button startIcon={<Science />} variant="contained"
            disabled={compartimentos.length === 0}
            onClick={() => setEligiendo(true)}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            Registrar muestra
          </Button>
          <CargueMuestras onListo={refrescar} />
          <Button startIcon={<Insights />} variant="outlined"
            onClick={() => navigate('/eam/lubricacion/reportes')}
            sx={{ textTransform: 'none' }}>
            Interpretación y tablero
          </Button>
          <Tooltip title="Marcas, productos, tipos de compartimento, parámetros y límites">
            <Button startIcon={<Settings />} variant="outlined"
              onClick={() => navigate('/eam/config?seccion=lubricacion')}
              sx={{ textTransform: 'none' }}>
              Configuración
            </Button>
          </Tooltip>
        </Stack>

        {sinConfigurar && !isLoading && (
          <Alert severity="info" sx={{ mb: 2 }} action={
            <Button size="small" onClick={() => navigate('/eam/config?seccion=lubricacion')}>
              Ir a configuración
            </Button>
          }>
            Todavía no hay compartimentos. Los catálogos ya vienen sembrados —parámetros,
            tipos, límites de arranque—; falta crear las marcas y productos de lubricante que
            usa la empresa y darle compartimentos a los activos.
          </Alert>
        )}

        {!sinConfigurar && (
          <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap" useFlexGap>
            <Cifra icono={<Inventory2 fontSize="small" />} color={COLOR_MODULO}
              valor={isLoading ? '…' : num(compartimentos.length)} titulo="Compartimentos"
              pie={sinCarga ? `${num(sinCarga)} sin carga abierta` : 'Todos con carga abierta'}
              ayuda="Motores, transmisiones, hidráulicos y demás depósitos de aceite que se siguen. Sin una carga abierta no se puede contar la vida del aceite."
              activo={tab === 0 && !filtroEstado}
              onClick={() => { setTab(0); setFiltroEstado('') }} />
            <Cifra icono={<EventRepeat fontSize="small" />} color={ESTADO.peligro}
              valor={cargandoPend ? '…' : num(conteoPend.VENCIDO)} titulo="Muestras vencidas"
              pie={`y ${num(conteoPend.PROXIMO)} por vencer`}
              ayuda="Compartimentos que ya recorrieron más que su frecuencia de muestreo desde la última toma. Es la lista de trabajo: si no se muestrea cuando toca, el resto de los números es adorno."
              activo={tab === 2 && filtroPend === 'VENCIDO'}
              onClick={() => verPendientes('VENCIDO')} />
            <Cifra icono={<ReportProblem fontSize="small" />} color={ESTADO.peligro}
              valor={isLoading ? '…' : num(criticos.length)} titulo="Última muestra crítica"
              pie="Compartimentos por atender"
              ayuda="Compartimentos cuya muestra más reciente salió crítica o de acción inmediata. Se queda aquí hasta que una muestra nueva diga otra cosa."
              activo={tab === 0 && filtroEstado === 'CRITICA'}
              onClick={verCriticos} />
            <Cifra icono={<PlaylistAddCheck fontSize="small" />} color={PALETA.grafito}
              valor={cargandoPend ? '…' : num(conteoPend.SIN_HISTORIA)} titulo="Sin línea base"
              pie="Nunca muestreados"
              ayuda="Compartimentos sin ninguna muestra. La primera es la línea base: sin ella, las tendencias de las siguientes no tienen contra qué compararse."
              activo={tab === 2 && filtroPend === 'SIN_HISTORIA'}
              onClick={() => verPendientes('SIN_HISTORIA')} />
            <Cifra icono={<Science fontSize="small" />} color={COLOR_MODULO}
              valor={totalMuestras == null ? '…' : num(totalMuestras)} titulo="Muestras registradas"
              pie="Historia completa"
              ayuda="Todas las muestras con resultado, de todas las cargas. Las anuladas no cuentan."
              activo={tab === 1} onClick={() => setTab(1)} />
          </Stack>
        )}

        {criticos.length > 0 && (
          <Alert severity="error" icon={<WarningAmber />} sx={{ mb: 2, alignItems: 'center' }}
            action={<Button size="small" color="inherit" onClick={verCriticos}
              sx={{ textTransform: 'none', fontWeight: 700 }}>Ver todos</Button>}>
            {criticos.length === 1 ? 'Un compartimento tiene' : `${num(criticos.length)} compartimentos tienen`} su
            última muestra en estado crítico:{' '}
            {criticos.slice(0, 4).map(c => `${c.activo_codigo} · ${c.nombre}`).join(' — ')}
            {criticos.length > 4 ? ' …' : ''}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          <Tab label={`Compartimentos (${num(compartimentos.length)})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Muestras (${totalMuestras == null ? '…' : num(totalMuestras)})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Por muestrear (${num(conteoPend.VENCIDO + conteoPend.PROXIMO)})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<Science fontSize="small" />} iconPosition="start" label="Lubr-IA" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 48 }} />
        </Tabs>

        {/* ── Compartimentos ─────────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField size="small" placeholder="Buscar placa, compartimento o producto…"
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ width: { xs: '100%', sm: 320 } }} />
              <TextField select size="small" label="Última muestra" value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value as FiltroEstado)} sx={{ minWidth: 170 }}>
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="CRITICA">Crítica o acción inmediata</MenuItem>
                <MenuItem value="MARGINAL">Marginal</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="PENDIENTE">Sin resultado</MenuItem>
              </TextField>
              {tipos.length > 1 && (
                <TextField select size="small" label="Tipo" value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)} sx={{ minWidth: 170 }}>
                  <MenuItem value="">Todos</MenuItem>
                  {tipos.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              )}
              <Tooltip title="Los compartimentos marcados como críticos en su ficha: su falla para el equipo">
                <FormControlLabel control={<Switch size="small" checked={soloCriticos}
                  onChange={e => setSoloCriticos(e.target.checked)} />}
                  label={<Typography variant="body2">Solo equipos críticos</Typography>} />
              </Tooltip>
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setFicha('nuevo')}
                sx={{ textTransform: 'none', fontWeight: 700 }}>Nuevo compartimento</Button>
              <Typography variant="caption" color="text.secondary">
                {filtrados.length === compartimentos.length
                  ? `${num(compartimentos.length)} compartimentos`
                  : `${num(filtrados.length)} de ${num(compartimentos.length)}`}
              </Typography>
            </Stack>

            {isLoading ? <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /> : (
              <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['ACTIVO', 'COMPARTIMENTO', 'PRODUCTO EN USO', 'VIDA DE LA CARGA',
                          'ÚLTIMA MUESTRA', 'ESTADO', ''].map(h => (
                          <TableCell key={h} sx={encabezado}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtrados.slice(pagC * porPagC, (pagC + 1) * porPagC).map(c => (
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
                              {c.critico && (
                                <Tooltip title="Compartimento crítico: su falla detiene el equipo">
                                  <Chip label="Crítico" size="small" sx={{
                                    height: 17, fontSize: 9, fontWeight: 800,
                                    bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />
                                </Tooltip>
                              )}
                            </Stack>
                            {/* El tipo solo se repite si dice algo que el nombre no dice. */}
                            {(c.tipo_compartimento !== c.nombre || !c.tiene_puerto_muestreo) && (
                              <Typography variant="caption" color="text.secondary">
                                {[c.tipo_compartimento !== c.nombre ? c.tipo_compartimento : null,
                                  !c.tiene_puerto_muestreo ? 'sin puerto de muestreo' : null]
                                  .filter(Boolean).join(' · ')}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {c.producto_actual ?? (
                              <Typography variant="caption" color="text.secondary">
                                {c.carga_id ? 'Producto sin registrar' : 'Sin carga abierta'}
                              </Typography>
                            )}
                            {c.fecha_llenado && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Cambio: {fecha(c.fecha_llenado)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <VidaCarga actual={c.vida_actual} recomendada={c.vida_recomendada}
                              unidad={c.unidad_vida} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" display="block">{fecha(c.fecha_ultima_muestra)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {c.fecha_ultima_muestra ? haceCuanto(c.fecha_ultima_muestra) : 'Nunca'}
                            </Typography>
                          </TableCell>
                          <TableCell><Severidad valor={c.severidad_ultima} /></TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title="Registrar muestra">
                              <IconButton size="small" aria-label={`Registrar muestra de ${c.activo_codigo} ${c.nombre}`}
                                onClick={() => setNuevaMuestra(c)}>
                                <Science fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={c.carga_id ? 'Relleno: aceite agregado sin cambiar la carga' : 'Abra primero una carga'}>
                              <span>
                                <IconButton size="small" disabled={!c.carga_id}
                                  aria-label={`Registrar relleno de ${c.activo_codigo} ${c.nombre}`}
                                  onClick={() => setRelleno(c)}>
                                  <Opacity fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={c.carga_id ? 'Cambio de aceite (cierra la carga actual)' : 'Abrir la primera carga'}>
                              <IconButton size="small" aria-label={`Cambio de aceite de ${c.activo_codigo} ${c.nombre}`}
                                onClick={() => setNuevaCarga(c)}>
                                <WaterDrop fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar compartimento: producto recomendado, frecuencia de muestreo…">
                              <IconButton size="small" aria-label={`Editar compartimento ${c.activo_codigo} ${c.nombre}`}
                                onClick={() => setFicha(c)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtrados.length === 0 && (
                        <Vacio columnas={7}>Ningún compartimento coincide con el filtro.</Vacio>
                      )}
                    </TableBody>
                  </Table>
                </Box>
                <Paginador total={filtrados.length} pagina={pagC} porPagina={porPagC}
                  onPagina={setPagC} onPorPagina={setPorPagC} />
              </Card>
            )}
          </Box>
        )}

        {/* ── Muestras ───────────────────────────────────────────────────────── */}
        {tab === 1 && <ListaMuestras onVer={setVerMuestra} />}

        {/* ── Lubr-IA: el chat de análisis de aceite ─────────────────────────── */}
        {tab === 3 && <LubrIA />}

        {/* ── Por muestrear ──────────────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip label={`Todos (${num(pendientes.length)})`} onClick={() => setFiltroPend('')}
                variant={filtroPend === '' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, ...(filtroPend === '' && { bgcolor: COLOR_MODULO, color: '#fff' }) }} />
              {(Object.keys(ESTADOS_PENDIENTE) as Pendiente['estado'][]).map(e => {
                const d = ESTADOS_PENDIENTE[e]
                const activo = filtroPend === e
                return (
                  <Tooltip key={e} title={d.ayuda}>
                    <Chip label={`${d.etiqueta} (${num(conteoPend[e])})`} onClick={() => setFiltroPend(e)}
                      variant={activo ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700, borderColor: d.color, color: activo ? '#fff' : d.color,
                            ...(activo && { bgcolor: d.color }) }} />
                  </Tooltip>
                )
              })}
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 460 }}>
                Se cuenta desde la última muestra de la carga viva —o desde el cambio de aceite—
                contra la frecuencia de muestreo de cada compartimento.
              </Typography>
            </Stack>
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['ACTIVO', 'COMPARTIMENTO', 'DESDE LA ÚLTIMA TOMA', 'VIDA DE LA CARGA',
                        'ÚLTIMA MUESTRA', 'ESTADO', ''].map(h => (
                        <TableCell key={h} sx={encabezado}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cargandoPend && (
                      <TableRow><TableCell colSpan={7}><Skeleton height={120} /></TableCell></TableRow>
                    )}
                    {pendFiltrados.slice(pagP * porPagP, (pagP + 1) * porPagP).map(p => {
                      const d = ESTADOS_PENDIENTE[p.estado]
                      const u = unidadCorta(p.unidad)
                      return (
                        <TableRow key={p.compartimento_id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {p.activo}
                            {p.critico && <Chip label="Crítico" size="small" sx={{
                              ml: 0.75, height: 16, fontSize: 9, fontWeight: 800, fontFamily: 'inherit',
                              bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{p.compartimento}</Typography>
                            {p.tipo !== p.compartimento && (
                              <Typography variant="caption" color="text.secondary">{p.tipo}</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ minWidth: 170 }}>
                            {p.desde_ultima == null ? (
                              <Typography variant="caption" color="text.secondary">Sin lecturas</Typography>
                            ) : (
                              <Tooltip title={p.frecuencia_muestreo
                                ? `${num(p.desde_ultima)} ${u} desde la última toma; se muestrea cada ${num(p.frecuencia_muestreo)} ${u}.`
                                : 'El compartimento no tiene frecuencia de muestreo configurada.'}>
                                <Box sx={{ cursor: 'help' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                    {num(p.desde_ultima)}
                                    {p.frecuencia_muestreo ? ` / ${num(p.frecuencia_muestreo)}` : ''}
                                    <Typography component="span" variant="caption" color="text.secondary"> {u}</Typography>
                                  </Typography>
                                  {p.avance_pct != null && (
                                    <LinearProgress variant="determinate" value={Math.min(100, p.avance_pct)} sx={{
                                      mt: 0.4, height: 5, borderRadius: 99, bgcolor: PALETA.niebla,
                                      '& .MuiLinearProgress-bar': { bgcolor: d.color, borderRadius: 99 },
                                    }} />
                                  )}
                                </Box>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {p.vida_actual == null ? '—' : `${num(p.vida_actual)} ${u}`}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" display="block">{fecha(p.ultima_muestra)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.ultima_muestra ? haceCuanto(p.ultima_muestra) : 'Nunca'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={d.ayuda}>
                              <Chip label={p.estado === 'VENCIDO' && p.avance_pct
                                ? `Vencido · ${Math.round(p.avance_pct)} %` : d.etiqueta}
                                size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 800,
                                                   bgcolor: `${d.color}1A`, color: d.color }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<Science />} sx={{ textTransform: 'none' }}
                              disabled={!porId.has(p.compartimento_id)}
                              onClick={() => {
                                const c = porId.get(p.compartimento_id)
                                if (c) setNuevaMuestra(c)
                              }}>
                              Registrar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!cargandoPend && pendFiltrados.length === 0 && (
                      <Vacio columnas={7}>
                        {filtroPend
                          ? 'Ningún compartimento en este estado.'
                          : 'Nada pendiente. Todos los compartimentos con carga viva están al día.'}
                      </Vacio>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Paginador total={pendFiltrados.length} pagina={pagP} porPagina={porPagP}
                onPagina={setPagP} onPorPagina={setPorPagP} />
            </Card>
          </Box>
        )}

        {verMuestra && (
          <DetalleMuestra id={verMuestra} onCerrar={() => setVerMuestra(null)} onCambio={refrescar} />
        )}
        {eligiendo && (
          <DialogoElegirCompartimento
            compartimentos={compartimentos} pendientes={pendientes}
            onCerrar={() => setEligiendo(false)}
            onElegir={c => { setEligiendo(false); setNuevaMuestra(c) }} />
        )}
        {nuevaMuestra && (
          <DialogoMuestra compartimento={nuevaMuestra}
            onCerrar={() => setNuevaMuestra(null)} onListo={refrescar} />
        )}
        {ficha && <DialogoCompartimento compartimento={ficha} onCerrar={() => setFicha(null)} onListo={refrescar} />}
        {nuevaCarga && (
          <DialogoCarga compartimento={nuevaCarga}
            onCerrar={() => setNuevaCarga(null)} onListo={refrescar} />
        )}
        {relleno && (
          <DialogoRelleno compartimento={relleno}
            onCerrar={() => setRelleno(null)} onListo={refrescar} />
        )}
      </Box>
    </Layout>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Las muestras, paginadas en el servidor: con veinte mil no se puede traer la
   lista entera, y antes se mostraban solo las doscientas más recientes sin
   decir que había más.
   ═══════════════════════════════════════════════════════════════════════════ */
function ListaMuestras({ onVer }: { onVer: (id: number) => void }) {
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [severidad, setSeveridad] = useState('')
  const [pagina, setPagina] = useState(0)
  const [porPagina, setPorPagina] = useState(25)

  // Se espera a que deje de escribir: una consulta por tecla es ruido.
  useEffect(() => {
    const t = setTimeout(() => { setBuscar(texto.trim()); setPagina(0) }, 350)
    return () => clearTimeout(t)
  }, [texto])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['lube-muestras', 'pagina', buscar, severidad, pagina, porPagina],
    queryFn: () => lubeApi.muestras.pagina({
      buscar: buscar || undefined, severidad: severidad || undefined,
      limite: porPagina, desplazamiento: pagina * porPagina,
    }),
    placeholderData: prev => prev,
  })
  const filas = data?.filas ?? []

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap alignItems="center">
        <TextField size="small" placeholder="Número de muestra, placa o compartimento…"
          value={texto} onChange={e => setTexto(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: { xs: '100%', sm: 340 } }} />
        <TextField select size="small" label="Severidad" value={severidad}
          onChange={e => { setSeveridad(e.target.value); setPagina(0) }} sx={{ minWidth: 190 }}>
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="CRITICO,ACCION_INMEDIATA">Crítica o acción inmediata</MenuItem>
          <MenuItem value="MARGINAL">Marginal</MenuItem>
          <MenuItem value="NORMAL">Normal</MenuItem>
          <MenuItem value="PENDIENTE">Sin resultado</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {data ? `${num(data.total)} muestra(s)` : ''} · clic en una fila para ver resultados y diagnóstico
        </Typography>
      </Stack>
      <Card sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        {isFetching && !isLoading && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }} />
        )}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['MUESTRA', 'ACTIVO', 'COMPARTIMENTO', 'TOMADA', 'VIDA DEL ACEITE', 'SEVERIDAD'].map(h => (
                  <TableCell key={h} sx={encabezado}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6}><Skeleton height={160} /></TableCell></TableRow>
              )}
              {filas.map(m => (
                <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => onVer(m.id)}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{m.numero}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{m.activo_codigo}</TableCell>
                  <TableCell>{m.compartimento}</TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">{fecha(m.fecha_toma)}</Typography>
                    <Typography variant="caption" color="text.secondary">{haceCuanto(m.fecha_toma)}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {m.horas_aceite != null ? num(m.horas_aceite) : '—'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Severidad valor={m.severidad} />
                      {m.severidad_manual && (
                        <Tooltip title="Severidad fijada por un analista">
                          <FactCheck sx={{ fontSize: 14, color: PALETA.acero }} />
                        </Tooltip>
                      )}
                      {m.con_adicion && (
                        <Tooltip title="Tuvo adición de aceite antes de la toma: los valores pueden estar diluidos">
                          <Opacity aria-label="Con adición de aceite" sx={{ fontSize: 15, color: ESTADO.alerta }} />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filas.length === 0 && (
                <Vacio columnas={6}>
                  {buscar || severidad ? 'Ninguna muestra coincide con la búsqueda.' : 'Todavía no hay muestras registradas.'}
                </Vacio>
              )}
            </TableBody>
          </Table>
        </Box>
        <Paginador total={data?.total ?? 0} pagina={pagina} porPagina={porPagina}
          onPagina={setPagina} onPorPagina={setPorPagina} />
      </Card>
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Cargue masivo de muestras desde Excel.

   Se apoya en el mismo `CargueMasivo` de los catálogos: el Excel se lee en el
   navegador y al servidor van filas ya estructuradas. Lo único propio es de
   dónde salen las columnas, y salen del servidor porque hay una por cada
   parámetro que mide el laboratorio —y esos los define cada empresa en la
   configuración, no el código—.
   ═══════════════════════════════════════════════════════════════════════════ */

function CargueMuestras({ onListo }: { onListo: () => void }) {
  const { data } = useQuery({
    queryKey: ['lube-plantilla-muestras'],
    queryFn: () => lubeApi.muestras.plantilla(),
    staleTime: Infinity,
  })

  if (!data?.columnas) return null

  return (
    <CargueMasivo
      compacto
      titulo={data.titulo}
      nombreArchivo="plantilla-muestras-aceite"
      columnas={data.columnas}
      color={COLOR_MODULO}
      onImportar={filas => lubeApi.muestras.importar(filas)}
      onListo={onListo}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   A qué compartimento pertenece la muestra.

   Es el paso que falta cuando no se entra desde una fila de la tabla. Va con
   buscador y no con una lista desplegable porque una flota mediana pasa de los
   doscientos compartimentos, y los que les toca muestra van primero: es casi
   siempre lo que se viene a registrar.
   ═══════════════════════════════════════════════════════════════════════════ */

function DialogoElegirCompartimento({ compartimentos, pendientes, onElegir, onCerrar }: {
  compartimentos: Compartimento[]
  pendientes: Pendiente[]
  onElegir: (c: Compartimento) => void
  onCerrar: () => void
}) {
  const [elegido, setElegido] = useState<Compartimento | null>(null)

  const porMuestrear = useMemo(() => new Set(pendientes
    .filter(p => p.estado !== 'SIN_HISTORIA').map(p => p.compartimento_id)), [pendientes])

  // `groupBy` de MUI agrupa por orden de aparición: si las opciones no vienen
  // ordenadas por grupo, el encabezado se repite varias veces.
  const opciones = useMemo(() => [...compartimentos].sort((a, b) =>
    Number(porMuestrear.has(b.id)) - Number(porMuestrear.has(a.id)) ||
    `${a.activo_codigo ?? ''}`.localeCompare(`${b.activo_codigo ?? ''}`) ||
    a.nombre.localeCompare(b.nombre)), [compartimentos, porMuestrear])

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Registrar muestra
        <Typography variant="caption" display="block" color="text.secondary">
          Primero, de qué compartimento es la muestra
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Autocomplete
          options={opciones}
          value={elegido}
          onChange={(_, v) => setElegido(v)}
          openOnFocus
          autoHighlight
          groupBy={c => porMuestrear.has(c.id) ? 'Le toca muestra' : 'Los demás compartimentos'}
          getOptionLabel={c => `${c.activo_codigo ?? '—'} · ${c.nombre}`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          noOptionsText="Ningún compartimento con ese nombre"
          renderOption={(props, c) => (
            <Box component="li" {...props} key={c.id}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>
                  {c.activo_codigo ?? '—'} · {c.nombre}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {c.tipo_compartimento}
                  {c.producto_actual ? ` · ${c.producto_actual}` : ' · sin carga abierta'}
                  {!c.tiene_puerto_muestreo && ' · sin puerto de muestreo'}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={p => (
            <TextField {...p} autoFocus label="Activo y compartimento"
              placeholder="Placa o compartimento…" />
          )}
        />
        {elegido && !elegido.carga_id && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Ese compartimento no tiene una carga abierta, así que la muestra quedará
            suelta: sin carga no hay vida del aceite ni con qué comparar la tendencia.
            Conviene abrir primero la carga desde la gota de su fila.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={!elegido}
          onClick={() => elegido && onElegir(elegido)}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          Continuar
        </Button>
      </DialogActions>
    </Dialog>
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
  /** El diagnóstico que se está cerrando, y con qué veredicto. */
  const [cerrando, setCerrando] = useState<{ did: number; v: 'CONFIRMADO' | 'DESMENTIDO' } | null>(null)
  const [hallazgo, setHallazgo] = useState('')

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
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const verificar = useMutation({
    mutationFn: ({ did, v, h }: { did: number; v: string; h: string }) =>
      lubeApi.diagnosticos.verificar(did, v, h),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lube-diagnosticos', id] })
      setCerrando(null); setHallazgo('')
      onCambio(); toast.success('Verificación registrada')
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const reevaluar = useMutation({
    mutationFn: () => lubeApi.muestras.reevaluar(id),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['lube-muestra', id] })
      onCambio(); toast.success(`Reevaluada: ${ETIQUETA_SEVERIDAD[r.severidad] ?? r.severidad}`)
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const pdf = useMutation({
    mutationFn: () => informesLubeApi.muestraPdf(id, muestra?.numero),
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const porGrupo = useMemo(() => {
    const g: Record<string, ResultadoMuestra[]> = {}
    for (const r of muestra?.resultados ?? []) (g[r.grupo] ??= []).push(r)
    return g
  }, [muestra])

  const fuera = (muestra?.resultados ?? []).filter(r => r.estado !== 'NORMAL').length

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
              {muestra?.horas_aceite != null && ` · ${num(muestra.horas_aceite)} de vida del aceite`}
              {muestra?.medidor_equipo != null && ` · lectura ${num(muestra.medidor_equipo)}`}
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
            <AvisoAdicion muestra={muestra} />
            {(muestra?.resultados ?? []).length > 0 && (
              <Typography variant="body2" sx={{ mb: 1.5, color: fuera ? ESTADO.alerta : ESTADO.exito, fontWeight: 700 }}>
                {fuera
                  ? `${fuera} de ${muestra?.resultados?.length} parámetros fuera de rango`
                  : `Los ${muestra?.resultados?.length} parámetros están dentro de rango`}
              </Typography>
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
                      <TableRow key={r.id} sx={r.estado !== 'NORMAL'
                        ? { bgcolor: `${colorEstado(r.estado)}0A` } : undefined}>
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
                            <Tooltip title="Variación por cada 100 unidades de vida del aceite, contra la muestra anterior de la misma carga">
                              <Stack direction="row" spacing={0.4} alignItems="center" sx={{ cursor: 'help' }}>
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
            <Typography variant="subtitle2" fontWeight={800}>Diagnóstico</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Qué se concluye de la muestra y, cuando se interviene el equipo, si se confirmó.
              Ese cierre es lo que mide si el análisis está acertando.
            </Typography>

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
                    {d.analista && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                        {d.analista}
                      </Typography>
                    )}
                  </Box>
                  {d.verificacion === 'PENDIENTE' ? (
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" color="success" variant="outlined" sx={{ textTransform: 'none' }}
                        onClick={() => { setCerrando({ did: d.id, v: 'CONFIRMADO' }); setHallazgo('') }}>
                        Se confirmó
                      </Button>
                      <Button size="small" color="inherit" variant="outlined" sx={{ textTransform: 'none' }}
                        onClick={() => { setCerrando({ did: d.id, v: 'DESMENTIDO' }); setHallazgo('') }}>
                        No se confirmó
                      </Button>
                    </Stack>
                  ) : (
                    <Chip label={d.verificacion === 'CONFIRMADO' ? 'Confirmado' : 'Desmentido'}
                      size="small" sx={{
                        height: 20, fontSize: 10, fontWeight: 700,
                        bgcolor: d.verificacion === 'CONFIRMADO' ? `${ESTADO.exito}1A` : `${PALETA.acero}1A`,
                        color: d.verificacion === 'CONFIRMADO' ? ESTADO.exito : PALETA.grafito }} />
                  )}
                </Stack>
                {cerrando?.did === d.id && (
                  <Stack spacing={1} mt={1.5}>
                    <TextField size="small" autoFocus multiline minRows={2} fullWidth
                      label={cerrando.v === 'CONFIRMADO' ? '¿Qué se encontró al intervenir?' : '¿Qué se encontró en realidad?'}
                      placeholder={cerrando.v === 'CONFIRMADO'
                        ? 'Ej.: casquetes de biela con desgaste en la cara de empuje'
                        : 'Ej.: el equipo estaba bien; la muestra se tomó del tapón de drenaje'}
                      value={hallazgo} onChange={e => setHallazgo(e.target.value)} />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => setCerrando(null)} sx={{ textTransform: 'none' }}>
                        Cancelar
                      </Button>
                      <Button size="small" variant="contained" disabled={!hallazgo.trim() || verificar.isPending}
                        onClick={() => verificar.mutate({ did: d.id, v: cerrando.v, h: hallazgo.trim() })}
                        sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Guardar verificación
                      </Button>
                    </Stack>
                  </Stack>
                )}
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
                  disabled={crearDiag.isPending || (!conclusion.trim() && !modoFalla)}
                  onClick={() => crearDiag.mutate()} sx={{ textTransform: 'none' }}>
                  Registrar diagnóstico
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Tooltip title="Vuelve a comparar los resultados contra los límites vigentes. Úselo después de ajustar un límite.">
          <Button onClick={() => reevaluar.mutate()} disabled={reevaluar.isPending} sx={{ textTransform: 'none' }}>
            Reevaluar contra los límites
          </Button>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={(muestra?.resultados ?? []).length
          ? 'Informe PDF de esta muestra para el cliente, con su diagnóstico y su firma'
          : 'La muestra todavía no tiene resultados'}>
          <span>
            <Button variant="contained" startIcon={<PictureAsPdf />}
              disabled={!(muestra?.resultados ?? []).length || pdf.isPending}
              onClick={() => pdf.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
              {pdf.isPending ? 'Armando…' : 'Informe PDF'}
            </Button>
          </span>
        </Tooltip>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * La lectura del equipo, con lo que el formulario sabe de ella: la unidad, la
 * última conocida y la del llenado. Un número que retrocede se ve bien formado
 * y arruina la vida del aceite: se avisa mientras se escribe, y el servidor lo
 * rechaza igual.
 */
function useLectura(compartimento: Compartimento, minimo?: number | null) {
  const [valor, setValor] = useState(
    compartimento.medidor_actual != null ? String(compartimento.medidor_actual) : '')
  const n = valor === '' ? null : Number(valor)
  const error = n != null && (Number.isNaN(n) || n < 0)
    ? 'Debe ser un número positivo'
    : n != null && minimo != null && n < minimo
      ? `No puede ser menor que ${num(minimo)}, la lectura del llenado`
      : null
  return { valor, setValor, n, error }
}

function CampoLectura({ l, unidad, ayuda }: {
  l: ReturnType<typeof useLectura>; unidad: string; ayuda: string
}) {
  return (
    <TextField size="small" type="number" fullWidth
      label={`Lectura del equipo (${unidad})`}
      value={l.valor} onChange={e => l.setValor(e.target.value)}
      error={!!l.error} helperText={l.error ?? ayuda}
      inputProps={{ min: 0, step: 'any' }} />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Aviso de adición: el aceite agregado antes de la toma diluye los metales de
   desgaste y repone aditivos. Quien analiza la muestra tiene que saberlo antes
   de leer los números.
   ═══════════════════════════════════════════════════════════════════════════ */
function AvisoAdicion({ muestra }: { muestra?: Muestra | null }) {
  const a = muestra?.adicion
  if (!muestra?.con_adicion || !a) return null
  const recientes = a.litros_desde_muestra_anterior
  return (
    <Alert severity="warning" icon={<Opacity />} sx={{ mb: 2 }}>
      <Typography variant="body2" fontWeight={800}>Esta muestra tuvo adición de aceite</Typography>
      <Typography variant="body2">
        {a.cantidad === 1 ? 'Una adición' : `${a.cantidad} adiciones`} en la carga antes de la toma,
        {' '}{num(a.litros)} L{a.pct_capacidad != null && ` (${num(a.pct_capacidad)} % de la capacidad)`}
        {recientes > 0 && recientes !== a.litros && `; ${num(recientes)} L después de la muestra anterior`}.
        {' '}El aceite nuevo diluye los metales de desgaste y repone aditivos: los valores pueden
        verse mejor de lo que están.
      </Typography>
      {a.lubricante_distinto.length > 0 && (
        <Typography variant="body2" fontWeight={700} mt={0.5}>
          Se completó con un lubricante distinto al de la carga ({a.lubricante_distinto.join(', ')}):
          la muestra es una mezcla.
        </Typography>
      )}
      <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 2.5 }}>
        {(muestra.adiciones ?? []).map(r => (
          <li key={r.id}>
            <Typography variant="caption">
              {fecha(r.fecha)} · {num(r.litros)} L
              {r.medidor != null && ` · lectura ${num(r.medidor)}`}
              {r.producto && ` · ${r.producto}`}
              {r.motivo && ` · ${r.motivo}`}
              {r.desde_muestra_anterior === false && ' · antes de la muestra anterior'}
            </Typography>
          </li>
        ))}
      </Box>
    </Alert>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   El aceite de la muestra: el cambio con que trabaja el compartimento y sus
   adiciones. Va dentro del registro de la muestra para que el cambio de aceite
   se registre ANTES y la muestra quede ligada a él, sin salir del formulario.
   ═══════════════════════════════════════════════════════════════════════════ */
function CicloAceite({ carga, rellenos, unidad, onCambio, onAdicion }: {
  carga: Carga | null | undefined; rellenos: Relleno[]; unidad: string
  onCambio: () => void; onAdicion: () => void
}) {
  const litros = rellenos.reduce((t, r) => t + (r.litros ?? 0), 0)
  return (
    <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
        alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>Aceite de esta muestra</Typography>
          <Typography variant="caption" color="text.secondary">
            {carga === undefined ? 'Consultando…' : carga
              ? `Cambio del ${fecha(carga.fecha_llenado)}`
                + (carga.producto ? ` · ${carga.producto}` : '')
                + (carga.medidor_inicio != null ? ` · lectura ${num(carga.medidor_inicio)}` : '')
                + (carga.intervalo_cambio ? ` · intervalo ${num(carga.intervalo_cambio)} ${unidad}` : '')
              : 'Sin cambio de aceite registrado'}
          </Typography>
          {rellenos.length > 0 && (
            <Typography variant="caption" display="block" sx={{ color: ESTADO.alerta, fontWeight: 700 }}>
              {rellenos.length === 1 ? 'Una adición' : `${rellenos.length} adiciones`} en este ciclo
              ({num(litros)} L): la muestra quedará marcada con adición.
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0}>
          <Button size="small" variant={carga ? 'outlined' : 'contained'} startIcon={<EventRepeat />}
            onClick={onCambio} sx={{ textTransform: 'none' }}>
            {carga ? 'Hubo cambio de aceite' : 'Registrar cambio de aceite'}
          </Button>
          <Button size="small" variant="outlined" startIcon={<Opacity />} disabled={!carga}
            onClick={onAdicion} sx={{ textTransform: 'none' }}>
            Registrar adición
          </Button>
        </Stack>
      </Stack>
      {carga === null && (
        <Alert severity="warning" sx={{ mt: 1.25 }}>
          Registre primero el cambio de aceite con que trabaja este compartimento: sin él la
          muestra queda sin vida del aceite y sin muestra anterior con qué comparar.
        </Alert>
      )}
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Registro de una muestra, con el lector de boletines.
   ═══════════════════════════════════════════════════════════════════════════ */
function DialogoMuestra({ compartimento, onCerrar, onListo }: {
  compartimento: Compartimento; onCerrar: () => void; onListo: () => void
}) {
  const unidad = unidadCorta(compartimento.unidad_vida)
  const qc = useQueryClient()
  // La carga se consulta acá y no se toma del compartimento que llega: si se
  // registra un cambio de aceite desde este mismo formulario, la muestra tiene
  // que quedar ligada a la carga nueva.
  const { data: cargaViva } = useQuery({
    queryKey: ['lube-carga-viva', compartimento.id],
    queryFn: async () => (await lubeApi.cargas.listar(
      { compartimento_id: compartimento.id, estado: 'ACTIVA', limite: 1 }))[0] ?? null,
  })
  const { data: rellenosCarga = [] } = useQuery({
    queryKey: ['lube-rellenos', cargaViva?.id],
    queryFn: () => lubeApi.rellenos.listar(cargaViva!.id),
    enabled: !!cargaViva?.id,
  })
  const [dialogo, setDialogo] = useState<'cambio' | 'adicion' | null>(null)
  const comp: Compartimento = useMemo(() => cargaViva === undefined ? compartimento : {
    ...compartimento,
    carga_id: cargaViva?.id ?? null,
    medidor_inicio_carga: cargaViva?.medidor_inicio ?? null,
    producto_actual: cargaViva?.producto ?? null,
    producto_carga_id: cargaViva?.producto_id ?? null,
    intervalo_cambio: cargaViva?.intervalo_cambio ?? null,
    fecha_llenado: cargaViva?.fecha_llenado ?? null,
  }, [compartimento, cargaViva])
  const refrescarCiclo = () => {
    qc.invalidateQueries({ queryKey: ['lube-carga-viva', compartimento.id] })
    qc.invalidateQueries({ queryKey: ['lube-rellenos'] })
    onListo()
  }
  const [numero, setNumero] = useState('')
  const [fechaToma, setFechaToma] = useState(hoy())
  const lectura = useLectura(compartimento, comp.medidor_inicio_carga)
  const [laboratorio, setLaboratorio] = useState<number | ''>('')
  const [metodo, setMetodo] = useState<number | ''>(compartimento.metodo_muestreo_id ?? '')
  const [valores, setValores] = useState<Record<string, string>>({})
  const [leyendo, setLeyendo] = useState(false)
  const [intento, setIntento] = useState(false)

  const { data: parametros = [] } = useQuery({
    queryKey: ['lube-parametros'], queryFn: () => lubeApi.parametros.listar(),
  })
  const { data: labs = [] } = useQuery({
    queryKey: ['lube-labs'], queryFn: () => lubeApi.laboratorios.listar(),
  })
  const { data: metodos = [] } = useQuery({
    queryKey: ['lube-metodos'], queryFn: () => lubeApi.metodos.listar(),
  })

  // El código ISO 4406 («18/16/13») y similares son texto: no se convierten
  // a número ni se les exige que sean positivos.
  const deTexto = useMemo(() => new Set(parametros.filter(p => p.es_texto).map(p => p.codigo)), [parametros])
  const negativos = Object.entries(valores)
    .filter(([k, v]) => !deTexto.has(k) && v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0))
    .map(([k]) => k)
  const cargados = Object.values(valores).filter(v => v !== '').length
  const vida = lectura.n != null && comp.medidor_inicio_carga != null && !lectura.error
    ? lectura.n - comp.medidor_inicio_carga : null
  const errores = !numero.trim() || !!lectura.error || negativos.length > 0 || fechaToma > hoy()

  const guardar = useMutation({
    mutationFn: () => lubeApi.muestras.crear({
      numero: numero.trim(), compartimento_id: compartimento.id,
      carga_id: cargaViva?.id ?? null,
      fecha_toma: `${fechaToma}T08:00:00`,
      medidor_equipo: lectura.n,
      laboratorio_id: laboratorio || null, metodo_id: metodo || null,
      resultados: Object.entries(valores)
        .filter(([, v]) => v !== '')
        .map(([codigo, v]) => deTexto.has(codigo)
          ? { codigo, valor_texto: v.trim() }
          : { codigo, valor: Number(v) }),
    }),
    onSuccess: (r: any) => {
      const sev = r?.evaluacion?.severidad
      toast.success(sev ? `Muestra evaluada: ${ETIQUETA_SEVERIDAD[sev] ?? sev}` : 'Muestra registrada, sin resultados todavía')
      onListo(); onCerrar()
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
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
      if (campos.horas && !lectura.valor) lectura.setValor(String(campos.horas).replace(/[^\d.]/g, ''))
      const n = Object.keys(nuevos).length
      toast.success(n ? `Se leyeron ${n} parámetros del boletín: revíselos antes de guardar` : 'No se reconoció ningún parámetro')
    } catch (e: any) {
      toast.error(mensajeDeError(e))
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
          {comp.producto_actual && ` · ${comp.producto_actual}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <CicloAceite carga={cargaViva} rellenos={rellenosCarga} unidad={unidad}
            onCambio={() => setDialogo('cambio')} onAdicion={() => setDialogo('adicion')} />
          {dialogo === 'cambio' && (
            <DialogoCarga compartimento={comp} onCerrar={() => setDialogo(null)} onListo={refrescarCiclo} />
          )}
          {dialogo === 'adicion' && (
            <DialogoRelleno compartimento={comp} onCerrar={() => setDialogo(null)} onListo={refrescarCiclo} />
          )}
          <Box>
            <Button component="label" variant="outlined" startIcon={<UploadFile />}
              disabled={leyendo} sx={{ textTransform: 'none' }}>
              {leyendo ? 'Leyendo el boletín…' : 'Cargar boletín del laboratorio (PDF o foto)'}
              <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg"
                onChange={e => { const f = e.target.files?.[0]; if (f) leer(f); e.target.value = '' }} />
            </Button>
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Se extraen los parámetros con el lector propio, sin enviar el archivo a ningún
              servicio externo. Todo lo que reconozca queda editable.
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
            <TextField size="small" label="N.º de muestra" value={numero} required
              onChange={e => setNumero(e.target.value)}
              error={intento && !numero.trim()}
              helperText={intento && !numero.trim() ? 'El número del frasco o del boletín' : 'El del frasco o el del boletín'} />
            <TextField size="small" label="Fecha de toma" type="date" value={fechaToma}
              onChange={e => setFechaToma(e.target.value)}
              error={fechaToma > hoy()} helperText={fechaToma > hoy() ? 'No puede estar en el futuro' : ' '}
              InputLabelProps={{ shrink: true }} inputProps={{ max: hoy() }} />
            <CampoLectura l={lectura} unidad={unidad}
              ayuda={vida != null
                ? `Vida del aceite: ${num(vida)} ${unidad}`
                : compartimento.medidor_actual != null ? 'Propuesta: la última lectura conocida' : 'De acá sale la vida del aceite'} />
            <TextField select size="small" label="Laboratorio" value={laboratorio}
              onChange={e => setLaboratorio(Number(e.target.value) || '')}>
              <MenuItem value="">—</MenuItem>
              {labs.map(l => <MenuItem key={l.id} value={l.id}>{l.nombre}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Método de toma" value={metodo}
              onChange={e => setMetodo(Number(e.target.value) || '')}
              helperText={metodos.find(m => m.id === metodo)?.calidad === 'NO_RECOMENDADO'
                ? 'Este método contamina la muestra: los resultados se leen con cautela' : ' '}>
              <MenuItem value="">—</MenuItem>
              {metodos.map(m => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nombre}{m.calidad === 'NO_RECOMENDADO' ? ' (no recomendado)' : ''}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider />
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="subtitle2" fontWeight={800}>Resultados del laboratorio</Typography>
            <Typography variant="caption" color="text.secondary">
              {cargados ? `${cargados} de ${parametros.length} cargados` : 'Deje en blanco lo que el laboratorio no midió'}
            </Typography>
          </Stack>
          {Object.entries(porGrupo).map(([grupo, filas]) => (
            <Box key={grupo}>
              <Typography variant="caption" sx={{
                fontWeight: 800, letterSpacing: '0.08em', color: PALETA.grafito }}>
                {(ETIQUETA_GRUPO[grupo] ?? grupo).toUpperCase()}
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.25, mt: 0.75,
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                {filas.map(p => {
                  const malo = negativos.includes(p.codigo)
                  return (
                    <TextField key={p.codigo} size="small" type={p.es_texto ? 'text' : 'number'}
                      label={`${p.nombre}${p.unidad && p.unidad !== '—' ? ` (${p.unidad})` : ''}`}
                      placeholder={p.es_texto ? 'Ej.: 18/16/13' : undefined}
                      value={valores[p.codigo] ?? ''}
                      error={malo} helperText={malo ? 'Un número positivo' : undefined}
                      inputProps={p.es_texto ? undefined : { min: 0, step: 'any' }}
                      onChange={e => setValores({ ...valores, [p.codigo]: e.target.value })} />
                  )
                })}
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        {!cargados && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
            Sin resultados se guarda como tomada; se evalúa cuando lleguen.
          </Typography>
        )}
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={guardar.isPending}
          onClick={() => { setIntento(true); if (!errores) guardar.mutate() }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {guardar.isPending ? 'Evaluando…' : cargados ? 'Guardar y evaluar' : 'Guardar'}
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
  const unidad = unidadCorta(compartimento.unidad_vida)
  const reemplaza = !!compartimento.carga_id
  const [producto, setProducto] = useState<number | ''>(compartimento.producto_recomendado_id ?? '')
  const [fechaLlenado, setFechaLlenado] = useState(hoy())
  const lectura = useLectura(compartimento, reemplaza ? compartimento.medidor_inicio_carga : null)
  const [volumen, setVolumen] = useState(String(compartimento.capacidad_litros ?? ''))
  // Propuesta: el intervalo del cambio anterior o la vida recomendada del producto.
  const [intervalo, setIntervalo] = useState(String(compartimento.intervalo_cambio ?? compartimento.vida_recomendada ?? ''))
  const [costoAceite, setCostoAceite] = useState('')
  const [costoFiltro, setCostoFiltro] = useState('')
  const [costoObra, setCostoObra] = useState('')
  const [motivo, setMotivo] = useState<number | ''>('')
  const [intento, setIntento] = useState(false)

  const { data: productos = [] } = useQuery({
    queryKey: ['lube-productos'], queryFn: () => lubeApi.productos.listar(),
  })
  const { data: motivos = [] } = useQuery({
    queryKey: ['lube-motivos'], queryFn: () => lubeApi.motivos.listar(),
  })

  const negativo = (v: string) => v !== '' && Number(v) < 0
  const faltaMotivo = reemplaza && !motivo
  const vidaLograda = reemplaza && lectura.n != null && compartimento.medidor_inicio_carga != null && !lectura.error
    ? lectura.n - compartimento.medidor_inicio_carga : null
  const errores = faltaMotivo || !!lectura.error || fechaLlenado > hoy()
    || (volumen !== '' && Number(volumen) <= 0)
    || (intervalo !== '' && !(Number(intervalo) > 0))
    || [costoAceite, costoFiltro, costoObra].some(negativo)

  const abrir = useMutation({
    mutationFn: async () => {
      // La carga viva se cierra con su motivo antes de abrir la nueva. El
      // servidor la cerraría igual, pero sin motivo, y el motivo es justo el
      // dato que dice cuántos cambios se hicieron con el aceite todavía bueno.
      if (reemplaza && motivo) {
        await lubeApi.cargas.drenar(compartimento.carga_id!, {
          fecha_drenaje: `${fechaLlenado}T07:00:00`,
          medidor_fin: lectura.n,
          motivo_drenaje_id: motivo,
        })
      }
      return lubeApi.cargas.abrir({
        compartimento_id: compartimento.id,
        producto_id: producto || null,
        fecha_llenado: `${fechaLlenado}T08:00:00`,
        medidor_inicio: lectura.n,
        volumen_litros: volumen === '' ? null : Number(volumen),
        intervalo_cambio: intervalo === '' ? null : Number(intervalo),
        costo_aceite: costoAceite === '' ? null : Number(costoAceite),
        costo_filtro: costoFiltro === '' ? null : Number(costoFiltro),
        costo_mano_obra: costoObra === '' ? null : Number(costoObra),
      })
    },
    onSuccess: () => { toast.success(reemplaza ? 'Cambio de aceite registrado' : 'Carga abierta'); onListo(); onCerrar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {reemplaza ? 'Cambio de aceite' : 'Primera carga'}
        <Typography variant="caption" display="block" color="text.secondary">
          {compartimento.activo_codigo} · {compartimento.nombre}
          {reemplaza && compartimento.producto_actual && ` · sale ${compartimento.producto_actual}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {reemplaza && (
            <Alert severity="info">
              Esto cierra la carga que está viva
              {compartimento.vida_actual != null && ` (lleva ${num(compartimento.vida_actual)} ${unidad})`} y
              abre una nueva. El motivo del drenaje dice después cuántos cambios se hicieron por
              calendario con el aceite todavía bueno.
            </Alert>
          )}
          {reemplaza && (
            <TextField select size="small" label="Motivo del drenaje" value={motivo} required
              onChange={e => setMotivo(Number(e.target.value) || '')}
              error={intento && faltaMotivo}
              helperText={intento && faltaMotivo ? 'Indique por qué se drenó' : ' '}>
              <MenuItem value="">—</MenuItem>
              {motivos.map(m => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nombre}{m.evitable ? ' (evitable)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField select size="small" label="Producto que entra" value={producto}
            onChange={e => setProducto(Number(e.target.value) || '')}>
            <MenuItem value="">—</MenuItem>
            {productos.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.marca} {p.nombre}</MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Fecha" type="date" value={fechaLlenado} fullWidth
              onChange={e => setFechaLlenado(e.target.value)} InputLabelProps={{ shrink: true }}
              inputProps={{ max: hoy() }}
              error={fechaLlenado > hoy()} helperText={fechaLlenado > hoy() ? 'No puede estar en el futuro' : ' '} />
            <CampoLectura l={lectura} unidad={unidad}
              ayuda={vidaLograda != null
                ? `La carga que sale rindió ${num(vidaLograda)} ${unidad}`
                : 'Contra esto se mide la vida de la carga nueva'} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Litros" type="number" fullWidth
              value={volumen} onChange={e => setVolumen(e.target.value)}
              error={volumen !== '' && Number(volumen) <= 0}
              inputProps={{ min: 0, step: 'any' }} />
            <TextField size="small" label={`Intervalo de cambio (${unidad})`} type="number" fullWidth
              value={intervalo} onChange={e => setIntervalo(e.target.value)}
              error={intervalo !== '' && !(Number(intervalo) > 0)}
              helperText="Cada cuánto se cambia esta carga"
              inputProps={{ min: 0, step: 'any' }} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Costo del aceite" type="number" fullWidth
              value={costoAceite} onChange={e => setCostoAceite(e.target.value)}
              error={negativo(costoAceite)} inputProps={{ min: 0 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Costo del filtro" type="number" fullWidth
              value={costoFiltro} onChange={e => setCostoFiltro(e.target.value)}
              error={negativo(costoFiltro)} inputProps={{ min: 0 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            <TextField size="small" label="Mano de obra" type="number" fullWidth
              value={costoObra} onChange={e => setCostoObra(e.target.value)}
              error={negativo(costoObra)} inputProps={{ min: 0 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Los costos son lo que permite calcular el costo por {unidad} lubricado, que es el
            número que hace comparable un equipo con otro.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={abrir.isPending}
          onClick={() => { setIntento(true); if (!errores) abrir.mutate() }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {abrir.isPending ? 'Guardando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Relleno: aceite agregado sin cambiar la carga.

   Existía en el servidor y no había por dónde registrarlo. Importa por dos
   razones: entra en el costo de la carga —en un equipo con fuga puede ser el
   grueso del gasto— y el consumo de aceite es en sí una señal de desgaste.
   ═══════════════════════════════════════════════════════════════════════════ */
function DialogoRelleno({ compartimento, onCerrar, onListo }: {
  compartimento: Compartimento; onCerrar: () => void; onListo: () => void
}) {
  const unidad = unidadCorta(compartimento.unidad_vida)
  const [fechaR, setFechaR] = useState(hoy())
  const [litros, setLitros] = useState('')
  const [costo, setCosto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [producto, setProducto] = useState<number | ''>(compartimento.producto_carga_id ?? '')
  const lectura = useLectura(compartimento, compartimento.medidor_inicio_carga)
  const [intento, setIntento] = useState(false)
  const { data: productos = [] } = useQuery({
    queryKey: ['lube-productos'], queryFn: () => lubeApi.productos.listar(),
  })

  const { data: anteriores = [] } = useQuery({
    queryKey: ['lube-rellenos', compartimento.carga_id],
    queryFn: () => lubeApi.rellenos.listar(compartimento.carga_id!),
    enabled: !!compartimento.carga_id,
  })
  const litrosPrevios = anteriores.reduce((s, r) => s + (r.litros ?? 0), 0)

  const malLitros = !(Number(litros) > 0)
  const errores = malLitros || !!lectura.error || fechaR > hoy() || (costo !== '' && Number(costo) < 0)

  const guardar = useMutation({
    mutationFn: () => lubeApi.rellenos.crear({
      carga_id: compartimento.carga_id, fecha: `${fechaR}T08:00:00`,
      litros: Number(litros), medidor: lectura.n, producto_id: producto || null,
      costo: costo === '' ? null : Number(costo), motivo: motivo.trim() || null,
    }),
    onSuccess: () => { toast.success('Adición registrada'); onListo(); onCerrar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Adición de aceite
        <Typography variant="caption" display="block" color="text.secondary">
          {compartimento.activo_codigo} · {compartimento.nombre}
          {compartimento.producto_actual && ` · ${compartimento.producto_actual}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {anteriores.length > 0 && (
            <Alert severity={compartimento.capacidad_litros && litrosPrevios > compartimento.capacidad_litros * 0.25 ? 'warning' : 'info'}>
              Esta carga ya lleva {anteriores.length} relleno(s), {num(litrosPrevios)} L en total
              {compartimento.capacidad_litros
                ? ` (${Math.round((litrosPrevios / compartimento.capacidad_litros) * 100)} % de la capacidad)` : ''}.
              Un consumo alto de aceite es en sí una señal: fuga, o paso a la cámara de combustión.
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Fecha" type="date" value={fechaR} fullWidth
              onChange={e => setFechaR(e.target.value)} InputLabelProps={{ shrink: true }}
              inputProps={{ max: hoy() }}
              error={fechaR > hoy()} helperText={fechaR > hoy() ? 'No puede estar en el futuro' : ' '} />
            <TextField size="small" label="Litros agregados" type="number" fullWidth required
              value={litros} onChange={e => setLitros(e.target.value)}
              error={intento && malLitros} helperText={intento && malLitros ? 'Mayor que cero' : ' '}
              inputProps={{ min: 0, step: 'any' }} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <CampoLectura l={lectura} unidad={unidad} ayuda="Opcional, pero ubica el consumo en el recorrido" />
            <TextField size="small" label="Costo" type="number" fullWidth
              value={costo} onChange={e => setCosto(e.target.value)}
              error={costo !== '' && Number(costo) < 0} helperText="Entra en el costo de la carga"
              inputProps={{ min: 0 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Stack>
          <TextField select size="small" label="Lubricante agregado" value={producto}
            onChange={e => setProducto(Number(e.target.value) || '')}
            helperText={producto && compartimento.producto_carga_id && producto !== compartimento.producto_carga_id
              ? 'Distinto al de la carga: las muestras siguientes se leerán como mezcla'
              : 'El mismo de la carga, salvo que se haya completado con otro'}>
            <MenuItem value="">—</MenuItem>
            {productos.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.marca} {p.nombre}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Motivo u observación" value={motivo}
            onChange={e => setMotivo(e.target.value)} placeholder="Nivel bajo en la inspección diaria, fuga por el retén…" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={guardar.isPending}
          onClick={() => { setIntento(true); if (!errores) guardar.mutate() }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {guardar.isPending ? 'Guardando…' : 'Registrar adición'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ── Ficha del compartimento: crear y editar ──────────────────────────────────
   Qué aceite DEBERÍA llevar el punto (para detectar el equivocado) y cada
   cuánto se muestrea (alimenta «Por muestrear»). El aceite que tiene HOY no se
   cambia aquí: eso es un cambio de aceite, que cierra la carga y deja historia. */
function DialogoCompartimento({ compartimento, onCerrar, onListo }: {
  compartimento: Compartimento | 'nuevo'; onCerrar: () => void; onListo: () => void
}) {
  const nuevo = compartimento === 'nuevo'
  const c = nuevo ? null : compartimento
  const { data: activos = [] } = useQuery<{ id: number; codigo: string; placa?: string | null; nombre: string }[]>({
    queryKey: ['eam-activos-lista'], queryFn: () => api.get('/eam/activos').then(r => r.data), staleTime: 300_000,
  })
  const { data: tipos = [] } = useQuery({ queryKey: ['lube-tipos'], queryFn: () => lubeApi.tipos.listar() })
  const { data: productos = [] } = useQuery({ queryKey: ['lube-productos'], queryFn: () => lubeApi.productos.listar() })
  const { data: aplicaciones = [] } = useQuery({ queryKey: ['lube-aplicaciones'], queryFn: () => lubeApi.aplicaciones.listar() })
  const { data: metodos = [] } = useQuery({ queryKey: ['lube-metodos'], queryFn: () => lubeApi.metodos.listar() })
  const [activoId, setActivoId] = useState<number | null>(c?.activo_id ?? null)
  const [tipoId, setTipoId] = useState<number | ''>(c?.tipo_compartimento_id ?? '')
  const [codigo, setCodigo] = useState(c?.codigo ?? '')
  const [nombre, setNombre] = useState(c?.nombre ?? '')
  const [capacidad, setCapacidad] = useState(c?.capacidad_litros != null ? String(c.capacidad_litros) : '')
  const [producto, setProducto] = useState<number | ''>(c?.producto_recomendado_id ?? '')
  const [frecuencia, setFrecuencia] = useState(c?.frecuencia_muestreo != null ? String(c.frecuencia_muestreo) : '')
  const [metodo, setMetodo] = useState<number | ''>(c?.metodo_muestreo_id ?? '')
  const [meta, setMeta] = useState(c?.meta_iso4406 ?? '')
  const [puerto, setPuerto] = useState(c?.tiene_puerto_muestreo ?? false)
  const [critico, setCritico] = useState(c?.critico ?? false)
  const [observaciones, setObservaciones] = useState(c?.observaciones ?? '')
  const [intento, setIntento] = useState(false)

  const tipo = tipos.find(t => t.id === tipoId)
  const unidad = (tipo?.unidad_vida ?? c?.unidad_vida ?? 'HORAS').toLowerCase()
  const aplicacion = aplicaciones.find(a => a.producto_id === producto && a.tipo_compartimento_id === tipoId)
  const activoSel = activos.find(a => a.id === activoId) ?? null
  const faltan = !activoId || !tipoId || !codigo.trim() || !nombre.trim()
  const numeroMalo = (v: string) => v !== '' && !(Number(v) > 0)

  const guardar = useMutation({
    mutationFn: () => {
      const datos = {
        activo_id: activoId!, tipo_compartimento_id: Number(tipoId), codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(), capacidad_litros: capacidad ? Number(capacidad) : null,
        producto_recomendado_id: producto || null, frecuencia_muestreo: frecuencia ? Number(frecuencia) : null,
        metodo_muestreo_id: metodo || null, meta_iso4406: meta.trim() || null,
        tiene_puerto_muestreo: puerto, critico, observaciones: observaciones.trim() || null,
        componente_id: c?.componente_id ?? null, activo: true,
      }
      return nuevo ? lubeApi.compartimentos.crear(datos) : lubeApi.compartimentos.editar(c!.id, datos)
    },
    onSuccess: () => { toast.success(nuevo ? 'Compartimento creado' : 'Compartimento actualizado'); onListo(); onCerrar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const darDeBaja = useMutation({
    mutationFn: () => lubeApi.compartimentos.borrar(c!.id),
    onSuccess: () => { toast.success('Compartimento dado de baja'); onListo(); onCerrar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {nuevo ? 'Nuevo compartimento' : 'Editar compartimento'}
        {!nuevo && <Typography variant="caption" display="block" color="text.secondary">
          {c!.activo_codigo} · {c!.nombre}</Typography>}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete options={activos} value={activoSel} disabled={!nuevo}
            getOptionLabel={a => `${a.placa || a.codigo} — ${a.nombre}`}
            onChange={(_, a) => setActivoId(a?.id ?? null)}
            renderInput={p => <TextField {...p} size="small" label="Activo" required
              error={intento && !activoId}
              helperText={nuevo ? ' ' : 'El activo no se cambia: la historia de cargas y muestras es de este punto'} />} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField select size="small" label="Tipo de compartimento" value={tipoId} fullWidth required
              onChange={e => setTipoId(Number(e.target.value) || '')} error={intento && !tipoId}
              helperText={tipo ? `La vida y el muestreo se miden en ${unidad}` : ' '}>
              <MenuItem value="">—</MenuItem>
              {tipos.filter(t => t.activo || t.id === tipoId).map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Código" value={codigo} required sx={{ minWidth: 150 }}
              onChange={e => setCodigo(e.target.value.toUpperCase())} error={intento && !codigo.trim()}
              helperText="MOT, HID, DIF-POST…" />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Nombre" value={nombre} required fullWidth
              onChange={e => setNombre(e.target.value)} error={intento && !nombre.trim()}
              helperText="Por ejemplo: Motor diésel" />
            <TextField size="small" label="Capacidad (L)" type="number" value={capacidad} sx={{ minWidth: 140 }}
              onChange={e => setCapacidad(e.target.value)} error={numeroMalo(capacidad)} helperText=" "
              inputProps={{ min: 0, step: 'any' }} />
          </Stack>

          <Divider textAlign="left"><Typography variant="caption" fontWeight={700}>Lubricante recomendado</Typography></Divider>
          <TextField select size="small" label="Producto recomendado" value={producto}
            onChange={e => setProducto(Number(e.target.value) || '')}
            helperText={!producto ? 'El aceite que debería llevar este punto. Una carga con otro producto se marca como hallazgo.'
              : aplicacion?.vida_recomendada ? `Vida recomendada para este tipo: ${num(aplicacion.vida_recomendada)} ${unidad} (Configuración → Aplicaciones)`
                : 'Sin vida recomendada para este tipo de compartimento: se configura en Configuración → Aplicaciones'}>
            <MenuItem value="">—</MenuItem>
            {productos.filter(p => p.activo || p.id === producto).map(p =>
              <MenuItem key={p.id} value={p.id}>{p.marca} {p.nombre}{p.grado_sae ? ` · ${p.grado_sae}` : ''}</MenuItem>)}
          </TextField>
          {!nuevo && c!.producto_actual && (
            <Alert severity="info" sx={{ py: 0 }}>
              Hoy tiene <b>{c!.producto_actual}</b>. Si cambió de aceite, regístrelo con «Cambio de aceite» (cierra la
              carga y guarda la historia); este campo es solo el aceite que debería llevar.
            </Alert>
          )}

          <Divider textAlign="left"><Typography variant="caption" fontWeight={700}>Muestreo</Typography></Divider>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label={`Frecuencia de muestreo (${unidad})`} type="number" value={frecuencia} fullWidth
              onChange={e => setFrecuencia(e.target.value)} error={numeroMalo(frecuencia)}
              helperText="Cada cuánto se toma muestra: alimenta «Por muestrear»" inputProps={{ min: 0, step: 'any' }} />
            <TextField select size="small" label="Método de muestreo" value={metodo} fullWidth
              onChange={e => setMetodo(Number(e.target.value) || '')} helperText=" ">
              <MenuItem value="">—</MenuItem>
              {metodos.filter(m => m.activo || m.id === metodo).map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField size="small" label="Meta de limpieza ISO 4406" value={meta} placeholder="18/16/13"
              onChange={e => setMeta(e.target.value)} sx={{ minWidth: 200 }}
              helperText={!meta && aplicacion?.meta_iso4406 ? `De la aplicación: ${aplicacion.meta_iso4406}` : ' '} />
            <FormControlLabel control={<Switch checked={puerto} onChange={e => setPuerto(e.target.checked)} />}
              label={<Typography variant="body2">Tiene puerto de muestreo</Typography>} />
            <FormControlLabel control={<Switch checked={critico} onChange={e => setCritico(e.target.checked)} />}
              label={<Typography variant="body2">Crítico</Typography>} />
          </Stack>
          <TextField size="small" label="Observaciones" value={observaciones} multiline minRows={2}
            onChange={e => setObservaciones(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        {!nuevo && (
          <Button color="error" disabled={darDeBaja.isPending} sx={{ textTransform: 'none', mr: 'auto' }}
            onClick={() => { if (window.confirm('¿Dar de baja este compartimento? Su historia de cargas y muestras se conserva.')) darDeBaja.mutate() }}>
            Dar de baja
          </Button>
        )}
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={guardar.isPending || numeroMalo(capacidad) || numeroMalo(frecuencia)}
          onClick={() => { setIntento(true); if (!faltan) guardar.mutate() }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {guardar.isPending ? 'Guardando…' : nuevo ? 'Crear compartimento' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
