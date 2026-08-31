/**
 * El diseñador del esquema de una línea de producción.
 *
 * A la derecha están las máquinas y los materiales que ya existen en el
 * catálogo; se arrastran al lienzo de la izquierda y ahí se conectan en el
 * orden en que el material los recorre.
 *
 * POR QUÉ SIN LIBRERÍA DE DIAGRAMAS
 * Un lienzo de nodos se puede resolver con posiciones absolutas y una capa SVG
 * debajo para las flechas. Traer una librería de grafos entera —con su motor de
 * disposición, su minimapa y sus mil opciones— para dibujar veinte cajas
 * agregaría medio megabyte al paquete y una forma de hacer las cosas distinta a
 * la del resto de la aplicación. Lo que sí hace falta —arrastrar, conectar,
 * seleccionar— cabe en eventos de puntero.
 *
 * TODO SE ARRASTRA CON EL MISMO GESTO
 * Un solo manejador de `pointerdown` sirve para las tres cosas: sacar una pieza
 * del panel, mover un nodo del lienzo y tirar una conexión desde su borde. Se
 * distingue por dónde empezó el gesto. Repartirlos en tres mecanismos distintos
 * —arrastre nativo del navegador para el panel, punteros para el lienzo— haría
 * que el mismo movimiento se sintiera diferente según dónde empiece.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, MenuItem, Chip, Tooltip,
  IconButton, Divider, Alert, Tabs, Tab, InputAdornment, Switch,
  FormControlLabel, Skeleton,
} from '@mui/material'
import {
  Save, DeleteOutline, Search, PrecisionManufacturing, Inventory2, Settings,
  FactCheck, Inbox, Outbox, Timeline, CenterFocusStrong, Warning,
  Bolt, Close,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { PALETA, COLOR_MODULO } from '@/config/marca'

/* ── Tipos ─────────────────────────────────────────────────────────────────── */

export type TipoNodo = 'EQUIPO' | 'ENTRADA' | 'SALIDA' | 'INSPECCION' | 'BUFFER'
type TipoConexion = 'NORMAL' | 'RETRABAJO' | 'SCRAP' | 'ALTERNA'

interface Nodo {
  id: number
  tipo: TipoNodo
  equipo_id?: number | null
  producto_id?: number | null
  operacion_id?: number | null
  nombre?: string | null
  pos_x: number
  pos_y: number
  cantidad_por_unidad?: number | null
  unidad_medida?: string | null
  tiempo_ciclo_seg?: number | null
  es_cuello_botella?: boolean
  notas?: string | null
  etiqueta?: string | null
  equipo_codigo?: string | null
  producto_codigo?: string | null
  producto_tipo?: string | null
  operacion_nombre?: string | null
}

interface Conexion {
  id?: number
  origen_id: number
  destino_id: number
  tipo: TipoConexion
  etiqueta?: string | null
}

interface Resumen {
  nodos: number; equipos: number; entradas: number; salidas: number
  inspecciones: number; conexiones: number; retrabajos: number
  nodos_sueltos: string[]; sin_entrada: boolean; sin_salida: boolean
  ciclo_linea_seg?: number | null; cuello_botella?: string | null
}

interface Flujo {
  linea_id: number; linea_nombre?: string | null
  planta_nombre?: string | null
  nodos: Nodo[]; conexiones: Conexion[]; resumen: Resumen
}

interface Equipo { id: number; codigo: string; nombre: string; celda_id?: number | null }
interface Material { id: number; codigo: string; nombre: string; tipo: string; unidad_medida: string }
interface Operacion { id: number; codigo: string; nombre: string; tipo?: string | null }
interface Celda { id: number; codigo: string; nombre: string }

/* ── Medidas y estilo del lienzo ───────────────────────────────────────────── */

const ANCHO_NODO = 176
const ALTO_NODO = 66
const LIENZO_ANCHO = 2600
const LIENZO_ALTO = 1500

const ASPECTO: Record<TipoNodo, { color: string; icono: JSX.Element; titulo: string }> = {
  EQUIPO:     { color: COLOR_MODULO, icono: <PrecisionManufacturing sx={{ fontSize: 15 }} />, titulo: 'Máquina' },
  ENTRADA:    { color: '#0F766E', icono: <Inbox sx={{ fontSize: 15 }} />, titulo: 'Entra material' },
  SALIDA:     { color: '#7C3AED', icono: <Outbox sx={{ fontSize: 15 }} />, titulo: 'Sale producto' },
  INSPECCION: { color: '#D97706', icono: <FactCheck sx={{ fontSize: 15 }} />, titulo: 'Control de calidad' },
  BUFFER:     { color: '#64748B', icono: <Inventory2 sx={{ fontSize: 15 }} />, titulo: 'Acumulación' },
}

const COLOR_CONEXION: Record<TipoConexion, string> = {
  NORMAL: '#94A3B8', RETRABAJO: '#D97706', SCRAP: '#DC2626', ALTERNA: '#0EA5E9',
}

const TIPOS_CONEXION: { v: TipoConexion; l: string }[] = [
  { v: 'NORMAL', l: 'El material sigue su curso' },
  { v: 'RETRABAJO', l: 'Vuelve atrás a corregirse' },
  { v: 'SCRAP', l: 'Sale como desecho' },
  { v: 'ALTERNA', l: 'Ruta opcional' },
]

/** Ids de trabajo para lo que aún no se ha guardado. Negativos para que el
 *  servidor los distinga de los suyos sin necesidad de otra bandera. */
let contadorTemporal = -1
const nuevoIdTemporal = () => contadorTemporal--

/** La curva entre dos nodos: sale por el borde derecho y entra por el izquierdo. */
function curva(a: Nodo, b: Nodo): string {
  const x1 = a.pos_x + ANCHO_NODO
  const y1 = a.pos_y + ALTO_NODO / 2
  const x2 = b.pos_x
  const y2 = b.pos_y + ALTO_NODO / 2
  // Cuando el destino queda a la izquierda —un reproceso— la curva se abre
  // hacia afuera para que no quede escondida detrás de las cajas.
  const vuelve = x2 < x1
  const tiron = vuelve ? Math.max(90, (x1 - x2) / 2) : Math.max(50, (x2 - x1) / 2)
  return vuelve
    ? `M ${x1} ${y1} C ${x1 + tiron} ${y1 - 70}, ${x2 - tiron} ${y2 - 70}, ${x2} ${y2}`
    : `M ${x1} ${y1} C ${x1 + tiron} ${y1}, ${x2 - tiron} ${y2}, ${x2} ${y2}`
}

/* ── Una pieza del panel de la derecha ─────────────────────────────────────── */

interface PiezaProps {
  titulo: string
  detalle?: string | null
  color: string
  icono: JSX.Element
  usado?: boolean
  onTomar: (e: React.PointerEvent) => void
}

function Pieza({ titulo, detalle, color, icono, usado, onTomar }: PiezaProps) {
  return (
    <Box
      onPointerDown={onTomar}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.9,
        borderRadius: 2, border: `1px solid ${PALETA.niebla}`, mb: 0.75,
        cursor: 'grab', touchAction: 'none', userSelect: 'none',
        bgcolor: usado ? `${color}0F` : '#fff',
        transition: 'border-color .15s ease, transform .15s ease',
        '&:hover': { borderColor: color, transform: 'translateX(-2px)' },
        '&:active': { cursor: 'grabbing' },
      }}
    >
      <Box sx={{
        width: 26, height: 26, borderRadius: 1.5, flexShrink: 0,
        display: 'grid', placeItems: 'center', bgcolor: `${color}1A`, color,
      }}>{icono}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.25 }} noWrap>
          {titulo}
        </Typography>
        {detalle && (
          <Typography sx={{ fontSize: 10.5, color: PALETA.acero }} noWrap>{detalle}</Typography>
        )}
      </Box>
      {usado && <Chip label="en el esquema" size="small" sx={{
        height: 16, fontSize: 9, fontWeight: 700, bgcolor: `${color}1A`, color }} />}
    </Box>
  )
}

/* ── Una caja del lienzo ───────────────────────────────────────────────────── */

interface CajaProps {
  nodo: Nodo
  seleccionado: boolean
  conectando: boolean
  onMover: (e: React.PointerEvent, id: number) => void
  onSeleccionar: (id: number) => void
  onIniciarConexion: (e: React.PointerEvent, id: number) => void
  onTerminarConexion: (id: number) => void
}

function Caja({
  nodo, seleccionado, conectando, onMover, onSeleccionar,
  onIniciarConexion, onTerminarConexion,
}: CajaProps) {
  const aspecto = ASPECTO[nodo.tipo]
  return (
    <Box
      data-nodo={nodo.id}
      onPointerDown={e => { e.stopPropagation(); onSeleccionar(nodo.id); onMover(e, nodo.id) }}
      onPointerUp={() => { if (conectando) onTerminarConexion(nodo.id) }}
      sx={{
        position: 'absolute', left: nodo.pos_x, top: nodo.pos_y,
        width: ANCHO_NODO, height: ALTO_NODO, px: 1.1, py: 0.85,
        borderRadius: 2, bgcolor: '#fff', cursor: 'grab', touchAction: 'none',
        userSelect: 'none', zIndex: seleccionado ? 4 : 3,
        border: `2px solid ${seleccionado ? aspecto.color : `${aspecto.color}55`}`,
        boxShadow: seleccionado
          ? `0 8px 22px ${aspecto.color}44`
          : '0 2px 8px rgba(15,23,42,.08)',
        transition: 'box-shadow .15s ease, border-color .15s ease',
        '&:hover': { borderColor: aspecto.color },
        '&:active': { cursor: 'grabbing' },
      }}
    >
      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.3 }}>
        <Box sx={{ color: aspecto.color, display: 'flex' }}>{aspecto.icono}</Box>
        <Typography sx={{
          fontSize: 9, fontWeight: 800, letterSpacing: '.05em',
          color: aspecto.color, textTransform: 'uppercase',
        }}>
          {nodo.equipo_codigo || nodo.producto_codigo || aspecto.titulo}
        </Typography>
        {nodo.es_cuello_botella && (
          <Tooltip title="Marca el ritmo de la línea">
            <Bolt sx={{ fontSize: 13, color: '#DC2626', ml: 'auto' }} />
          </Tooltip>
        )}
      </Stack>
      <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }} noWrap>
        {nodo.etiqueta || nodo.nombre || '—'}
      </Typography>
      <Typography sx={{ fontSize: 10, color: PALETA.acero, lineHeight: 1.3 }} noWrap>
        {nodo.operacion_nombre
          || (nodo.cantidad_por_unidad != null
            ? `${nodo.cantidad_por_unidad} ${nodo.unidad_medida || ''} por unidad`
            : nodo.tiempo_ciclo_seg ? `${nodo.tiempo_ciclo_seg} s de ciclo` : ' ')}
      </Typography>

      {/* El tirador de salida: de acá arranca una conexión. */}
      <Tooltip title="Arrastre desde acá hasta la siguiente etapa" placement="right">
        <Box
          onPointerDown={e => { e.stopPropagation(); onIniciarConexion(e, nodo.id) }}
          sx={{
            position: 'absolute', right: -9, top: ALTO_NODO / 2 - 9,
            width: 18, height: 18, borderRadius: '50%', cursor: 'crosshair',
            bgcolor: '#fff', border: `2px solid ${aspecto.color}`, zIndex: 5,
            display: 'grid', placeItems: 'center', touchAction: 'none',
            '&:hover': { bgcolor: aspecto.color, transform: 'scale(1.2)' },
            transition: 'transform .12s ease, background-color .12s ease',
          }}
        />
      </Tooltip>
      {/* El de entrada es solo una marca: se suelta sobre la caja, no sobre él. */}
      <Box sx={{
        position: 'absolute', left: -5, top: ALTO_NODO / 2 - 5,
        width: 10, height: 10, borderRadius: '50%',
        bgcolor: `${aspecto.color}66`,
      }} />
    </Box>
  )
}

/* ── El diseñador ──────────────────────────────────────────────────────────── */

type Arrastre =
  | { que: 'nodo'; id: number; dx: number; dy: number }
  | { que: 'pieza'; plantilla: Omit<Nodo, 'id' | 'pos_x' | 'pos_y'> }
  | { que: 'conexion'; desde: number }
  | null

export function DisenadorFlujo({ lineaId }: { lineaId: number }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const lienzo = useRef<HTMLDivElement | null>(null)

  const [nodos, setNodos] = useState<Nodo[]>([])
  const [conexiones, setConexiones] = useState<Conexion[]>([])
  const [sucio, setSucio] = useState(false)
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [pestana, setPestana] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [tipoConexion, setTipoConexion] = useState<TipoConexion>('NORMAL')
  const [raton, setRaton] = useState<{ x: number; y: number } | null>(null)
  // El arrastre vive en una ref: cambia en cada píxel del movimiento y volver a
  // pintar todo el lienzo en cada uno lo haría ir a tirones.
  const arrastre = useRef<Arrastre>(null)

  const { data: flujo, isLoading } = useQuery<Flujo>({
    queryKey: ['mes-flujo', lineaId],
    queryFn: () => api.get(`/mes/lineas/${lineaId}/flujo`).then(r => r.data),
  })
  const { data: equipos = [] } = useQuery<Equipo[]>({
    queryKey: ['mes-equipos'], queryFn: () => api.get('/mes/equipos').then(r => r.data) })
  const { data: materiales = [] } = useQuery<Material[]>({
    queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data) })
  const { data: operaciones = [] } = useQuery<Operacion[]>({
    queryKey: ['mes-operaciones'], queryFn: () => api.get('/mes/operaciones').then(r => r.data) })
  const { data: celdas = [] } = useQuery<Celda[]>({
    queryKey: ['mes-celdas', lineaId],
    queryFn: () => api.get('/mes/celdas', { params: { linea_id: lineaId } }).then(r => r.data) })

  // El esquema guardado es el punto de partida; a partir de ahí se edita en
  // memoria hasta que alguien guarde.
  useEffect(() => {
    if (!flujo) return
    setNodos(flujo.nodos)
    setConexiones(flujo.conexiones)
    setSucio(false)
    setSeleccion(null)
  }, [flujo])

  const guardar = useMutation({
    mutationFn: () => api.put(`/mes/lineas/${lineaId}/flujo`, {
      nodos: nodos.map(n => ({
        id: n.id, tipo: n.tipo, equipo_id: n.equipo_id ?? null,
        producto_id: n.producto_id ?? null, operacion_id: n.operacion_id ?? null,
        nombre: n.nombre ?? null, pos_x: Math.round(n.pos_x), pos_y: Math.round(n.pos_y),
        cantidad_por_unidad: n.cantidad_por_unidad ?? null,
        unidad_medida: n.unidad_medida ?? null,
        tiempo_ciclo_seg: n.tiempo_ciclo_seg ?? null,
        es_cuello_botella: Boolean(n.es_cuello_botella),
        notas: n.notas ?? null,
      })),
      conexiones: conexiones.map(c => ({
        origen_id: c.origen_id, destino_id: c.destino_id,
        tipo: c.tipo, etiqueta: c.etiqueta ?? null,
      })),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Esquema guardado')
      qc.invalidateQueries({ queryKey: ['mes-flujo', lineaId] })
      qc.invalidateQueries({ queryKey: ['mes-tablero'] })
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || 'No se pudo guardar el esquema'),
  })

  /* ── El gesto ───────────────────────────────────────────────────────────── */

  const puntoEnLienzo = useCallback((e: { clientX: number; clientY: number }) => {
    const caja = lienzo.current?.getBoundingClientRect()
    if (!caja || !lienzo.current) return { x: 0, y: 0 }
    return {
      x: e.clientX - caja.left + lienzo.current.scrollLeft,
      y: e.clientY - caja.top + lienzo.current.scrollTop,
    }
  }, [])

  /** Fija el puntero al elemento donde empezó el gesto.
   *
   *  Sin esto, el arrastre se interrumpe en cuanto el puntero sale del panel:
   *  el panel tiene su propio desplazamiento, y al cruzar su borde el navegador
   *  cancela la secuencia y deja de mandar `pointermove`. La pieza se quedaba
   *  pegada al panel y no había forma de soltarla en el lienzo. Con la captura,
   *  todos los eventos siguen llegando hasta que se suelte el botón. */
  const capturar = (e: React.PointerEvent) => {
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch { /* da igual */ }
  }

  const tomarPieza = (plantilla: Omit<Nodo, 'id' | 'pos_x' | 'pos_y'>) =>
    (e: React.PointerEvent) => {
      e.preventDefault()
      capturar(e)
      arrastre.current = { que: 'pieza', plantilla }
      setRaton(puntoEnLienzo(e))
    }

  const moverNodo = (e: React.PointerEvent, id: number) => {
    const nodo = nodos.find(n => n.id === id)
    if (!nodo) return
    capturar(e)
    const p = puntoEnLienzo(e)
    arrastre.current = { que: 'nodo', id, dx: p.x - nodo.pos_x, dy: p.y - nodo.pos_y }
  }

  const iniciarConexion = (e: React.PointerEvent, desde: number) => {
    e.preventDefault()
    capturar(e)
    arrastre.current = { que: 'conexion', desde }
    setRaton(puntoEnLienzo(e))
  }

  const terminarConexion = (destino: number) => {
    const a = arrastre.current
    if (!a || a.que !== 'conexion' || a.desde === destino) return
    const repetida = conexiones.some(c => c.origen_id === a.desde && c.destino_id === destino)
    if (repetida) {
      toast('Esas dos etapas ya están conectadas', { icon: 'ℹ️' })
    } else {
      setConexiones(cs => [...cs, { origen_id: a.desde, destino_id: destino, tipo: tipoConexion }])
      setSucio(true)
    }
    arrastre.current = null
    setRaton(null)
  }

  /** Qué nodo hay bajo el puntero.
   *
   *  La unión no puede resolverse con un `pointerup` en el nodo de destino:
   *  mientras se arrastra, el puntero está capturado por el tirador de origen
   *  y todos los eventos van ahí: el destino nunca se entera de que le
   *  soltaron encima. Se resuelve por geometría, que es lo único que la
   *  captura no cambia. */
  const nodoBajoElPuntero = (e: { clientX: number; clientY: number }): number | null => {
    const bajo = document.elementFromPoint(e.clientX, e.clientY)
    const caja = bajo?.closest('[data-nodo]')
    const id = caja?.getAttribute('data-nodo')
    return id ? Number(id) : null
  }

  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const a = arrastre.current
      if (!a) return
      const p = puntoEnLienzo(e)
      if (a.que === 'nodo') {
        setNodos(ns => ns.map(n => n.id === a.id
          ? { ...n, pos_x: Math.max(0, p.x - a.dx), pos_y: Math.max(0, p.y - a.dy) }
          : n))
        setSucio(true)
      } else {
        setRaton(p)
      }
    }
    const soltar = (e: PointerEvent) => {
      const a = arrastre.current
      if (!a) return
      if (a.que === 'conexion') {
        const destino = nodoBajoElPuntero(e)
        if (destino != null) terminarConexion(destino)
      } else if (a.que === 'pieza') {
        // Solo cuenta si se soltó dentro del lienzo: soltar sobre el panel es
        // arrepentirse, no crear una caja en la esquina.
        const caja = lienzo.current?.getBoundingClientRect()
        const dentro = caja && e.clientX >= caja.left && e.clientX <= caja.right
          && e.clientY >= caja.top && e.clientY <= caja.bottom
        if (dentro) {
          const p = puntoEnLienzo(e)
          const id = nuevoIdTemporal()
          setNodos(ns => [...ns, {
            ...a.plantilla, id,
            pos_x: Math.max(0, p.x - ANCHO_NODO / 2),
            pos_y: Math.max(0, p.y - ALTO_NODO / 2),
          } as Nodo])
          setSeleccion(id)
          setSucio(true)
        }
      }
      arrastre.current = null
      setRaton(null)
    }
    // `pointercancel` lo dispara el navegador cuando se lleva el gesto —al
    // hacer scroll con el dedo, por ejemplo—. Si no se atiende, el arrastre
    // queda abierto para siempre y el siguiente clic suelta una caja donde
    // nadie la pidió.
    const cancelar = () => { arrastre.current = null; setRaton(null) }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', cancelar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', cancelar)
    }
    // Las dependencias son las que `soltar` lee de verdad. Con la lista vacía,
    // el manejador se quedaba con los valores del primer render: el tipo de
    // unión escogido no se tenía en cuenta y la comprobación de conexión
    // repetida miraba una lista que siempre estaba vacía. Volver a registrar
    // los oyentes en cada cambio es barato, y el arrastre sobrevive porque vive
    // en una ref, no en el estado.
  }, [puntoEnLienzo, tipoConexion, conexiones])

  /* ── Edición del nodo escogido ──────────────────────────────────────────── */

  const nodo = nodos.find(n => n.id === seleccion) || null

  const cambiar = (campo: keyof Nodo, valor: any) => {
    if (!nodo) return
    setNodos(ns => ns.map(n => n.id === nodo.id ? { ...n, [campo]: valor } : n))
    setSucio(true)
  }

  const borrarNodo = () => {
    if (!nodo) return
    setNodos(ns => ns.filter(n => n.id !== nodo.id))
    setConexiones(cs => cs.filter(c => c.origen_id !== nodo.id && c.destino_id !== nodo.id))
    setSeleccion(null)
    setSucio(true)
  }

  const borrarConexion = (i: number) => {
    setConexiones(cs => cs.filter((_, j) => j !== i))
    setSucio(true)
  }

  /* ── Lo que ofrece el panel ─────────────────────────────────────────────── */

  const usados = useMemo(() => ({
    equipos: new Set(nodos.map(n => n.equipo_id).filter(Boolean) as number[]),
    materiales: new Set(nodos.map(n => n.producto_id).filter(Boolean) as number[]),
  }), [nodos])

  const filtro = (t: string) => !busqueda || t.toLowerCase().includes(busqueda.toLowerCase())
  const celdasDeLinea = useMemo(() => new Set(celdas.map(c => c.id)), [celdas])

  // Las máquinas de esta línea van primero: son las que casi siempre se buscan.
  const equiposOrdenados = useMemo(() => {
    const propias = equipos.filter(e => e.celda_id && celdasDeLinea.has(e.celda_id))
    const otras = equipos.filter(e => !e.celda_id || !celdasDeLinea.has(e.celda_id))
    return [...propias, ...otras]
      .filter(e => filtro(`${e.codigo} ${e.nombre}`))
  }, [equipos, celdasDeLinea, busqueda])

  const entradas = materiales.filter(m =>
    ['MATERIA_PRIMA', 'EMPAQUE', 'SEMIELABORADO', 'HERRAMIENTA'].includes(m.tipo)
    && filtro(`${m.codigo} ${m.nombre}`))
  const salidas = materiales.filter(m =>
    ['PRODUCTO_TERMINADO', 'SEMIELABORADO', 'SUBPRODUCTO'].includes(m.tipo)
    && filtro(`${m.codigo} ${m.nombre}`))

  const porId = useMemo(() => {
    const m: Record<number, Nodo> = {}
    for (const n of nodos) m[n.id] = n
    return m
  }, [nodos])

  const nodoOrigen = arrastre.current?.que === 'conexion'
    ? porId[arrastre.current.desde] : null

  if (isLoading) return <Skeleton variant="rectangular" height={620} sx={{ borderRadius: 3 }} />

  const advertencias: string[] = []
  if (nodos.length && !nodos.some(n => n.tipo === 'ENTRADA'))
    advertencias.push('No hay ninguna entrada de material: falta decir con qué se produce.')
  if (nodos.length && !nodos.some(n => n.tipo === 'SALIDA'))
    advertencias.push('No hay salida de producto: falta decir qué entrega la línea.')
  const conectados = new Set(conexiones.flatMap(c => [c.origen_id, c.destino_id]))
  const sueltos = nodos.filter(n => !conectados.has(n.id))
  if (sueltos.length)
    advertencias.push(`${sueltos.length} etapa(s) sin conectar: ${sueltos
      .map(n => n.etiqueta || n.nombre || '—').join(', ')}.`)

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5} flexWrap="wrap" useFlexGap>
        <Timeline sx={{ color: COLOR_MODULO }} />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Esquema de {flujo?.linea_nombre || 'la línea'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Arrastre las piezas de la derecha al lienzo y una cada etapa con la
            siguiente desde el punto de su borde derecho
          </Typography>
        </Box>
        <TextField select size="small" label="Tipo de unión" value={tipoConexion}
          onChange={e => setTipoConexion(e.target.value as TipoConexion)}
          sx={{ width: 230 }}>
          {TIPOS_CONEXION.map(t => (
            <MenuItem key={t.v} value={t.v}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 14, height: 3, borderRadius: 2, bgcolor: COLOR_CONEXION[t.v] }} />
                <span>{t.l}</span>
              </Stack>
            </MenuItem>
          ))}
        </TextField>
        {sucio && <Chip label="sin guardar" size="small" color="warning"
          sx={{ height: 22, fontWeight: 700 }} />}
        <Button variant="contained" startIcon={<Save />} disabled={!sucio || guardar.isPending}
          onClick={() => guardar.mutate()} sx={{ textTransform: 'none' }}>
          Guardar esquema
        </Button>
      </Stack>

      {advertencias.length > 0 && (
        <Alert severity="info" icon={<Warning fontSize="small" />}
          sx={{ mb: 1.5, py: 0.4, fontSize: 12.5, borderRadius: 2 }}>
          {advertencias.join(' ')}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch',
        flexDirection: { xs: 'column-reverse', md: 'row' } }}>

        {/* ── El lienzo ─────────────────────────────────────────────────── */}
        <Card
          ref={lienzo}
          data-lienzo="1"
          onPointerDown={() => setSeleccion(null)}
          sx={{
            flex: 1, position: 'relative', overflow: 'auto', borderRadius: 3,
            height: 640, minWidth: 0,
            border: `1px solid ${PALETA.niebla}`,
            backgroundColor: '#FBFCFE',
            backgroundImage:
              'radial-gradient(circle, rgba(15,23,42,.10) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        >
          <Box sx={{ position: 'relative', width: LIENZO_ANCHO, height: LIENZO_ALTO }}>
            <svg width={LIENZO_ANCHO} height={LIENZO_ALTO}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <defs>
                {Object.entries(COLOR_CONEXION).map(([t, color]) => (
                  <marker key={t} id={`punta-${t}`} viewBox="0 0 10 10"
                    refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                  </marker>
                ))}
              </defs>
              {conexiones.map((c, i) => {
                const a = porId[c.origen_id]
                const b = porId[c.destino_id]
                if (!a || !b) return null
                return (
                  <g key={i}>
                    <path d={curva(a, b)} fill="none" stroke={COLOR_CONEXION[c.tipo]}
                      strokeWidth={2.2} markerEnd={`url(#punta-${c.tipo})`}
                      strokeDasharray={c.tipo === 'NORMAL' ? undefined : '7 5'} />
                    {c.etiqueta && (
                      <text
                        x={(a.pos_x + ANCHO_NODO + b.pos_x) / 2}
                        y={(a.pos_y + b.pos_y) / 2 + ALTO_NODO / 2 - 8}
                        textAnchor="middle" fontSize="10" fill={COLOR_CONEXION[c.tipo]}
                        fontWeight="700">{c.etiqueta}</text>
                    )}
                  </g>
                )
              })}
              {/* La línea que sigue al puntero mientras se tira una conexión. */}
              {nodoOrigen && raton && (
                <path
                  d={`M ${nodoOrigen.pos_x + ANCHO_NODO} ${nodoOrigen.pos_y + ALTO_NODO / 2}
                      L ${raton.x} ${raton.y}`}
                  stroke={COLOR_CONEXION[tipoConexion]} strokeWidth={2}
                  strokeDasharray="6 4" fill="none" />
              )}
            </svg>

            {nodos.map(n => (
              <Caja key={n.id} nodo={n} seleccionado={seleccion === n.id}
                conectando={arrastre.current?.que === 'conexion'}
                onMover={moverNodo} onSeleccionar={setSeleccion}
                onIniciarConexion={iniciarConexion} onTerminarConexion={terminarConexion} />
            ))}

            {nodos.length === 0 && (
              <Box sx={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                pointerEvents: 'none', maxWidth: 900, maxHeight: 560,
              }}>
                <Box sx={{ textAlign: 'center', opacity: 0.65 }}>
                  <CenterFocusStrong sx={{ fontSize: 40, color: PALETA.acero }} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    El lienzo está vacío. Arrastre acá una entrada de material y las
                    máquinas por las que pasa, en el orden en que lo recorre.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Card>

        {/* ── El panel de la derecha ────────────────────────────────────── */}
        <Card sx={{
          width: { xs: '100%', md: 320 }, flexShrink: 0, borderRadius: 3,
          border: `1px solid ${PALETA.niebla}`, height: 640,
          display: 'flex', flexDirection: 'column',
        }}>
          {nodo ? (
            <Box sx={{ p: 1.5, overflow: 'auto' }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Box sx={{ color: ASPECTO[nodo.tipo].color, display: 'flex' }}>
                  {ASPECTO[nodo.tipo].icono}
                </Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, flex: 1 }}>
                  {ASPECTO[nodo.tipo].titulo}
                </Typography>
                <IconButton size="small" onClick={() => setSeleccion(null)}>
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
              <Stack spacing={1.5}>
                <TextField size="small" label="Nombre en el esquema" fullWidth
                  value={nodo.nombre ?? ''}
                  onChange={e => cambiar('nombre', e.target.value || null)}
                  helperText="Para distinguir dos máquinas iguales" />

                {nodo.tipo === 'EQUIPO' && (
                  <>
                    <TextField select size="small" label="Máquina" fullWidth
                      value={nodo.equipo_id ?? ''}
                      onChange={e => cambiar('equipo_id', Number(e.target.value))}>
                      {equipos.map(x => (
                        <MenuItem key={x.id} value={x.id}>{x.codigo} · {x.nombre}</MenuItem>
                      ))}
                    </TextField>
                    {/* Las operaciones no se inventan acá: son las de la planta,
                        y se dan de alta en la configuración del módulo. Si la
                        lista está vacía, el desplegable no puede quedarse mudo:
                        hay que decir dónde se llenan. */}
                    <TextField select size="small" label="Qué se hace acá" fullWidth
                      value={nodo.operacion_id ?? ''}
                      disabled={operaciones.length === 0}
                      helperText={operaciones.length === 0
                        ? 'No hay operaciones. Se crean en Configuración · Operaciones.'
                        : undefined}
                      onChange={e => cambiar('operacion_id',
                        e.target.value === '' ? null : Number(e.target.value))}>
                      <MenuItem value="">Sin especificar</MenuItem>
                      {operaciones.map(x => (
                        <MenuItem key={x.id} value={x.id}>
                          {x.nombre}{x.tipo ? ` · ${x.tipo}` : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                    {operaciones.length === 0 && (
                      <Button size="small" startIcon={<Settings sx={{ fontSize: 15 }} />}
                        onClick={() => navigate('/mes/config?tab=operaciones')}
                        sx={{ textTransform: 'none', alignSelf: 'flex-start', mt: -1 }}>
                        Ir a crear operaciones
                      </Button>
                    )}
                    <TextField size="small" type="number" label="Tiempo de ciclo (s)" fullWidth
                      value={nodo.tiempo_ciclo_seg ?? ''}
                      onChange={e => cambiar('tiempo_ciclo_seg',
                        e.target.value === '' ? null : Number(e.target.value))}
                      helperText="La etapa más lenta marca el ritmo de la línea" />
                    <FormControlLabel
                      control={<Switch size="small" checked={Boolean(nodo.es_cuello_botella)}
                        onChange={e => cambiar('es_cuello_botella', e.target.checked)} />}
                      label={<Typography sx={{ fontSize: 12.5 }}>Es el cuello de botella</Typography>} />
                  </>
                )}

                {(nodo.tipo === 'ENTRADA' || nodo.tipo === 'SALIDA') && (
                  <>
                    <TextField select size="small" fullWidth
                      label={nodo.tipo === 'ENTRADA' ? 'Material que entra' : 'Producto que sale'}
                      value={nodo.producto_id ?? ''}
                      onChange={e => cambiar('producto_id', Number(e.target.value))}>
                      {(nodo.tipo === 'ENTRADA' ? entradas : salidas).map(x => (
                        <MenuItem key={x.id} value={x.id}>{x.codigo} · {x.nombre}</MenuItem>
                      ))}
                    </TextField>
                    {nodo.tipo === 'ENTRADA' && (
                      <TextField size="small" type="number" fullWidth
                        label="Cantidad por unidad producida"
                        value={nodo.cantidad_por_unidad ?? ''}
                        onChange={e => cambiar('cantidad_por_unidad',
                          e.target.value === '' ? null : Number(e.target.value))}
                        InputProps={{ endAdornment: (
                          <InputAdornment position="end">
                            {nodo.unidad_medida || ''}
                          </InputAdornment>) }} />
                    )}
                  </>
                )}

                <TextField size="small" label="Notas" fullWidth multiline rows={2}
                  value={nodo.notas ?? ''}
                  onChange={e => cambiar('notas', e.target.value || null)} />

                <Divider />
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: PALETA.grafito }}>
                  UNIONES DE ESTA ETAPA
                </Typography>
                {conexiones.map((c, i) => {
                  if (c.origen_id !== nodo.id && c.destino_id !== nodo.id) return null
                  const otro = porId[c.origen_id === nodo.id ? c.destino_id : c.origen_id]
                  const sale = c.origen_id === nodo.id
                  return (
                    <Stack key={i} direction="row" alignItems="center" spacing={0.75}>
                      <Box sx={{ width: 12, height: 3, borderRadius: 2,
                        bgcolor: COLOR_CONEXION[c.tipo] }} />
                      <Typography sx={{ fontSize: 11.5, flex: 1 }} noWrap>
                        {sale ? '→ ' : '← '}{otro?.etiqueta || otro?.nombre || '—'}
                      </Typography>
                      <IconButton size="small" onClick={() => borrarConexion(i)}>
                        <DeleteOutline sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Stack>
                  )
                })}
                {!conexiones.some(c => c.origen_id === nodo.id || c.destino_id === nodo.id) && (
                  <Typography sx={{ fontSize: 11.5, color: PALETA.acero }}>
                    Todavía no está unida a ninguna otra etapa.
                  </Typography>
                )}

                <Button size="small" color="error" startIcon={<DeleteOutline />}
                  onClick={borrarNodo} sx={{ textTransform: 'none', mt: 1 }}>
                  Quitar del esquema
                </Button>
              </Stack>
            </Box>
          ) : (
            <>
              <Tabs value={pestana} onChange={(_, v) => setPestana(v)} variant="fullWidth"
                sx={{ minHeight: 40, borderBottom: `1px solid ${PALETA.niebla}`,
                  '& .MuiTab-root': { minHeight: 40, fontSize: 12, textTransform: 'none' } }}>
                <Tab label="Máquinas" />
                <Tab label="Materiales" />
                <Tab label="Puntos" />
              </Tabs>
              <Box sx={{ p: 1.25, pb: 0 }}>
                <TextField size="small" fullWidth placeholder="Buscar…" value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  InputProps={{ startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 16 }} />
                    </InputAdornment>) }} />
              </Box>
              <Box sx={{ p: 1.25, overflow: 'auto', flex: 1 }}>
                {pestana === 0 && (
                  equiposOrdenados.length === 0
                    ? <Typography sx={{ fontSize: 12, color: PALETA.acero, p: 1 }}>
                        No hay máquinas. Se dan de alta en la configuración del módulo.
                      </Typography>
                    : equiposOrdenados.map(e => (
                        <Pieza key={e.id} titulo={e.nombre} detalle={e.codigo}
                          color={ASPECTO.EQUIPO.color} icono={ASPECTO.EQUIPO.icono}
                          usado={usados.equipos.has(e.id)}
                          onTomar={tomarPieza({ tipo: 'EQUIPO', equipo_id: e.id,
                            etiqueta: e.nombre, equipo_codigo: e.codigo })} />
                      ))
                )}
                {pestana === 1 && (
                  <>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, mb: 0.5,
                      color: ASPECTO.ENTRADA.color, letterSpacing: '.06em' }}>
                      ENTRA AL PROCESO
                    </Typography>
                    {entradas.map(m => (
                      <Pieza key={`in-${m.id}`} titulo={m.nombre}
                        detalle={`${m.codigo} · ${m.unidad_medida}`}
                        color={ASPECTO.ENTRADA.color} icono={ASPECTO.ENTRADA.icono}
                        usado={usados.materiales.has(m.id)}
                        onTomar={tomarPieza({ tipo: 'ENTRADA', producto_id: m.id,
                          etiqueta: m.nombre, producto_codigo: m.codigo,
                          unidad_medida: m.unidad_medida })} />
                    ))}
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, mt: 1.5, mb: 0.5,
                      color: ASPECTO.SALIDA.color, letterSpacing: '.06em' }}>
                      SALE DEL PROCESO
                    </Typography>
                    {salidas.map(m => (
                      <Pieza key={`out-${m.id}`} titulo={m.nombre}
                        detalle={`${m.codigo} · ${m.unidad_medida}`}
                        color={ASPECTO.SALIDA.color} icono={ASPECTO.SALIDA.icono}
                        usado={usados.materiales.has(m.id)}
                        onTomar={tomarPieza({ tipo: 'SALIDA', producto_id: m.id,
                          etiqueta: m.nombre, producto_codigo: m.codigo,
                          unidad_medida: m.unidad_medida })} />
                    ))}
                    {entradas.length === 0 && salidas.length === 0 && (
                      <Typography sx={{ fontSize: 12, color: PALETA.acero, p: 1 }}>
                        No hay materiales en el catálogo. Se configuran en
                        Configuración · Materiales.
                      </Typography>
                    )}
                  </>
                )}
                {pestana === 2 && (
                  <>
                    <Pieza titulo="Control de calidad"
                      detalle="Un punto donde se inspecciona"
                      color={ASPECTO.INSPECCION.color} icono={ASPECTO.INSPECCION.icono}
                      onTomar={tomarPieza({ tipo: 'INSPECCION',
                        nombre: 'Control de calidad', etiqueta: 'Control de calidad' })} />
                    <Pieza titulo="Acumulación"
                      detalle="Material esperando entre dos etapas"
                      color={ASPECTO.BUFFER.color} icono={ASPECTO.BUFFER.icono}
                      onTomar={tomarPieza({ tipo: 'BUFFER',
                        nombre: 'Acumulación', etiqueta: 'Acumulación' })} />
                  </>
                )}
              </Box>
              {flujo?.resumen && nodos.length > 0 && (
                <Box sx={{ p: 1.25, borderTop: `1px solid ${PALETA.niebla}`,
                  bgcolor: '#F8FAFC' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, mb: 0.5,
                    color: PALETA.grafito, letterSpacing: '.06em' }}>
                    LO GUARDADO
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: PALETA.acero }}>
                    {flujo.resumen.equipos} máquinas · {flujo.resumen.entradas} entradas ·
                    {' '}{flujo.resumen.salidas} salidas · {flujo.resumen.conexiones} uniones
                  </Typography>
                  {flujo.resumen.ciclo_linea_seg != null && (
                    <Typography sx={{ fontSize: 11.5, color: PALETA.acero, mt: 0.4 }}>
                      Ciclo de la línea: <b>{flujo.resumen.ciclo_linea_seg}s</b>
                      {flujo.resumen.cuello_botella
                        ? `, lo marca ${flujo.resumen.cuello_botella}` : ''}
                    </Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </Card>
      </Box>
    </Box>
  )
}
