/**
 * La terminal de planta: la pantalla que va al lado de la máquina.
 *
 * PARA QUIÉN ES
 * Para el operario, no para el ingeniero. Se usa de pie, a veces con guantes, con
 * ruido alrededor y sin tiempo. Por eso los objetivos táctiles son grandes, cada
 * paso ocupa la pantalla entera, y en ningún momento hay que leer más de una
 * línea para saber qué hacer.
 *
 * CÓMO FUNCIONA
 * Cuatro pasos: la línea, la orden, quién soy, y reportar. El operario se
 * identifica con su código —el del carné—, que no es una segunda contraseña: la
 * sesión de la empresa ya está abierta en la terminal y esto solo dice QUIÉN
 * reporta, que es lo que la trazabilidad necesita. Pedir una contraseña larga en
 * un teclado con guantes termina en tres operarios compartiendo una sesión, y el
 * registro deja de servir para nada.
 *
 * LO QUE NO HACE
 * No deja reportar más de lo que la estación anterior entregó. El tope lo dice el
 * servidor y la pantalla lo muestra antes de que el operario escriba: descubrirlo
 * al recibir un rechazo es la forma más rápida de que deje de usar la terminal.
 */
import React, { useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  ArrowBack, Badge as BadgeIcon, CheckCircle, Factory, Inventory2,
  PlayArrow, Straighten, ReportProblem, Timeline as TimelineIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { listaDe } from '@/utils/listaApi'
import { mensajeDeError } from '@/utils/errorApi'
import { COLOR_MODULO } from '@/config/marca'

const MES = COLOR_MODULO

interface Linea { id: number; codigo: string; nombre: string }
interface OrdenPiso {
  id: number; numero: string; estado: string; linea_id: number | null
  producto: string | null
  cantidad_planificada: number; cantidad_producida: number; unidad_medida: string
}
interface Operario { id: number; codigo: string; nombre: string; cargo: string | null }
interface Estacion {
  posicion: number; nodo_id: number; tipo: string; nombre: string
  operacion: string | null; equipo: string | null
  es_cuello_botella: boolean
  cantidad_entrante: number; cantidad_producida: number
  cantidad_scrap: number; cantidad_disponible: number
  estado: string; puede_reportar: boolean
  observaciones: string | null
}
interface Tablero {
  linea: Linea
  orden: {
    id: number; numero: string; estado: string
    cantidad_planificada: number; cantidad_producida: number
    cantidad_scrap: number; unidad_medida: string
  } | null
  estaciones: Estacion[]
  aviso?: string
}

const num = (v: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(v || 0)

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: '#94A3B8',
  EN_PROGRESO: '#2563EB',
  COMPLETADA: '#16A34A',
  PAUSADA: '#D97706',
  CANCELADA: '#DC2626',
}

// ─── Paso 1 y 2: escoger dónde y qué ─────────────────────────────────────────

function Selector<T>({ titulo, items, etiqueta, sub, onPick, vacio }: {
  titulo: string
  items: T[]
  etiqueta: (x: T) => string
  sub?: (x: T) => string
  onPick: (x: T) => void
  vacio: string
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 2 }}>{titulo}</Typography>
      {items.length === 0 ? (
        <Alert severity="info" sx={{ fontSize: 15 }}>{vacio}</Alert>
      ) : (
        <Grid container spacing={2}>
          {items.map((x, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                onClick={() => onPick(x)}
                sx={{
                  cursor: 'pointer', borderRadius: 3, border: '2px solid #E2E8F0',
                  transition: 'all .15s',
                  '&:hover': { borderColor: MES, transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 800 }}>
                    {etiqueta(x)}
                  </Typography>
                  {sub && (
                    <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5 }}>
                      {sub(x)}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

// ─── Paso 3: quién reporta ───────────────────────────────────────────────────

function Identificarse({ onListo }: { onListo: (o: Operario) => void }) {
  const [codigo, setCodigo] = useState('')
  const identificar = useMutation({
    mutationFn: (c: string) =>
      api.post('/mes/planta/identificar', { codigo: c }).then(r => r.data),
    onSuccess: (o: Operario) => {
      toast.success(`Bienvenido, ${o.nombre}`)
      onListo(o)
    },
    onError: (e) => toast.error(mensajeDeError(e, 'No se pudo identificar el operario')),
  })

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', py: 4 }}>
      <BadgeIcon sx={{ fontSize: 56, color: MES, mb: 1 }} />
      <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 0.5 }}>
        ¿Quién va a reportar?
      </Typography>
      <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 3 }}>
        Escriba su código de operario, el que aparece en su carné.
      </Typography>
      <TextField
        autoFocus fullWidth value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && codigo.trim()) identificar.mutate(codigo.trim()) }}
        placeholder="OP-001"
        inputProps={{ style: { fontSize: 30, textAlign: 'center', fontWeight: 800,
                               letterSpacing: 2, padding: '18px 0' } }}
      />
      <Button
        fullWidth variant="contained" size="large" sx={{ mt: 2.5, py: 1.8, fontSize: 17 }}
        disabled={!codigo.trim() || identificar.isPending}
        onClick={() => identificar.mutate(codigo.trim())}
      >
        {identificar.isPending ? 'Verificando…' : 'Entrar'}
      </Button>
    </Box>
  )
}

// ─── Paso 4: la línea y sus estaciones ───────────────────────────────────────

function TarjetaEstacion({ e, onReportar }: { e: Estacion; onReportar: () => void }) {
  const color = COLOR_ESTADO[e.estado] ?? '#94A3B8'
  const meta = e.cantidad_entrante || 0
  const pct = meta > 0 ? Math.min(100, (e.cantidad_producida / meta) * 100) : 0

  return (
    <Card sx={{
      borderRadius: 3, height: '100%',
      border: `2px solid ${e.puede_reportar ? alpha(MES, .5) : '#E2E8F0'}`,
      bgcolor: e.estado === 'COMPLETADA' ? '#F0FDF4' : '#fff',
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '50%', bgcolor: alpha(color, .15),
            color, display: 'grid', placeItems: 'center', fontWeight: 800,
            fontSize: 14, flexShrink: 0,
          }}>{e.posicion}</Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }} noWrap>
              {e.nombre}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
              {e.operacion ?? e.tipo.toLowerCase()}
            </Typography>
          </Box>
          {e.es_cuello_botella && (
            <Chip label="Cuello" size="small"
                  sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: 10 }} />
          )}
        </Stack>

        <Box sx={{ height: 8, bgcolor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', mb: 1 }}>
          <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color }} />
        </Box>

        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Producido</Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {num(e.cantidad_producida)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Scrap</Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: e.cantidad_scrap ? '#DC2626' : 'inherit',
                              fontVariantNumeric: 'tabular-nums' }}>
              {num(e.cantidad_scrap)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Disponible</Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: MES,
                              fontVariantNumeric: 'tabular-nums' }}>
              {num(e.cantidad_disponible)}
            </Typography>
          </Box>
        </Stack>

        {e.estado === 'COMPLETADA' ? (
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: '#16A34A' }}>
            <CheckCircle sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Estación cerrada</Typography>
          </Stack>
        ) : e.puede_reportar ? (
          <Button fullWidth variant="contained" size="large"
                  startIcon={<PlayArrow />} onClick={onReportar}
                  sx={{ py: 1.2, fontSize: 15 }}>
            Reportar avance
          </Button>
        ) : (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            {/* Decir POR QUÉ no se puede. Un botón gris sin explicación hace que
                el operario piense que la terminal está dañada. */}
            {e.cantidad_disponible <= 0
              ? 'Esperando material de la estación anterior'
              : 'La orden no está en ejecución'}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

function DialogoAvance({ estacion, orden, operario, unidad, onCerrar, onGuardado }: {
  estacion: Estacion
  orden: { id: number; numero: string }
  operario: Operario
  unidad: string
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [producido, setProducido] = useState('')
  const [scrap, setScrap] = useState('')
  const [turno, setTurno] = useState('MANANA')
  const [notas, setNotas] = useState('')
  const [cerrar, setCerrar] = useState(false)

  const p = Number(producido) || 0
  const s = Number(scrap) || 0
  const excede = p + s > estacion.cantidad_disponible + 1e-6

  const guardar = useMutation({
    mutationFn: () => api.post('/mes/planta/avance', {
      orden_id: orden.id, nodo_id: estacion.nodo_id, operario_id: operario.id,
      cantidad_producida: p, cantidad_scrap: s, turno,
      observaciones: notas || null, cerrar,
    }).then(r => r.data),
    onSuccess: (r: any) => { toast.success(r.mensaje ?? 'Avance registrado'); onGuardado() },
    onError: (e) => toast.error(mensajeDeError(e, 'No se pudo registrar el avance')),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 19, fontWeight: 800 }}>
        {estacion.nombre}
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontWeight: 400 }}>
          Orden {orden.numero} · {operario.nombre} · quedan{' '}
          {num(estacion.cantidad_disponible)} {unidad}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              label={`Producido (${unidad})`} value={producido} autoFocus
              onChange={(e) => setProducido(e.target.value)}
              type="number" fullWidth
              inputProps={{ min: 0, step: 'any',
                            style: { fontSize: 26, fontWeight: 800, textAlign: 'center' } }}
            />
            <TextField
              label="Scrap" value={scrap}
              onChange={(e) => setScrap(e.target.value)}
              type="number" fullWidth
              inputProps={{ min: 0, step: 'any',
                            style: { fontSize: 26, fontWeight: 800, textAlign: 'center' } }}
            />
          </Stack>

          {excede && (
            <Alert severity="warning" sx={{ fontSize: 14 }}>
              Solo hay {num(estacion.cantidad_disponible)} {unidad} disponibles en
              esta estación. Lo que produce aquí no puede superar lo que entregó
              la anterior.
            </Alert>
          )}

          <Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.75 }}>Turno</Typography>
            <ToggleButtonGroup exclusive value={turno} fullWidth
                               onChange={(_, v) => v && setTurno(v)}>
              {['MANANA', 'TARDE', 'NOCHE'].map(t => (
                <ToggleButton key={t} value={t} sx={{ py: 1.2, fontSize: 14 }}>
                  {t === 'MANANA' ? 'Mañana' : t === 'TARDE' ? 'Tarde' : 'Noche'}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <TextField label="Observaciones (opcional)" value={notas} multiline rows={2}
                     onChange={(e) => setNotas(e.target.value)} fullWidth />

          <Button
            variant={cerrar ? 'contained' : 'outlined'}
            color={cerrar ? 'success' : 'inherit'}
            onClick={() => setCerrar(!cerrar)}
            startIcon={<CheckCircle />}
            sx={{ py: 1.3, fontSize: 14.5 }}
          >
            {cerrar
              ? 'Se cerrará esta estación para la orden'
              : 'Cerrar la estación al guardar'}
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCerrar} size="large">Cancelar</Button>
        <Button
          variant="contained" size="large" sx={{ px: 4, py: 1.2, fontSize: 16 }}
          disabled={excede || guardar.isPending || (p <= 0 && s <= 0 && !cerrar)}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? 'Guardando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── La pantalla ─────────────────────────────────────────────────────────────

export default function MESTerminal() {
  const qc = useQueryClient()
  const [linea, setLinea] = useState<Linea | null>(null)
  const [orden, setOrden] = useState<OrdenPiso | null>(null)
  const [operario, setOperario] = useState<Operario | null>(null)
  const [reportando, setReportando] = useState<Estacion | null>(null)

  const { data: lineas = [] } = useQuery<Linea[]>({
    queryKey: ['mes-lineas'],
    queryFn: () => api.get('/mes/lineas').then((r: { data: unknown }) => listaDe<Linea>(r.data)),
  })

  const { data: ordenes = [], isLoading: cargandoOrdenes } = useQuery<OrdenPiso[]>({
    queryKey: ['mes-planta-ordenes', linea?.id],
    queryFn: () => api.get('/mes/planta/ordenes', { params: { linea_id: linea!.id } })
      .then((r: { data: unknown }) => listaDe<OrdenPiso>(r.data)),
    enabled: !!linea,
  })

  const { data: tablero, isLoading: cargandoTablero } = useQuery<Tablero>({
    queryKey: ['mes-planta-tablero', linea?.id, orden?.id],
    queryFn: () => api.get('/mes/planta/tablero',
      { params: { linea_id: linea!.id, orden_id: orden!.id } }).then(r => r.data),
    enabled: !!linea && !!orden && !!operario,
    // La línea la trabajan varios operarios a la vez: si esta terminal se queda
    // con la foto de hace media hora, el disponible que muestra es mentira.
    refetchInterval: 20_000,
  })

  const atras = () => {
    if (reportando) return setReportando(null)
    if (operario) return setOperario(null)
    if (orden) return setOrden(null)
    if (linea) return setLinea(null)
  }

  const unidad = tablero?.orden?.unidad_medida ?? orden?.unidad_medida ?? 'UN'

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          {(linea || orden || operario) && (
            <Button onClick={atras} startIcon={<ArrowBack />} size="large">Atrás</Button>
          )}
          <Factory sx={{ color: MES, fontSize: 30 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>
              Terminal de Planta
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {[linea?.nombre, orden?.numero, operario?.nombre]
                .filter(Boolean).join(' · ')
                || 'Reporte de avance por estación · ISO 9001 §8.5.1'}
            </Typography>
          </Box>
          {operario && (
            <Chip icon={<BadgeIcon />} label={`${operario.codigo} · ${operario.nombre}`}
                  sx={{ fontWeight: 700, height: 36, fontSize: 13.5 }} />
          )}
        </Stack>

        {!linea && (
          <Selector
            titulo="1. ¿En qué línea está trabajando?"
            items={lineas} etiqueta={(l) => l.nombre} sub={(l) => l.codigo}
            onPick={setLinea}
            vacio="No hay líneas configuradas. Créelas en «Plantas & Líneas»."
          />
        )}

        {linea && !orden && (
          cargandoOrdenes ? <CircularProgress /> : (
            <Selector
              titulo="2. ¿Qué orden va a trabajar?"
              items={ordenes}
              etiqueta={(o) => o.numero}
              sub={(o) => `${o.producto ?? ''} · ${num(o.cantidad_producida)} / ${num(o.cantidad_planificada)} ${o.unidad_medida}`}
              onPick={setOrden}
              vacio="No hay órdenes liberadas ni en ejecución para esta línea. Libere una orden desde «Órdenes de Producción»."
            />
          )
        )}

        {linea && orden && !operario && <Identificarse onListo={setOperario} />}

        {linea && orden && operario && (
          cargandoTablero ? <CircularProgress /> : tablero?.aviso ? (
            <Alert severity="warning" sx={{ fontSize: 15 }}>{tablero.aviso}</Alert>
          ) : (
            <>
              <Card sx={{ borderRadius: 3, mb: 3, bgcolor: alpha(MES, .05),
                          border: `1px solid ${alpha(MES, .25)}` }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                    {[
                      { t: 'Orden', v: tablero?.orden?.numero ?? '—', i: <Inventory2 /> },
                      { t: 'Planificado', v: `${num(tablero?.orden?.cantidad_planificada ?? 0)} ${unidad}`, i: <Straighten /> },
                      { t: 'Producido', v: `${num(tablero?.orden?.cantidad_producida ?? 0)} ${unidad}`, i: <CheckCircle /> },
                      { t: 'Scrap', v: `${num(tablero?.orden?.cantidad_scrap ?? 0)} ${unidad}`, i: <ReportProblem /> },
                      { t: 'Estaciones', v: String(tablero?.estaciones.length ?? 0), i: <TimelineIcon /> },
                    ].map((k, i) => (
                      <Box key={i}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{k.t}</Typography>
                        <Typography sx={{ fontSize: 20, fontWeight: 800,
                                          fontVariantNumeric: 'tabular-nums' }}>{k.v}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 1.5 }}>
                Las estaciones van en el orden en que el material las recorre. Cada
                una solo puede procesar lo que le entregó la anterior.
              </Typography>

              <Grid container spacing={2}>
                {tablero?.estaciones.map((e) => (
                  <Grid key={e.nodo_id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <TarjetaEstacion e={e} onReportar={() => setReportando(e)} />
                  </Grid>
                ))}
              </Grid>
            </>
          )
        )}

        {reportando && orden && operario && (
          <DialogoAvance
            estacion={reportando} orden={orden} operario={operario} unidad={unidad}
            onCerrar={() => setReportando(null)}
            onGuardado={() => {
              setReportando(null)
              qc.invalidateQueries({ queryKey: ['mes-planta-tablero'] })
              qc.invalidateQueries({ queryKey: ['mes-planta-ordenes'] })
              // La trazabilidad y las órdenes muestran lo mismo desde otra
              // pantalla: si no se invalidan, quedan con la cifra anterior.
              qc.invalidateQueries({ queryKey: ['mes-ordenes'] })
            }}
          />
        )}
      </Box>
    </Layout>
  )
}
