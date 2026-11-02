/**
 * Planta de reencauche · Vulcanización
 *
 * Cada autoclave: libre, armando un ciclo, en ciclo (con su hora estimada de
 * fin) o en mantenimiento, y su utilización en la última semana. Un ciclo se
 * arma escaneando carcasas —todas con la misma receta, sin pasar la capacidad
 * y con el encamisado conforme—, se inicia y se cierra con las variables
 * reales. Si alguna se desvía de la receta, todas sus carcasas quedan retenidas.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Button, TextField, Chip, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress,
  Alert, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Whatshot, PlayArrow, Stop, Add } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, fechaHora, num } from '@/api/reencauche'
import { Encabezado, TablaRegistros, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR, Paginacion } from '@/components/reencauche/comun'

const ESTADO: Record<string, [string, string]> = {
  LIBRE: ['Libre', '#15803D'], ARMANDO: ['Armando ciclo', '#0369A1'], EN_CICLO: ['En ciclo', '#B45309'], MANTENIMIENTO: ['Mantenimiento', '#64748B'],
}

function Autoclave({ a, onCambio }: { a: any; onCambio: () => void }) {
  const [codigo, setCodigo] = useState('')
  const [cerrar, setCerrar] = useState(false)
  const [v, setV] = useState<any>({ temperatura: '', presion: '', vacio: '', tiempo: '' })
  const c = a.ciclo
  const accion = async (f: () => Promise<any>, ok: string) => { try { await f(); toast.success(ok); onCambio() } catch (e) { toast.error(errorApi(e), { duration: 6000 }) } }
  const cargar = async () => {
    if (!codigo.trim()) return
    try { const r = await rtm.cargar(c.id, codigo.trim().toUpperCase()); toast.success(`Cargada (${r.cargadas}/${r.capacidad}) · receta ${r.receta}`); setCodigo(''); onCambio() }
    catch (e) { toast.error(errorApi(e), { duration: 6000 }) }
  }
  const cerrarCiclo = async () => {
    try {
      const r = await rtm.cerrarCiclo(c.id, { temperatura: Number(v.temperatura), presion: Number(v.presion), vacio: Number(v.vacio),
        tiempo: v.tiempo === '' ? null : Number(v.tiempo) })
      if (r.conforme) toast.success(`Ciclo conforme: ${r.carcasas} carcasas siguen`)
      else toast.error(`Desviación de ${r.desviadas.join(', ')}: ${r.carcasas} carcasas retenidas`, { duration: 8000 })
      setCerrar(false); onCambio()
    } catch (e) { toast.error(errorApi(e)) }
  }
  const [et, color] = ESTADO[a.estado] ?? [a.estado, '#64748B']
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%', borderColor: alpha(color, 0.5) }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>{a.nombre}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{a.codigo} · capacidad {a.capacidad} · utilización 7 días {num(a.utilizacion, 1)} %</Typography>
        </Box>
        <Etiqueta texto={et} color={color} />
      </Box>
      {c && <>
        <Typography sx={{ fontSize: 13 }}>Ciclo <b>{c.codigo}</b>{c.receta ? ` · receta ${c.receta.codigo} v${c.receta.version}` : ''}</Typography>
        {c.receta && <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{c.receta.temperatura_c} °C · {c.receta.presion_bar} bar · vacío {c.receta.vacio_bar} bar · {c.receta.tiempo_min} min</Typography>}
        <LinearProgress variant="determinate" value={(c.carcasas.length / (a.capacidad || 1)) * 100} sx={{ my: 1, height: 6, borderRadius: 3 }} />
        <Typography sx={{ fontSize: 12, mb: 1 }}>{c.carcasas.length} de {a.capacidad} llantas{c.fin_estimado ? ` · termina a las ${fechaHora(c.fin_estimado)}` : ''}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>{c.carcasas.map((x: string) => <Chip key={x} size="small" label={x} sx={{ fontFamily: 'monospace' }} />)}</Box>
      </>}
      {a.estado === 'LIBRE' && <Button fullWidth variant="outlined" startIcon={<Add />} onClick={() => accion(() => rtm.crearCiclo(a.equipo_id), 'Ciclo abierto: escanee las carcasas')}>Armar ciclo</Button>}
      {a.estado === 'ARMANDO' && <>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField size="small" fullWidth label="Escanee la carcasa" value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') cargar() }} />
          <Button variant="outlined" onClick={cargar}>Cargar</Button>
        </Box>
        <Button fullWidth variant="contained" startIcon={<PlayArrow />} disabled={!c?.carcasas.length} sx={{ bgcolor: COLOR }}
          onClick={() => accion(() => rtm.iniciarCiclo(c.id), 'Ciclo iniciado')}>Iniciar ciclo</Button>
      </>}
      {a.estado === 'EN_CICLO' && <Button fullWidth variant="contained" color="warning" startIcon={<Stop />} onClick={() => setCerrar(true)}>Cerrar ciclo</Button>}
      <Dialog open={cerrar} onClose={() => setCerrar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cerrar ciclo {c?.codigo}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Variables reales del ciclo, del registrador del autoclave.</Typography>
          {[['temperatura', 'Temperatura máxima (°C)'], ['presion', 'Presión media (bar)'], ['vacio', 'Vacío mínimo (bar)'], ['tiempo', 'Duración (min) — vacío: hasta ahora']].map(([k, t]) => (
            <TextField key={k} fullWidth size="small" type="number" label={t} value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} sx={{ my: 0.75 }} inputProps={{ step: 'any' }} />
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setCerrar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={cerrarCiclo} disabled={v.temperatura === '' || v.presion === '' || v.vacio === ''}>Cerrar ciclo</Button></DialogActions>
      </Dialog>
    </Paper>
  )
}

export default function RTMVulcanizacion() {
  const qc = useQueryClient()
  const t = useQuery({ queryKey: ['rtm', 'vulcanizacion'], queryFn: rtm.tableroVulcanizacion, refetchInterval: 20_000 })
  const primero = t.data?.autoclaves?.[0]?.codigo
  const cola = useQuery({ queryKey: ['rtm', 'cola', primero], queryFn: () => rtm.cola(primero), enabled: !!primero, refetchInterval: 20_000 })
  const [pag, setPag] = useState(0)
  const [por, setPor] = useState(25)
  const historial = useQuery({ queryKey: ['rtm', 'ciclos', pag, por], queryFn: () => rtm.ciclos({ estado: 'CERRADO', limite: por, desplazamiento: pag * por }) })
  const refrescar = () => qc.invalidateQueries({ queryKey: ['rtm'] })
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Whatshot sx={{ fontSize: 28 }} />} titulo="Vulcanización"
          subtitulo="Autoclaves, ciclos con su receta y variables reales; una desviación retiene todo el ciclo" color={COLOR} />
        {t.isLoading && <LinearProgress />}
        {t.data && !t.data.autoclaves.length && <Alert severity="info">No hay autoclaves: créelos en Configuración · Equipos.</Alert>}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {(t.data?.autoclaves ?? []).map((a: any) => <Grid key={a.equipo_id} size={{ xs: 12, md: 6, lg: 4 }}><Autoclave a={a} onCambio={refrescar} /></Grid>)}
        </Grid>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Esperan vulcanización ({cola.data?.length ?? 0})</Typography>
            <TablaRegistros filas={(cola.data ?? []).map((c: any) => ({ ...c, id: c.orden_id }))} cargando={cola.isLoading}
              vacio="Nada espera vulcanización" etiqueta={(c: any) => c.codigo}
              columnas={[
                { titulo: 'Código', valor: (c: any) => <b style={{ fontFamily: 'monospace' }}>{c.codigo}</b> },
                { titulo: 'Medida', valor: (c: any) => c.medida }, { titulo: 'Banda', valor: (c: any) => c.banda },
                { titulo: 'Receta', valor: (c: any) => c.receta ?? <span style={{ color: '#DC2626' }}>Sin receta en {primero}</span> },
              ]} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Ciclos cerrados</Typography>
            <TablaRegistros filas={historial.data?.filas ?? []} cargando={historial.isLoading} vacio="Sin ciclos" etiqueta={(c: any) => c.codigo}
              columnas={[
                { titulo: 'Ciclo', valor: (c: any) => <b>{c.codigo}</b> }, { titulo: 'Autoclave', valor: (c: any) => c.equipo },
                { titulo: 'Llantas', valor: (c: any) => c.carcasas.length, alinear: 'right' },
                { titulo: 'Inicio', valor: (c: any) => fechaHora(c.inicio) },
                { titulo: 'Variables', valor: (c: any) => c.variables ? Object.entries(c.variables).map(([k, x]: any) => (
                  <Chip key={k} size="small" variant="outlined" label={`${k} ${num(x.real, 1)}`} sx={{ mr: 0.5, fontSize: 10.5, color: x.conforme ? undefined : '#DC2626', borderColor: x.conforme ? undefined : '#DC2626' }} />)) : '—' },
                { titulo: 'Resultado', valor: (c: any) => <Etiqueta texto={c.conforme ? 'Conforme' : 'Desviación'} color={c.conforme ? '#15803D' : '#DC2626'} /> },
              ]} />
            <Paginacion total={historial.data?.total ?? 0} pagina={pag} porPagina={por} onPagina={setPag} onPorPagina={setPor} />
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
