/**
 * Planta de reencauche · Recogidas y entregas
 *
 * - Recogidas: el cliente pide que se recojan sus llantas en una sede; las
 *   pendientes se programan en un viaje del TMS con una parada por sede y la
 *   planta como destino. Al completar cada parada el conductor registra la
 *   cantidad y la remisión, y la recepción cuadra contra eso.
 * - Entregas: lo listo de un cliente (terminadas y rechazadas por devolver,
 *   nunca retenidas) sale con orden de salida y despacho del WMS, por viaje del
 *   TMS o en mostrador. La prueba de entrega del viaje las marca entregadas.
 *   Las reencauchadas de la planta se venden al cliente que se indique.
 */
import { useState } from 'react'
import {
  Box, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Checkbox,
  Typography, Alert, Paper, ToggleButton, ToggleButtonGroup, Autocomplete,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LocalShipping, Add, Route } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, fechaHora } from '@/api/reencauche'
import { Encabezado, TablaRegistros, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR, SelectorPropietario, usePropietarios, Paginacion } from '@/components/reencauche/comun'

const ESTADO_RECOGIDA: Record<string, string> = { PENDIENTE: '#B45309', PROGRAMADA: '#0369A1', RECOGIDA: '#7C3AED', RECIBIDA: '#15803D', CANCELADA: '#64748B' }
const ESTADO_ENTREGA: Record<string, string> = { BORRADOR: '#64748B', DESPACHADA: '#0369A1', ENTREGADA: '#15803D', ANULADA: '#94A3B8' }
const hoy = () => new Date().toLocaleDateString('en-CA')

function Recogidas() {
  const qc = useQueryClient()
  const [estado, setEstado] = useState('')
  const lista = useQuery({ queryKey: ['rtm', 'recogidas', estado], queryFn: () => rtm.recogidas(estado || undefined) })
  const [nueva, setNueva] = useState(false)
  const [f, setF] = useState<any>({ depositante_id: '', sede: '', ciudad: '', direccion: '', contacto: '', telefono: '', fecha_requerida: hoy(), cantidad_estimada: '' })
  const [marcadas, setMarcadas] = useState<number[]>([])
  const [programar, setProgramar] = useState(false)
  const [fecha, setFecha] = useState(`${hoy()}T07:00`)
  const crear = async () => {
    try { await rtm.crearRecogida({ ...f, cantidad_estimada: Number(f.cantidad_estimada) }); toast.success('Solicitud registrada'); setNueva(false); qc.invalidateQueries({ queryKey: ['rtm', 'recogidas'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  const programarViaje = async () => {
    try {
      const v = await rtm.programarRecogidas({ solicitud_ids: marcadas, fecha: new Date(fecha).toISOString() })
      toast.success(`Viaje ${v.codigo} con ${v.paradas.length - 1} parada(s) de recogida`); setProgramar(false); setMarcadas([]); qc.invalidateQueries({ queryKey: ['rtm'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Estado" value={estado} onChange={e => setEstado(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todas</MenuItem>{Object.keys(ESTADO_RECOGIDA).map(k => <MenuItem key={k} value={k}>{k.toLowerCase()}</MenuItem>)}
        </TextField>
        <Button variant="outlined" startIcon={<Add />} onClick={() => setNueva(true)}>Solicitud de recogida</Button>
        <Button variant="contained" startIcon={<Route />} disabled={!marcadas.length} onClick={() => setProgramar(true)} sx={{ bgcolor: COLOR }}>
          Programar viaje ({marcadas.length})</Button>
      </Box>
      <TablaRegistros filas={lista.data ?? []} cargando={lista.isLoading} vacio="Sin solicitudes" etiqueta={(s: any) => s.codigo}
        extra={(s: any) => s.estado === 'PENDIENTE' && <Button size="small" onClick={async () => { await rtm.cancelarRecogida(s.id); qc.invalidateQueries({ queryKey: ['rtm', 'recogidas'] }) }}>Cancelar</Button>}
        columnas={[
          { titulo: '', valor: (s: any) => s.estado === 'PENDIENTE' && <Checkbox size="small" checked={marcadas.includes(s.id)}
            onChange={e => setMarcadas(e.target.checked ? [...marcadas, s.id] : marcadas.filter(x => x !== s.id))} /> },
          { titulo: 'Solicitud', valor: (s: any) => <b>{s.codigo}</b> }, { titulo: 'Cliente', valor: (s: any) => s.cliente },
          { titulo: 'Sede', valor: (s: any) => `${s.sede} · ${s.ciudad}` }, { titulo: 'Fecha', valor: (s: any) => s.fecha_requerida },
          { titulo: 'Estimadas', valor: (s: any) => s.cantidad_estimada, alinear: 'right' },
          { titulo: 'Recogidas', valor: (s: any) => s.recogidas ?? '—', alinear: 'right' },
          { titulo: 'Viaje', valor: (s: any) => s.viaje ?? '—' }, { titulo: 'Recepción', valor: (s: any) => s.recepcion ?? '—' },
          { titulo: 'Estado', valor: (s: any) => <Etiqueta texto={s.estado.toLowerCase()} color={ESTADO_RECOGIDA[s.estado]} /> },
        ]} />
      <Alert severity="info" sx={{ mt: 1.5 }}>
        Al completar cada parada de recogida en el TMS, el conductor registra la cantidad recogida y la remisión. Luego se recibe en Recepción · Por recibir.
      </Alert>
      <Dialog open={nueva} onClose={() => setNueva(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Solicitud de recogida</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={12}><SelectorPropietario valor={f.depositante_id} onChange={v => setF({ ...f, depositante_id: v })} sinPropio ancho={300} /></Grid>
            {[['sede', 'Sede', 6], ['ciudad', 'Ciudad', 6], ['direccion', 'Dirección', 12], ['contacto', 'Contacto', 6], ['telefono', 'Teléfono', 6]].map(([k, t, a]) => (
              <Grid key={k as string} size={a as number}><TextField fullWidth size="small" label={t} value={f[k as string]} onChange={e => setF({ ...f, [k as string]: e.target.value })} /></Grid>
            ))}
            <Grid size={6}><TextField fullWidth size="small" type="date" label="Fecha requerida" value={f.fecha_requerida} onChange={e => setF({ ...f, fecha_requerida: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid size={6}><TextField fullWidth size="small" type="number" label="Llantas estimadas" value={f.cantidad_estimada} onChange={e => setF({ ...f, cantidad_estimada: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setNueva(false)}>Cancelar</Button>
          <Button variant="contained" onClick={crear} disabled={!f.depositante_id || !f.sede || !f.ciudad || !f.cantidad_estimada}>Registrar</Button></DialogActions>
      </Dialog>
      <Dialog open={programar} onClose={() => setProgramar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Programar viaje de recogida</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 1 }}>{marcadas.length} solicitud(es): una parada por sede y la planta como destino. El vehículo y el conductor se asignan en la planificación del TMS.</Typography>
          <TextField fullWidth size="small" type="datetime-local" label="Salida" value={fecha} onChange={e => setFecha(e.target.value)} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setProgramar(false)}>Cancelar</Button><Button variant="contained" onClick={programarViaje}>Crear viaje</Button></DialogActions>
      </Dialog>
    </>
  )
}

function NuevaEntrega({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient()
  const props = usePropietarios()
  const [dep, setDep] = useState<number | ''>('')
  const prop = useQuery({ queryKey: ['rtm', 'propuesta', dep], queryFn: () => rtm.propuesta(Number(dep)), enabled: !!dep && abierto })
  const clientes = useQuery({ queryKey: ['rtm', 'clientes-wms'], queryFn: () => rtm.clientesWms(), enabled: abierto })
  const [sel, setSel] = useState<number[]>([])
  const [modo, setModo] = useState('VIAJE')
  const [comprador, setComprador] = useState<any>(null)
  const [destino, setDestino] = useState({ ciudad: '', direccion: '' })
  const [desp, setDesp] = useState({ placa: '', recibe_nombre: '' })
  const propia = !!props.data?.find((p: any) => p.id === dep)?.propio
  const todas = [...(prop.data?.terminadas ?? []).map((c: any) => ({ ...c, tipo: 'Terminada' })), ...(prop.data?.devoluciones ?? []).map((c: any) => ({ ...c, tipo: 'Devolución' }))]
  const crear = async () => {
    try {
      const e = await rtm.crearEntrega({ depositante_id: dep, carcasa_ids: sel, modo, wms_cliente_id: comprador?.id ?? null, ...destino })
      const d = await rtm.despachar(e.id, modo === 'MOSTRADOR' ? desp : {})
      toast.success(modo === 'MOSTRADOR' ? `Entrega ${d.codigo} cerrada en mostrador` : `Entrega ${d.codigo} despachada en el viaje ${d.viaje}`)
      qc.invalidateQueries({ queryKey: ['rtm'] }); onCerrar(); setSel([]); setDep('')
    } catch (e) { toast.error(errorApi(e), { duration: 6000 }) }
  }
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle>Nueva entrega</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, my: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <SelectorPropietario valor={dep} onChange={v => { setDep(v); setSel([]) }} etiqueta="Dueño de las llantas" ancho={300} />
          <ToggleButtonGroup exclusive size="small" value={modo} onChange={(_, v) => v && setModo(v)}>
            <ToggleButton value="VIAJE">Por viaje del TMS</ToggleButton><ToggleButton value="MOSTRADOR">En mostrador</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {propia && <Alert severity="info" sx={{ mb: 1 }}>Son reencauchadas de la planta: se venden al cliente comprador, con el precio de la tarifa de venta, y se facturan en el despacho.</Alert>}
        {propia && <Autocomplete size="small" options={clientes.data ?? []} value={comprador} getOptionLabel={(c: any) => `${c.nombre}${c.nit ? ` · ${c.nit}` : ''}`}
          onChange={(_, v) => setComprador(v)} renderInput={p => <TextField {...p} label="Cliente comprador" />} sx={{ mb: 1 }} />}
        {dep && <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, mb: 1, maxHeight: 300, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Listas para entregar ({todas.length})</Typography>
            <Button size="small" onClick={() => setSel(sel.length === todas.length ? [] : todas.map(c => c.id))}>{sel.length === todas.length ? 'Ninguna' : 'Todas'}</Button>
          </Box>
          {!todas.length && <Typography sx={{ fontSize: 13, color: 'text.secondary', p: 1 }}>Nada listo para este cliente (las retenidas no aparecen).</Typography>}
          {todas.map(c => (
            <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
              <Checkbox size="small" checked={sel.includes(c.id)} onChange={e => setSel(e.target.checked ? [...sel, c.id] : sel.filter(x => x !== c.id))} />
              <b style={{ fontFamily: 'monospace', marginRight: 8 }}>{c.codigo}</b>{c.medida} · {c.marca}
              <Box sx={{ ml: 'auto', mr: 1 }}><Etiqueta texto={c.tipo} color={c.tipo === 'Terminada' ? '#15803D' : '#DC2626'} /></Box>
            </Box>
          ))}
        </Paper>}
        <Grid container spacing={1.5}>
          <Grid size={4}><TextField fullWidth size="small" label="Ciudad de entrega" value={destino.ciudad} onChange={e => setDestino({ ...destino, ciudad: e.target.value })} /></Grid>
          <Grid size={8}><TextField fullWidth size="small" label="Dirección" value={destino.direccion} onChange={e => setDestino({ ...destino, direccion: e.target.value })} /></Grid>
          {modo === 'MOSTRADOR' && <>
            <Grid size={4}><TextField fullWidth size="small" label="Placa del vehículo" value={desp.placa} onChange={e => setDesp({ ...desp, placa: e.target.value.toUpperCase() })} /></Grid>
            <Grid size={8}><TextField fullWidth size="small" label="Nombre de quien recibe" value={desp.recibe_nombre} onChange={e => setDesp({ ...desp, recibe_nombre: e.target.value })} /></Grid>
          </>}
        </Grid>
      </DialogContent>
      <DialogActions><Button onClick={onCerrar}>Cancelar</Button>
        <Button variant="contained" onClick={crear} disabled={!sel.length || (propia && !comprador) || (modo === 'MOSTRADOR' && (!desp.placa || !desp.recibe_nombre))}>
          {modo === 'MOSTRADOR' ? 'Entregar' : 'Despachar'} {sel.length} llanta(s)</Button></DialogActions>
    </Dialog>
  )
}

function Entregas() {
  const [nueva, setNueva] = useState(false)
  const [estado, setEstado] = useState('')
  const [pag, setPag] = useState(0)
  const [por, setPor] = useState(25)
  const lista = useQuery({ queryKey: ['rtm', 'entregas', estado, pag, por], queryFn: () => rtm.entregas({ estado: estado || undefined, limite: por, desplazamiento: pag * por }) })
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
        <TextField select size="small" label="Estado" value={estado} onChange={e => { setEstado(e.target.value); setPag(0) }} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todas</MenuItem>{Object.keys(ESTADO_ENTREGA).map(k => <MenuItem key={k} value={k}>{k.toLowerCase()}</MenuItem>)}
        </TextField>
        <Button variant="contained" startIcon={<Add />} onClick={() => setNueva(true)} sx={{ bgcolor: COLOR }}>Nueva entrega</Button>
      </Box>
      <TablaRegistros filas={lista.data?.filas ?? []} cargando={lista.isLoading} vacio="Sin entregas" etiqueta={(e: any) => e.codigo}
        columnas={[
          { titulo: 'Entrega', valor: (e: any) => <b>{e.codigo}</b> }, { titulo: 'Cliente', valor: (e: any) => e.cliente },
          { titulo: 'Tipo', valor: (e: any) => e.tipo === 'VENTA' ? 'Venta' : 'Servicio' },
          { titulo: 'Llantas', valor: (e: any) => `${e.terminadas}${e.devoluciones ? ` + ${e.devoluciones} dev.` : ''}`, alinear: 'right' },
          { titulo: 'Cómo', valor: (e: any) => e.modo === 'MOSTRADOR' ? `Mostrador${e.placa ? ` · ${e.placa}` : ''}` : `Viaje ${e.viaje ?? ''}` },
          { titulo: 'Recibió', valor: (e: any) => e.recibe_nombre ? `${e.recibe_nombre} · ${fechaHora(e.recibido_en)}` : '—' },
          { titulo: 'Liquidación', valor: (e: any) => e.liquidacion ?? '—' },
          { titulo: 'Estado', valor: (e: any) => <Etiqueta texto={e.estado.toLowerCase()} color={ESTADO_ENTREGA[e.estado]} /> },
        ]} />
      <Paginacion total={lista.data?.total ?? 0} pagina={pag} porPagina={por} onPagina={setPag} onPorPagina={setPor} />
      <Alert severity="info" sx={{ mt: 1.5 }}>Las entregas por viaje quedan entregadas cuando el conductor registra la prueba de entrega (POD) en el TMS.</Alert>
      <NuevaEntrega abierto={nueva} onCerrar={() => setNueva(false)} />
    </>
  )
}

export default function RTMDespachos() {
  const [pestana, setPestana] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<LocalShipping sx={{ fontSize: 28 }} />} titulo="Recogidas y entregas"
          subtitulo="Viajes del TMS para traer carcasas y devolver llantas; documentos de salida del WMS" color={COLOR} />
        <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }}><Tab label="Recogidas" /><Tab label="Entregas" /></Tabs>
        {pestana === 0 && <Recogidas />}
        {pestana === 1 && <Entregas />}
      </Box>
    </Layout>
  )
}
