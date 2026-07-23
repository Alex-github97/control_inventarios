import { useEffect, useRef, useState } from 'react'
import {
  Box, Typography, Card, Button, TextField, alpha, LinearProgress, Alert, Chip, Stack, Divider,
} from '@mui/material'
import {
  Route as RouteIcon, TravelExplore, SwapHoriz, Upload, Download, InsertDriveFile,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'

const TX_COLOR = '#369E4D'
const TX_DARK = '#1f6130'

interface Punto { nombre: string; lat: number; lon: number }
interface RutaResp { origen: Punto; destino: Punto; distancia_km: number; duracion_min: number; geometria: [number, number][] }
interface MasivaResp {
  stats: { filas: number; total_archivo: number; calculadas: number; sin_ruta: number; truncado: boolean }
  filename: string; file_base64: string
}

const fmtDur = (min: number) => {
  const h = Math.floor(min / 60); const m = Math.round(min % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Leaflet vía CDN (sin dependencia npm) ────────────────────────────────────
let leafletPromise: Promise<any> | null = null
function loadLeaflet(): Promise<any> {
  const w = window as any
  if (w.L) return Promise.resolve(w.L)
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.async = true
    s.onload = () => resolve((window as any).L)
    s.onerror = () => reject(new Error('No se pudo cargar el mapa'))
    document.head.appendChild(s)
  })
  return leafletPromise
}

function MapaRuta({ ruta }: { ruta: RutaResp | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)

  useEffect(() => {
    let cancel = false
    loadLeaflet().then((L) => {
      if (cancel || !ref.current) return
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { scrollWheelZoom: false }).setView([4.6, -74.08], 5)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap', maxZoom: 19,
        }).addTo(mapRef.current)
      }
      const map = mapRef.current
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null }
      if (ruta?.geometria?.length) {
        const g = L.layerGroup()
        const line = L.polyline(ruta.geometria, { color: TX_COLOR, weight: 5, opacity: 0.85 })
        g.addLayer(line)
        g.addLayer(L.circleMarker([ruta.origen.lat, ruta.origen.lon], { radius: 8, color: '#fff', weight: 2, fillColor: '#2563EB', fillOpacity: 1 }).bindPopup(`Origen: ${ruta.origen.nombre}`))
        g.addLayer(L.circleMarker([ruta.destino.lat, ruta.destino.lon], { radius: 8, color: '#fff', weight: 2, fillColor: '#DC2626', fillOpacity: 1 }).bindPopup(`Destino: ${ruta.destino.nombre}`))
        g.addTo(map); layerRef.current = g
        try { map.fitBounds(line.getBounds(), { padding: [30, 30] }) } catch { /* noop */ }
      }
      setTimeout(() => map.invalidateSize(), 120)
    }).catch(() => toast.error('No se pudo cargar el mapa'))
    return () => { cancel = true }
  }, [ruta])

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }, [])

  return <Box ref={ref} sx={{ height: 420, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB', bgcolor: '#EEF2F6' }} />
}

export default function TarifaxDistancias() {
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [ruta, setRuta] = useState<RutaResp | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [masiva, setMasiva] = useState<MasivaResp | null>(null)

  const consultar = async () => {
    if (!origen.trim() || !destino.trim()) { toast.error('Ingresa origen y destino'); return }
    setBuscando(true)
    try {
      const res = await apiClient.get<RutaResp>('/tarifax/ruta', {
        params: { origen, destino }, timeout: 40000,
      })
      setRuta(res.data)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'No se pudo calcular la ruta')
    } finally { setBuscando(false) }
  }

  const invertir = () => { setOrigen(destino); setDestino(origen) }

  const procesarMasiva = async () => {
    if (!file) return
    setProcesando(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await apiClient.post<MasivaResp>('/tarifax/ruta-masiva', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000,
      })
      setMasiva(res.data)
      toast.success(`${res.data.stats.calculadas} distancias calculadas`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al procesar el archivo')
    } finally { setProcesando(false) }
  }

  const descargarMasiva = () => {
    if (!masiva) return
    const bytes = atob(masiva.file_base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a'); a.href = url; a.download = masiva.filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout title="TarifaX · Distancias">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${alpha(TX_COLOR, 0.4)}` }}>
          <RouteIcon sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Calculadora de Distancias</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>
            Distancia por carretera entre cualquier par de lugares del mundo · Dijkstra sobre Contraction Hierarchies (OSRM)
          </Typography>
        </Box>
      </Box>

      {/* Consulta puntual */}
      <Card sx={{ p: 2.5, mb: 2.5, border: `1px solid ${alpha(TX_COLOR, 0.2)}`, borderRadius: '14px' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
          <TextField size="small" label="Origen" placeholder="Bogotá, Colombia" value={origen} onChange={e => setOrigen(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && consultar()} sx={{ flex: 1 }} />
          <Button onClick={invertir} sx={{ minWidth: 0, color: TX_COLOR }}><SwapHoriz /></Button>
          <TextField size="small" label="Destino" placeholder="Medellín, Colombia" value={destino} onChange={e => setDestino(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && consultar()} sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<TravelExplore />} onClick={consultar} disabled={buscando}
            sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, fontWeight: 700, textTransform: 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}>
            {buscando ? 'Calculando…' : 'Calcular ruta'}
          </Button>
        </Stack>
        {buscando && <LinearProgress sx={{ mb: 2, borderRadius: 4, bgcolor: alpha(TX_COLOR, 0.1), '& .MuiLinearProgress-bar': { bgcolor: TX_COLOR } }} />}

        <MapaRuta ruta={ruta} />

        {ruta && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }} divider={<Divider orientation="vertical" flexItem />}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Distancia por carretera</Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 800, color: TX_DARK, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{ruta.distancia_km.toLocaleString('es-CO')} km</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Tiempo estimado</Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>{fmtDur(ruta.duracion_min)}</Typography>
            </Box>
            <Box sx={{ flex: 2 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Ruta</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#1E293B', mt: 0.5 }}>
                <b style={{ color: '#2563EB' }}>●</b> {ruta.origen.nombre}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#1E293B' }}>
                <b style={{ color: '#DC2626' }}>●</b> {ruta.destino.nombre}
              </Typography>
            </Box>
          </Stack>
        )}
      </Card>

      {/* Cálculo masivo */}
      <Card sx={{ p: 2.5, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1E293B', mb: 0.5 }}>Cálculo masivo desde Excel</Typography>
        <Typography sx={{ fontSize: 12, color: '#64748B', mb: 2 }}>
          Sube un Excel con columnas <code>ORIGEN</code> y <code>DESTINO</code>; se devuelve el mismo archivo con la distancia (km) y duración de cada par.
        </Typography>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={e => { setFile(e.target.files?.[0] ?? null); setMasiva(null) }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          {!file ? (
            <Box onClick={() => fileRef.current?.click()} sx={{ flex: 1, p: 2, border: `2px dashed ${alpha(TX_COLOR, 0.4)}`, borderRadius: '10px', textAlign: 'center', cursor: 'pointer', bgcolor: alpha(TX_COLOR, 0.03), '&:hover': { bgcolor: alpha(TX_COLOR, 0.07), borderColor: TX_COLOR } }}>
              <Upload sx={{ fontSize: 26, color: alpha(TX_COLOR, 0.6) }} />
              <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>Clic para seleccionar el Excel</Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: alpha(TX_COLOR, 0.06), borderRadius: '10px', border: `1px solid ${alpha(TX_COLOR, 0.2)}` }}>
              <InsertDriveFile sx={{ color: TX_COLOR }} />
              <Typography sx={{ fontSize: 13, flex: 1 }} noWrap>{file.name}</Typography>
              <Button size="small" onClick={() => { setFile(null); setMasiva(null) }} sx={{ color: '#64748B', minWidth: 0 }}>Quitar</Button>
            </Box>
          )}
          <Button variant="contained" startIcon={<RouteIcon />} onClick={procesarMasiva} disabled={!file || procesando}
            sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, fontWeight: 700, textTransform: 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}>
            {procesando ? 'Procesando…' : 'Calcular distancias'}
          </Button>
        </Stack>
        {procesando && <LinearProgress sx={{ mt: 2, borderRadius: 4, bgcolor: alpha(TX_COLOR, 0.1), '& .MuiLinearProgress-bar': { bgcolor: TX_COLOR } }} />}

        {masiva && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${masiva.stats.calculadas} calculadas`} sx={{ bgcolor: alpha(TX_COLOR, 0.12), color: TX_DARK, fontWeight: 700 }} />
              <Chip size="small" label={`${masiva.stats.sin_ruta} sin ruta`} sx={{ bgcolor: alpha('#DC2626', 0.1), color: '#DC2626', fontWeight: 700 }} />
              {masiva.stats.truncado && <Chip size="small" label={`archivo truncado a ${masiva.stats.filas} de ${masiva.stats.total_archivo}`} color="warning" />}
            </Stack>
            <Alert severity="success" action={<Button variant="contained" size="small" startIcon={<Download />} onClick={descargarMasiva} sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, fontWeight: 700, whiteSpace: 'nowrap', borderRadius: '8px' }}>Descargar</Button>}
              sx={{ borderRadius: '12px', '& .MuiAlert-icon': { color: TX_COLOR }, alignItems: 'center' }}>
              <strong>Listo.</strong> Archivo: <code style={{ fontSize: 11 }}>{masiva.filename}</code>
            </Alert>
          </Box>
        )}
      </Card>
    </Layout>
  )
}
