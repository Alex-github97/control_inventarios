/**
 * WMS · Mapa de la bodega
 *
 * Fotos reales de cada estantería en blanco y negro, con cada celda pintada
 * según lo ocupada que está, y el plano de la bodega para ir de una a otra.
 *
 * La cuadrícula se proyecta sobre la foto con una homografía a partir de las
 * cuatro esquinas que se marcan con el ratón: así respeta la perspectiva de la
 * foto (la estantería se ve más chica al fondo) y las celdas caen sobre los
 * huecos reales.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Paper, Typography, TextField, MenuItem, Button, Chip, Stack, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, Tooltip, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Map as MapaIcon, AddPhotoAlternate, Search, Straighten, AutoFixHigh, CropFree } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { Encabezado, errorApi } from '@/components/comun/Registro'
import { apiClient as api } from '@/api/client'
import { wms, num } from '@/api/wmsTrazable'
import { COLOR_MODULO } from '@/config/marca'

const COLOR = COLOR_MODULO
type Punto = [number, number]
const ESTADOS: Record<string, { color: string; texto: string }> = {
  VACIA: { color: 'transparent', texto: 'Vacía' }, OCUPADA: { color: '#22C55E', texto: 'Ocupada' },
  CASI_LLENA: { color: '#F59E0B', texto: 'Casi llena (> 80 %)' }, LLENA: { color: '#EF4444', texto: 'Llena (> 95 %)' },
  BLOQUEADA: { color: '#A855F7', texto: 'Bloqueada' }, SIN_ASIGNAR: { color: 'transparent', texto: 'Sin ubicación asignada' },
}

/** Homografía del cuadrado unitario al cuadrilátero [arriba-izq, arriba-der, abajo-der, abajo-izq]. */
function homografia(q: Punto[]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  let g = 0, h = 0
  if (Math.abs(dx3) > 1e-12 || Math.abs(dy3) > 1e-12) {
    const det = dx1 * dy2 - dx2 * dy1
    g = (dx3 * dy2 - dx2 * dy3) / det
    h = (dx1 * dy3 - dx3 * dy1) / det
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0
  return (u: number, v: number): Punto => {
    const w = g * u + h * v + 1
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]
  }
}

function celdaPoligono(H: (u: number, v: number) => Punto, fila: number, col: number, filas: number, cols: number) {
  const u0 = col / cols, u1 = (col + 1) / cols, v0 = fila / filas, v1 = (fila + 1) / filas
  return [H(u0, v0), H(u1, v0), H(u1, v1), H(u0, v1)].map(p => p.join(',')).join(' ')
}

/** La imagen se pide con la sesión (no está en una carpeta pública) y se muestra como blob. */
function useImagen(ruta?: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!ruta) { setUrl(null); return }
    let vivo = true, creado: string | null = null
    api.get(ruta, { responseType: 'blob' }).then(r => { if (vivo) { creado = URL.createObjectURL(r.data); setUrl(creado) } })
    return () => { vivo = false; if (creado) URL.revokeObjectURL(creado) }
  }, [ruta])
  return url
}

function puntoDe(e: React.MouseEvent, el: HTMLElement): Punto {
  const r = el.getBoundingClientRect()
  return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
}

function VistaFoto({ fotoId, almacen, productoId, onCalibrada }: { fotoId: number; almacen: number; productoId?: number; onCalibrada: () => void }) {
  const qc = useQueryClient()
  const est = useQuery({ queryKey: ['mapa-estado', fotoId, productoId], queryFn: () => api.get(`/wms/mapa/fotos/${fotoId}/estado`, { params: { producto_id: productoId } }).then(r => r.data) })
  const url = useImagen(`/wms/mapa/fotos/${fotoId}/imagen`)
  const ubicaciones = useQuery({ queryKey: ['mapa-ubic', almacen], queryFn: () => api.get('/wms/ubicaciones/').then(r => r.data) })
  const caja = useRef<HTMLDivElement>(null)
  const [modo, setModo] = useState<'ver' | 'esquinas'>('ver')
  const [puntos, setPuntos] = useState<Punto[]>([])
  const [grilla, setGrilla] = useState({ filas: '', columnas: '', pasillo: '', estanteria: '' })
  const [celda, setCelda] = useState<any | null>(null)
  const [asignar, setAsignar] = useState<any | null>(null)
  const f = est.data?.foto
  useEffect(() => { if (f) setGrilla({ filas: String(f.filas ?? ''), columnas: String(f.columnas ?? ''), pasillo: f.pasillo ?? '', estanteria: f.estanteria ?? '' }) }, [f?.id, f?.filas, f?.columnas])
  const esquinas: Punto[] | null = modo === 'esquinas' ? (puntos.length === 4 ? puntos : null) : f?.esquinas ?? null
  const H = useMemo(() => esquinas ? homografia(esquinas) : null, [esquinas])
  const filas = Number(grilla.filas) || f?.filas || 0, cols = Number(grilla.columnas) || f?.columnas || 0
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['mapa-estado'] }); qc.invalidateQueries({ queryKey: ['mapa-fotos'] }); onCalibrada() }

  const guardarCalibracion = async () => {
    try {
      await api.put(`/wms/mapa/fotos/${fotoId}`, { esquinas: puntos.length === 4 ? puntos : f.esquinas, filas: Number(grilla.filas), columnas: Number(grilla.columnas),
        pasillo: grilla.pasillo || null, estanteria: grilla.estanteria || null })
      setModo('ver'); setPuntos([]); toast.success('Cuadrícula guardada'); refrescar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  const autoasignar = async () => {
    try { const r = await api.post(`/wms/mapa/fotos/${fotoId}/autoasignar`, { pasillo: grilla.pasillo || undefined, estanteria: grilla.estanteria || undefined }).then(r => r.data)
      toast.success(`${r.asignadas} de ${r.celdas} celdas asignadas${r.ubicaciones_fuera ? ` (${r.ubicaciones_fuera} ubicaciones no caben en la cuadrícula)` : ''}`); refrescar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  const guardarCelda = async () => {
    try { await api.put(`/wms/mapa/fotos/${fotoId}/celdas`, [{ fila: celda.fila, columna: celda.columna, ubicacion_id: asignar?.id ?? null }])
      setCelda(null); refrescar() } catch (e) { toast.error(errorApi(e)) }
  }
  if (!est.data || !url) return <LinearProgress />
  const resumen = est.data.resumen as Record<string, number>
  return (
    <Box>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" mb={1.5}>
        <Typography fontWeight={800} fontSize={17}>{f.nombre}</Typography>
        {Object.entries(resumen).map(([k, v]) => <Chip key={k} size="small" label={`${ESTADOS[k]?.texto ?? k}: ${v}`}
          sx={{ bgcolor: ESTADOS[k]?.color !== 'transparent' ? ESTADOS[k]?.color : undefined, color: ESTADOS[k]?.color !== 'transparent' ? '#fff' : undefined }} />)}
        <Box flex={1} />
        {modo === 'ver' ? <Button size="small" startIcon={<CropFree />} onClick={() => { setModo('esquinas'); setPuntos([]) }}>{f.calibrada ? 'Recalibrar' : 'Calibrar cuadrícula'}</Button>
          : <Button size="small" color="inherit" onClick={() => { setModo('ver'); setPuntos([]) }}>Cancelar calibración</Button>}
      </Stack>
      {modo === 'esquinas' && <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
        <Typography fontSize={13} mb={1}>
          Haga clic en las 4 esquinas de la cara de la estantería, en este orden: <b>arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda</b>
          {' '}({puntos.length}/4). Luego diga cuántos niveles (filas) y posiciones (columnas) tiene.
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <TextField size="small" type="number" label="Niveles (filas)" value={grilla.filas} onChange={e => setGrilla({ ...grilla, filas: e.target.value })} sx={{ width: 130 }} />
          <TextField size="small" type="number" label="Posiciones (columnas)" value={grilla.columnas} onChange={e => setGrilla({ ...grilla, columnas: e.target.value })} sx={{ width: 160 }} />
          <TextField size="small" label="Pasillo" value={grilla.pasillo} onChange={e => setGrilla({ ...grilla, pasillo: e.target.value })} sx={{ width: 110 }} />
          <TextField size="small" label="Estantería" value={grilla.estanteria} onChange={e => setGrilla({ ...grilla, estanteria: e.target.value })} sx={{ width: 120 }} />
          <Button variant="contained" sx={{ bgcolor: COLOR }} disabled={(puntos.length !== 4 && !f.esquinas) || !(Number(grilla.filas) > 0) || !(Number(grilla.columnas) > 0)} onClick={guardarCalibracion}>Guardar cuadrícula</Button>
          <Button size="small" onClick={() => setPuntos([])}>Volver a marcar</Button>
        </Stack>
      </Paper>}
      {modo === 'ver' && f.calibrada && <Stack direction="row" gap={1} mb={1.5} alignItems="center">
        <Button size="small" startIcon={<AutoFixHigh />} onClick={autoasignar}>Asignar celdas automáticamente</Button>
        <Typography fontSize={12} color="text.secondary">Por pasillo{grilla.estanteria ? ' y estantería' : ''}: el nivel 1 es la fila de abajo y la posición 1 la de la izquierda. Haga clic en una celda para cambiarla.</Typography>
      </Stack>}
      {modo === 'ver' && !f.calibrada && <Alert severity="info" sx={{ mb: 1.5 }}>Calibre la cuadrícula para ver la ocupación sobre la foto.</Alert>}
      <Box ref={caja} sx={{ position: 'relative', width: '100%', userSelect: 'none', cursor: modo === 'esquinas' ? 'crosshair' : 'default', borderRadius: 2, overflow: 'hidden', bgcolor: '#111' }}
        onClick={e => { if (modo === 'esquinas' && puntos.length < 4 && caja.current) setPuntos(p => [...p, puntoDe(e, caja.current!)]) }}>
        <img src={url} alt={f.nombre} style={{ width: '100%', display: 'block', filter: 'grayscale(1) contrast(1.05)' }} draggable={false} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {H && filas > 0 && cols > 0 && est.data.celdas.filter((c: any) => c.fila < filas && c.columna < cols).map((c: any) => {
            const e = ESTADOS[c.estado] ?? ESTADOS.OCUPADA
            return (
              <Tooltip key={`${c.fila}-${c.columna}`} title={c.codigo ? <>
                <b>{c.codigo}</b> · {e.texto}{c.ocupacion_pct != null ? ` · ${c.ocupacion_pct}%` : ''}<br />
                {c.contenido.map((x: any) => <span key={x.sku}>{x.sku} × {num(x.unidades)}<br /></span>)}</> : 'Sin ubicación asignada (clic para asignar)'}>
                <polygon points={celdaPoligono(H, c.fila, c.columna, filas, cols)} data-celda={`${c.fila}-${c.columna}`}
                  fill={c.resaltar ? '#2563EB' : e.color} fillOpacity={c.resaltar ? 0.55 : 0.45}
                  stroke={c.resaltar ? '#60A5FA' : c.estado === 'SIN_ASIGNAR' ? '#94A3B8' : '#FFFFFF'} strokeOpacity={0.9}
                  strokeWidth={c.resaltar ? 3 : 1.2} strokeDasharray={c.estado === 'SIN_ASIGNAR' ? '4 3' : undefined} vectorEffect="non-scaling-stroke"
                  style={{ cursor: modo === 'ver' ? 'pointer' : 'crosshair' }}
                  onClick={ev => { if (modo === 'ver') { ev.stopPropagation(); setCelda(c); setAsignar((ubicaciones.data ?? []).find((u: any) => u.id === c.ubicacion_id) ?? null) } }} />
              </Tooltip>
            )
          })}
          {modo === 'esquinas' && puntos.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={0.008} fill="#F59E0B" stroke="#fff" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        </svg>
      </Box>
      <Stack direction="row" gap={1.5} mt={1} flexWrap="wrap">
        {Object.entries(ESTADOS).map(([k, e]) => <Stack key={k} direction="row" gap={0.5} alignItems="center">
          <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: e.color === 'transparent' ? '#fff' : e.color, border: '1px solid #94A3B8', borderStyle: k === 'SIN_ASIGNAR' ? 'dashed' : 'solid' }} />
          <Typography fontSize={11.5}>{e.texto}</Typography></Stack>)}
        <Stack direction="row" gap={0.5} alignItems="center"><Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: '#2563EB' }} /><Typography fontSize={11.5}>Producto buscado</Typography></Stack>
      </Stack>
      <Dialog open={!!celda} onClose={() => setCelda(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Celda nivel {celda ? filas - celda.fila : ''} · posición {celda ? celda.columna + 1 : ''}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {celda?.contenido?.length > 0 && <Typography fontSize={13} mb={1.5}>{celda.contenido.map((x: any) => `${x.sku} × ${num(x.unidades)}`).join(' · ')}</Typography>}
          <Autocomplete size="small" options={ubicaciones.data ?? []} value={asignar} onChange={(_, v) => setAsignar(v)} getOptionLabel={(u: any) => u.codigo}
            renderInput={p => <TextField {...p} label="Ubicación de esta celda" />} />
        </DialogContent>
        <DialogActions><Button color="inherit" onClick={() => setCelda(null)}>Cerrar</Button><Button onClick={guardarCelda}>Guardar</Button></DialogActions>
      </Dialog>
    </Box>
  )
}

function Plano({ almacen, fotos, onAbrir }: { almacen: number; fotos: any[]; onAbrir: (id: number) => void }) {
  const qc = useQueryClient()
  const plano = useQuery({ queryKey: ['mapa-plano', almacen], queryFn: () => api.get('/wms/mapa/plano', { params: { almacen_id: almacen } }).then(r => r.data) })
  const url = useImagen(plano.data ? `/wms/mapa/plano/${plano.data.id}/imagen` : null)
  const caja = useRef<HTMLDivElement>(null)
  const [dibujando, setDibujando] = useState(false)
  const [inicio, setInicio] = useState<Punto | null>(null)
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [marca, setMarca] = useState({ etiqueta: '', foto_id: '' as number | '' })
  const subir = async (archivo: File) => {
    const fd = new FormData(); fd.append('almacen_id', String(almacen)); fd.append('archivo', archivo)
    try { await api.post('/wms/mapa/plano', fd); toast.success('Plano cargado'); qc.invalidateQueries({ queryKey: ['mapa-plano'] }) } catch (e) { toast.error(errorApi(e)) }
  }
  const guardarMarca = async () => {
    const marcas = [...(plano.data.marcas ?? []).map((m: any) => ({ x: m.x, y: m.y, w: m.w, h: m.h, etiqueta: m.etiqueta, foto_id: m.foto_id })),
      { ...rect, etiqueta: marca.etiqueta, foto_id: marca.foto_id || null }]
    try { await api.put(`/wms/mapa/plano/${plano.data.id}/marcas`, marcas); setRect(null); setMarca({ etiqueta: '', foto_id: '' }); setDibujando(false)
      qc.invalidateQueries({ queryKey: ['mapa-plano'] }) } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box>
      <Stack direction="row" gap={1} mb={1.5} alignItems="center">
        <Button component="label" size="small" startIcon={<AddPhotoAlternate />}>{plano.data ? 'Cambiar plano' : 'Cargar plano de la bodega'}
          <input hidden type="file" accept="image/*" onChange={e => e.target.files?.[0] && subir(e.target.files[0])} /></Button>
        {plano.data && <Button size="small" variant={dibujando ? 'contained' : 'text'} onClick={() => setDibujando(d => !d)}>{dibujando ? 'Arrastre sobre el plano…' : 'Marcar una estantería'}</Button>}
      </Stack>
      {!plano.data && !plano.isLoading && <Alert severity="info">Cargue un plano o una foto cenital de la bodega y marque encima cada estantería.</Alert>}
      {plano.data && url && <Box ref={caja} sx={{ position: 'relative', width: '100%', userSelect: 'none', cursor: dibujando ? 'crosshair' : 'default', borderRadius: 2, overflow: 'hidden' }}
        onMouseDown={e => { if (dibujando && caja.current) { setInicio(puntoDe(e, caja.current)); setRect(null) } }}
        onMouseMove={e => { if (dibujando && inicio && caja.current) { const p = puntoDe(e, caja.current); setRect({ x: Math.min(inicio[0], p[0]), y: Math.min(inicio[1], p[1]), w: Math.abs(p[0] - inicio[0]), h: Math.abs(p[1] - inicio[1]) }) } }}
        onMouseUp={() => setInicio(null)}>
        <img src={url} alt="Plano" style={{ width: '100%', display: 'block', filter: 'grayscale(1)' }} draggable={false} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {(plano.data.marcas ?? []).map((m: any, i: number) => {
            const pct = m.ocupacion_pct
            const color = pct == null ? '#64748B' : pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#22C55E'
            return <Tooltip key={i} title={`${m.etiqueta}${pct != null ? ` · ${m.ocupadas}/${m.celdas} celdas ocupadas (${pct}%)` : ''}`}>
              <rect x={m.x} y={m.y} width={m.w} height={m.h} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke"
                style={{ cursor: m.foto_id ? 'pointer' : 'default' }} onClick={() => m.foto_id && !dibujando && onAbrir(m.foto_id)} />
            </Tooltip>
          })}
          {rect && <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill="#2563EB" fillOpacity={0.25} stroke="#2563EB" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        </svg>
        {(plano.data.marcas ?? []).map((m: any, i: number) => <Typography key={i} sx={{ position: 'absolute', left: `${m.x * 100}%`, top: `${m.y * 100}%`, fontSize: 11, fontWeight: 800,
          color: '#fff', textShadow: '0 0 3px #000', pointerEvents: 'none', p: 0.25 }}>{m.etiqueta}{m.ocupacion_pct != null ? ` · ${m.ocupacion_pct}%` : ''}</Typography>)}
      </Box>}
      <Dialog open={!!rect && !inicio && dibujando && rect.w > 0.005} onClose={() => setRect(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Marcar estantería</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField size="small" label="Etiqueta (p. ej. Pasillo 3)" value={marca.etiqueta} onChange={e => setMarca({ ...marca, etiqueta: e.target.value })} />
          <TextField select size="small" label="Foto de la estantería" value={marca.foto_id} onChange={e => setMarca({ ...marca, foto_id: Number(e.target.value) })}>
            {fotos.map(f => <MenuItem key={f.id} value={f.id}>{f.nombre}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions><Button color="inherit" onClick={() => setRect(null)}>Cancelar</Button><Button disabled={!marca.etiqueta.trim()} onClick={guardarMarca}>Guardar</Button></DialogActions>
      </Dialog>
    </Box>
  )
}

export default function WMSMapa() {
  const qc = useQueryClient()
  const almacenes = useQuery({ queryKey: ['wms-almacenes'], queryFn: wms.almacenes })
  const [almacen, setAlmacen] = useState<number | ''>('')
  useEffect(() => { if (!almacen && almacenes.data?.length) setAlmacen(almacenes.data[0].id) }, [almacenes.data, almacen])
  const fotos = useQuery({ queryKey: ['mapa-fotos', almacen], enabled: !!almacen, queryFn: () => api.get('/wms/mapa/fotos', { params: { almacen_id: almacen } }).then(r => r.data) })
  const [tab, setTab] = useState(0)
  const [foto, setFoto] = useState<number | null>(null)
  const [nueva, setNueva] = useState<{ archivo: File | null; nombre: string; pasillo: string; estanteria: string } | null>(null)
  const [q, setQ] = useState('')
  const [busqueda, setBusqueda] = useState<any>(null)
  const subir = async () => {
    const fd = new FormData()
    fd.append('almacen_id', String(almacen)); fd.append('nombre', nueva!.nombre); fd.append('archivo', nueva!.archivo!)
    if (nueva!.pasillo) fd.append('pasillo', nueva!.pasillo)
    if (nueva!.estanteria) fd.append('estanteria', nueva!.estanteria)
    try { const r = await api.post('/wms/mapa/fotos', fd).then(r => r.data); toast.success('Foto cargada: ahora calibre su cuadrícula'); setNueva(null)
      qc.invalidateQueries({ queryKey: ['mapa-fotos'] }); setFoto(r.id); setTab(1) } catch (e) { toast.error(errorApi(e)) }
  }
  const buscar = async () => {
    if (!q.trim()) { setBusqueda(null); return }
    try { const r = await api.get('/wms/mapa/buscar', { params: { almacen_id: almacen, q } }).then(r => r.data); setBusqueda(r)
      if (r.fotos.length) { setFoto(r.fotos[0].foto_id); setTab(1) } } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Layout title="WMS — Mapa de la bodega">
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<MapaIcon sx={{ fontSize: 28 }} />} titulo="Mapa de la bodega" color={COLOR}
          subtitulo="Fotos reales de las estanterías con la ocupación de cada celda" />
        <Stack direction="row" gap={1.5} mb={2} flexWrap="wrap" alignItems="center">
          <TextField select size="small" label="Almacén" value={almacen} onChange={e => { setAlmacen(Number(e.target.value)); setFoto(null); setBusqueda(null) }} sx={{ minWidth: 240 }}>
            {(almacenes.data ?? []).map(a => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
          </TextField>
          <TextField size="small" label="¿Dónde está? (SKU, nombre o código)" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') buscar() }}
            InputProps={{ endAdornment: <Search fontSize="small" /> }} sx={{ minWidth: 300 }} />
          <Box flex={1} />
          <Button variant="contained" startIcon={<AddPhotoAlternate />} sx={{ bgcolor: COLOR }} onClick={() => setNueva({ archivo: null, nombre: '', pasillo: '', estanteria: '' })}>Cargar foto de estantería</Button>
        </Stack>
        {busqueda && <Alert severity={busqueda.fotos.length ? 'info' : 'warning'} sx={{ mb: 2 }} onClose={() => { setBusqueda(null); setQ('') }}>
          {busqueda.productos.length ? <>{busqueda.productos.map((p: any) => p.sku).join(', ')}: en {busqueda.ubicaciones} ubicaciones
            {busqueda.fotos.length ? ` · fotos: ${busqueda.fotos.map((f: any) => `${f.nombre} (${f.celdas.length})`).join(', ')}` : ''}
            {busqueda.fuera_del_mapa ? ` · ${busqueda.fuera_del_mapa} no están en ninguna foto` : ''}</> : 'Ningún producto coincide.'}
        </Alert>}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Plano" /><Tab label="Estanterías" /></Tabs>
        {!!almacen && tab === 0 && <Plano almacen={Number(almacen)} fotos={fotos.data ?? []} onAbrir={id => { setFoto(id); setTab(1) }} />}
        {!!almacen && tab === 1 && <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Stack gap={1}>
              {(fotos.data ?? []).map((f: any) => (
                <Paper key={f.id} variant="outlined" role="button" aria-label={`Estantería ${f.nombre}`} onClick={() => setFoto(f.id)}
                  sx={{ p: 1.25, borderRadius: 2, cursor: 'pointer', borderColor: foto === f.id ? COLOR : undefined, borderWidth: foto === f.id ? 2 : 1 }}>
                  <Typography fontSize={13} fontWeight={700}>{f.nombre}</Typography>
                  <Typography fontSize={11.5} color="text.secondary">
                    {f.calibrada ? `${f.filas} × ${f.columnas} · ${f.celdas_asignadas} celdas asignadas` : 'Sin calibrar'}{f.pasillo ? ` · pasillo ${f.pasillo}` : ''}
                  </Typography>
                </Paper>
              ))}
              {fotos.data && !fotos.data.length && <Alert severity="info">Cargue la foto frontal de cada estantería.</Alert>}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            {foto ? <VistaFoto key={foto} fotoId={foto} almacen={Number(almacen)} productoId={busqueda?.productos?.[0]?.id}
              onCalibrada={() => qc.invalidateQueries({ queryKey: ['mapa-fotos'] })} />
              : <Alert severity="info" icon={<Straighten />}>Elija una estantería.</Alert>}
          </Grid>
        </Grid>}
        <Dialog open={!!nueva} onClose={() => setNueva(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Foto de una estantería</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <Typography fontSize={13} color="text.secondary">Tómela de frente, con toda la cara de la estantería a la vista. Se guarda en blanco y negro.</Typography>
            <Button component="label" variant="outlined" startIcon={<AddPhotoAlternate />}>{nueva?.archivo ? nueva.archivo.name : 'Elegir foto'}
              <input hidden type="file" accept="image/*" aria-label="Archivo de la foto" onChange={e => e.target.files?.[0] && setNueva(n => n && ({ ...n, archivo: e.target.files![0], nombre: n.nombre || e.target.files![0].name.replace(/\.[^.]+$/, '') }))} /></Button>
            <TextField size="small" label="Nombre (p. ej. Pasillo 3 · frente)" value={nueva?.nombre ?? ''} onChange={e => setNueva(n => n && ({ ...n, nombre: e.target.value }))} />
            <Stack direction="row" gap={1}>
              <TextField size="small" label="Pasillo" value={nueva?.pasillo ?? ''} onChange={e => setNueva(n => n && ({ ...n, pasillo: e.target.value }))} />
              <TextField size="small" label="Estantería" value={nueva?.estanteria ?? ''} onChange={e => setNueva(n => n && ({ ...n, estanteria: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions><Button color="inherit" onClick={() => setNueva(null)}>Cancelar</Button>
            <Button variant="contained" sx={{ bgcolor: COLOR }} disabled={!nueva?.archivo || !nueva.nombre.trim()} onClick={subir}>Cargar</Button></DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
