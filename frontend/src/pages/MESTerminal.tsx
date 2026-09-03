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
  PauseCircle, PlayCircleOutline,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api, sinCerrarSesion } from '@/api/client'
import { listaDe } from '@/utils/listaApi'
import { mensajeDeError } from '@/utils/errorApi'
import { COLOR_MODULO } from '@/config/marca'
import { EsquemaLinea, NodoEsquema, ConexionEsquema } from '@/components/mes/EsquemaLinea'

const MES = COLOR_MODULO

interface Linea { id: number; codigo: string; nombre: string }
interface OrdenPiso {
  id: number; numero: string; estado: string; linea_id: number | null
  producto: string | null
  cantidad_planificada: number; cantidad_producida: number; unidad_medida: string
}
interface Operario {
  id: number; codigo: string; nombre: string; cargo: string | null
  usuario?: string | null; requiere_pin?: boolean
}

// Las causas de parada que de verdad ocurren en una planta. Se ofrecen como
// botones y no como texto libre porque el operario reporta de pie y con prisa:
// escrito a mano, la misma causa entra de ocho formas distintas y después no se
// puede agrupar para saber qué está deteniendo la línea.
const CAUSAS: { tipo: string; causa: string }[] = [
  { tipo: 'MANTENIMIENTO', causa: 'Falla de la máquina' },
  { tipo: 'MATERIAL', causa: 'Falta de material' },
  { tipo: 'CALIDAD', causa: 'Problema de calidad' },
  { tipo: 'SETUP', causa: 'Cambio de referencia o alistamiento' },
  { tipo: 'NO_PLANEADA', causa: 'Falta de personal' },
  { tipo: 'NO_PLANEADA', causa: 'Falla eléctrica o de servicios' },
  { tipo: 'PLANEADA', causa: 'Parada programada' },
]
interface Estacion {
  posicion: number; nodo_id: number; tipo: string; nombre: string
  operacion: string | null; equipo: string | null
  es_cuello_botella: boolean
  pos_x: number; pos_y: number
  cantidad_entrante: number; cantidad_producida: number
  cantidad_scrap: number; cantidad_disponible: number
  estado: string; puede_reportar: boolean
  observaciones: string | null
  parada_abierta: {
    id: number; tipo: string; causa: string; fecha_inicio: string
  } | null
}

interface Operario2 { requiere_pin?: boolean; usuario?: string | null }
interface Tablero {
  linea: Linea
  conexiones: ConexionEsquema[]
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
  const [pin, setPin] = useState('')
  const [pidePin, setPidePin] = useState(false)

  const identificar = useMutation({
    // `sinCerrarSesion`: un PIN equivocado no puede sacar de la aplicación a
    // quien está en la terminal. Esa era la conducta antes y dejaba al operario
    // en el login sin entender qué pasó.
    mutationFn: (datos: { codigo: string; pin?: string }) =>
      api.post('/mes/planta/identificar', datos, sinCerrarSesion).then(r => r.data),
    onSuccess: (o: Operario & { requiere_pin?: boolean }) => {
      // El servidor responde «necesito el PIN» sin identificar a nadie todavía.
      // Es el segundo paso de la conversación, no un error.
      if (o.requiere_pin && !o.id) {
        setPidePin(true)
        setPin('')
        toast(`${o.nombre}: escriba su PIN`)
        return
      }
      toast.success(`Bienvenido, ${o.nombre}`)
      onListo(o)
    },
    onError: (e: any) => {
      if (e?.response?.status === 403) {
        setPidePin(true)
        setPin('')
      }
      toast.error(mensajeDeError(e, 'No se pudo identificar el operario'))
    },
  })

  const entrar = () => {
    if (!codigo.trim()) return
    identificar.mutate({ codigo: codigo.trim(), pin: pin.trim() || undefined })
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', py: 4 }}>
      <BadgeIcon sx={{ fontSize: 56, color: MES, mb: 1 }} />
      <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 0.5 }}>
        ¿Quién va a reportar?
      </Typography>
      <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 3 }}>
        Su usuario de la plataforma, su código de operario o su cédula.
        Cada avance queda firmado con su cuenta.
      </Typography>
      <TextField
        autoFocus fullWidth value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') entrar() }}
        placeholder="jperez  ·  OP-001  ·  1020304050"
        inputProps={{ style: { fontSize: 26, textAlign: 'center', fontWeight: 800,
                               letterSpacing: 1, padding: '18px 0' } }}
      />
      {pidePin && (
        <TextField
          fullWidth value={pin} type="password" sx={{ mt: 2 }}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') entrar() }}
          label="PIN de terminal"
          inputProps={{ inputMode: 'numeric', maxLength: 8,
                        style: { fontSize: 28, textAlign: 'center',
                                 fontWeight: 800, letterSpacing: 8 } }}
        />
      )}
      <Button
        fullWidth variant="contained" size="large" sx={{ mt: 2.5, py: 1.8, fontSize: 17 }}
        disabled={!codigo.trim() || identificar.isPending}
        onClick={entrar}
      >
        {identificar.isPending ? 'Verificando…' : 'Entrar'}
      </Button>
    </Box>
  )
}

// ─── Reportar una avería ─────────────────────────────────────────────────────

function DialogoParada({ estacion, orden, operario, onCerrar, onHecho }: {
  estacion: Estacion
  orden: { id: number; numero: string }
  operario: Operario
  onCerrar: () => void
  onHecho: () => void
}) {
  const [elegida, setElegida] = useState<{ tipo: string; causa: string } | null>(null)
  const [detalle, setDetalle] = useState('')

  const abrir = useMutation({
    mutationFn: () => api.post('/mes/planta/parada', {
      orden_id: orden.id, nodo_id: estacion.nodo_id, operario_id: operario.id,
      tipo: elegida!.tipo, causa: elegida!.causa,
      descripcion: detalle || null,
    }).then(r => r.data),
    onSuccess: (r: any) => { toast.success(r.mensaje ?? 'Parada registrada'); onHecho() },
    onError: (e) => toast.error(mensajeDeError(e, 'No se pudo registrar la parada')),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 19, fontWeight: 800 }}>
        ¿Por qué se detuvo {estacion.nombre}?
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontWeight: 400 }}>
          Orden {orden.numero} · el tiempo empieza a contar ahora
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.25} sx={{ pt: 1 }}>
          {CAUSAS.map((c) => (
            <Button
              key={c.causa}
              variant={elegida?.causa === c.causa ? 'contained' : 'outlined'}
              color={elegida?.causa === c.causa ? 'warning' : 'inherit'}
              onClick={() => setElegida(c)}
              sx={{ py: 1.6, fontSize: 15.5, justifyContent: 'flex-start' }}
            >
              {c.causa}
            </Button>
          ))}
          <TextField label="Detalle (opcional)" value={detalle} multiline rows={2}
                     onChange={(e) => setDetalle(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCerrar} size="large">Cancelar</Button>
        <Button variant="contained" color="warning" size="large"
                sx={{ px: 4, py: 1.2, fontSize: 16 }}
                disabled={!elegida || abrir.isPending}
                onClick={() => abrir.mutate()}>
          {abrir.isPending ? 'Registrando…' : 'Registrar parada'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Qué se puede hacer en la estación elegida ───────────────────────────────

function AccionesEstacion({ estacion, unidad, onReportar, onParar, onReanudar }: {
  estacion: Estacion
  unidad: string
  onReportar: () => void
  onParar: () => void
  onReanudar: () => void
}) {
  const parada = estacion.parada_abierta
  return (
    <Card sx={{ borderRadius: 3, mb: 2.5,
                border: `2px solid ${parada ? '#D97706' : alpha(MES, .4)}`,
                bgcolor: parada ? '#FFFBEB' : '#fff' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap"
               useFlexGap>
          <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
              {estacion.posicion}. {estacion.nombre}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
              {parada
                ? `Detenida por «${parada.causa}» desde las ${
                    new Date(parada.fecha_inicio).toLocaleTimeString('es-CO',
                      { hour: '2-digit', minute: '2-digit' })}`
                : estacion.estado === 'COMPLETADA'
                ? 'Estación cerrada para esta orden'
                : `Puede procesar hasta ${num(estacion.cantidad_disponible)} ${unidad}`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25}>
            {parada ? (
              <Button variant="contained" color="success" size="large"
                      startIcon={<PlayCircleOutline />} onClick={onReanudar}
                      sx={{ py: 1.3, px: 3, fontSize: 15.5 }}>
                Reanudar
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large" startIcon={<PlayArrow />}
                        disabled={!estacion.puede_reportar} onClick={onReportar}
                        sx={{ py: 1.3, px: 3, fontSize: 15.5 }}>
                  Reportar avance
                </Button>
                <Button variant="outlined" color="warning" size="large"
                        startIcon={<PauseCircle />} onClick={onParar}
                        disabled={estacion.estado === 'COMPLETADA'}
                        sx={{ py: 1.3, px: 2.5, fontSize: 15.5 }}>
                  Reportar avería
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Paso 4: la línea y sus estaciones ───────────────────────────────────────

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
  const [parando, setParando] = useState<Estacion | null>(null)
  // Cuál estación tiene el foco. El operario pulsa una en el esquema y las
  // acciones aparecen arriba, siempre en el mismo sitio: buscar el botón dentro
  // del dibujo obliga a cazarlo con la vista cada vez.
  const [elegida, setElegida] = useState<number | null>(null)

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

  const reanudar = useMutation({
    mutationFn: (paradaId: number) =>
      api.put(`/mes/planta/parada/${paradaId}/cerrar`, {}).then(r => r.data),
    onSuccess: (r: any) => {
      toast.success(r.mensaje ?? 'Parada cerrada')
      qc.invalidateQueries({ queryKey: ['mes-planta-tablero'] })
    },
    onError: (e) => toast.error(mensajeDeError(e, 'No se pudo cerrar la parada')),
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

              {(() => {
                const estaciones = tablero?.estaciones ?? []
                const foco = estaciones.find(e => e.nodo_id === elegida) ?? null
                return (
                  <>
                    {foco && (
                      <AccionesEstacion
                        estacion={foco} unidad={unidad}
                        onReportar={() => setReportando(foco)}
                        onParar={() => setParando(foco)}
                        onReanudar={() => foco.parada_abierta
                          && reanudar.mutate(foco.parada_abierta.id)}
                      />
                    )}

                    <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 1.5 }}>
                      Este es el esquema de la línea tal como está configurado.
                      Pulse la estación donde está trabajando para reportar su
                      avance o una avería.
                    </Typography>

                    <EsquemaLinea
                      nodos={estaciones as unknown as NodoEsquema[]}
                      conexiones={tablero?.conexiones ?? []}
                      unidad={unidad}
                      seleccionado={elegida}
                      onEstacion={(n) => setElegida(n.nodo_id)}
                    />
                  </>
                )
              })()}
            </>
          )
        )}

        {parando && orden && operario && (
          <DialogoParada
            estacion={parando} orden={orden} operario={operario}
            onCerrar={() => setParando(null)}
            onHecho={() => {
              setParando(null)
              qc.invalidateQueries({ queryKey: ['mes-planta-tablero'] })
            }}
          />
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
