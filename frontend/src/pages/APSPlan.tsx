/**
 * APS · Plan maestro (MPS / MRP)
 *
 * Era maqueta: un Gantt de órdenes, una explosión de materiales y una red DRP
 * con datos escritos a mano. Ahora el plan sale del motor:
 *
 *  - Órdenes sugeridas: qué producir y qué comprar, cuánto, cuándo lanzarlo y
 *    cuándo debe llegar. Las que ya debían haberse lanzado se marcan: son el
 *    riesgo de quiebre. Aprobar una la vuelve recepción programada, y el plan
 *    deja de sugerirla.
 *  - Detalle por producto: la proyección mes a mes (demanda propia, traslados
 *    que pide la red, recepciones, stock contra el de seguridad).
 *  - Órdenes aprobadas: al recibirlas, su cantidad entra a las existencias.
 *  - Versiones: una foto del plan para dejar registro de lo decidido.
 *
 * El Gantt se quitó: el motor planea por meses con capacidad agregada (RCCP),
 * no programa operaciones por hora, y un Gantt aparentaría una precisión que
 * el plan no tiene.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, Button, TextField, MenuItem, Alert, LinearProgress, Table, TableHead, TableRow,
  TableCell, TableBody, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { EventNote } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, pesos, nombreP, nombreU, mesCorto, TIPO_ORDEN, type OrdenPlan } from '@/api/aps'
import { Encabezado, Cifra, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO

function Sugeridas() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'plan'], queryFn: apsApi.plan })
  const [tipo, setTipo] = useState('TODAS')
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const todas = [...data.ordenes, ...data.traslados].sort((a, b) => (Number(b.atrasada) - Number(a.atrasada)) || a.periodo_lanzamiento.localeCompare(b.periodo_lanzamiento))
  const filas = todas.filter(o => tipo === 'TODAS' || o.tipo === tipo)
  const aprobar = async (o: OrdenPlan) => {
    try { await apsApi.aprobarOrden(o); toast.success(`${TIPO_ORDEN[o.tipo]} aprobada: ya cuenta como recepción programada`); qc.invalidateQueries({ queryKey: ['aps'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  const k = data.kpis
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Órdenes sugeridas" valor={n0(k.ordenes_sugeridas)} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Atrasadas (riesgo de quiebre)" valor={n0(k.ordenes_atrasadas)} color={k.ordenes_atrasadas ? '#DC2626' : '#16A34A'} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Unidades a producir / comprar" valor={`${n0(k.unidades_produccion)} / ${n0(k.unidades_compra)}`} color="#7C3AED" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Costo de producción y compras" valor={pesos(k.costo_ordenes)} color="#D97706" sub={`Horizonte ${mesCorto(data.periodos[0])} a ${mesCorto(data.periodos[data.periodos.length - 1])}`} /></Grid>
      </Grid>
      <ToggleButtonGroup size="small" exclusive value={tipo} onChange={(_, v) => v && setTipo(v)} sx={{ mb: 2 }}>
        {['TODAS', 'PRODUCCION', 'COMPRA', 'TRASLADO'].map(t => <ToggleButton key={t} value={t}>{t === 'TODAS' ? `Todas (${todas.length})` : `${TIPO_ORDEN[t]} (${todas.filter(o => o.tipo === t).length})`}</ToggleButton>)}
      </ToggleButtonGroup>
      {!todas.length && <Alert severity="success">El plan no necesita órdenes: las existencias y lo ya aprobado cubren el horizonte.</Alert>}
      {filas.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', maxHeight: 560 }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
              <TableCell>Tipo</TableCell><TableCell>Producto</TableCell><TableCell>Dónde</TableCell><TableCell align="right">Cantidad</TableCell>
              <TableCell>Lanzar en</TableCell><TableCell>Recibir en</TableCell><TableCell align="right">Costo</TableCell><TableCell /><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {filas.map((o, i) => (
                <TableRow key={i} sx={{ '& td': { fontSize: 12 }, bgcolor: o.atrasada ? '#FEF2F2' : undefined }}>
                  <TableCell>{TIPO_ORDEN[o.tipo]}</TableCell><TableCell><b>{nombreP(data, o.producto_id)}</b></TableCell>
                  <TableCell>{o.tipo === 'TRASLADO' ? `${nombreU(data, o.origen_id)} → ${nombreU(data, o.ubicacion_id)}` : nombreU(data, o.ubicacion_id)}</TableCell>
                  <TableCell align="right">{n0(o.cantidad)}</TableCell>
                  <TableCell>{mesCorto(o.periodo_lanzamiento)}</TableCell><TableCell>{mesCorto(o.periodo_recepcion)}</TableCell>
                  <TableCell align="right">{o.tipo === 'TRASLADO' ? '—' : pesos(o.costo)}</TableCell>
                  <TableCell>{o.atrasada && <Etiqueta texto={`Atrasada ${o.meses_atraso} mes${o.meses_atraso > 1 ? 'es' : ''}`} color="#DC2626" />}</TableCell>
                  <TableCell><Button size="small" onClick={() => aprobar(o)}>Aprobar</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  )
}

function Detalle() {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'plan'], queryFn: apsApi.plan })
  const [clave, setClave] = useState('')
  if (isLoading) return <LinearProgress />
  if (!data) return null
  if (!data.mps.length) return <Alert severity="info" sx={{ m: 3 }}>No hay plan: registre demanda y maestros primero.</Alert>
  const actual = data.mps.find(m => `${m.producto_id}-${m.ubicacion_id}` === clave) ?? data.mps[0]
  return (
    <Box sx={{ p: 3 }}>
      <TextField select size="small" label="Producto y ubicación" value={`${actual.producto_id}-${actual.ubicacion_id}`} onChange={e => setClave(e.target.value)} sx={{ minWidth: 380, mb: 2 }}>
        {data.mps.map(m => <MenuItem key={`${m.producto_id}-${m.ubicacion_id}`} value={`${m.producto_id}-${m.ubicacion_id}`}>{nombreP(data, m.producto_id)} · {nombreU(data, m.ubicacion_id)}</MenuItem>)}
      </TextField>
      <Typography fontSize={12} color="text.secondary" mb={1}>
        {actual.tipo === 'PRODUCCION' ? 'Se fabrica' : 'Se compra'} · tiempo de entrega {actual.lead_time_dias} días{actual.lote ? ` · lote mínimo ${n0(actual.lote)}` : ''}. La demanda incluye los traslados que piden los centros de distribución que esta ubicación surte.
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
            <TableCell>Concepto</TableCell>{actual.filas.map(f => <TableCell key={f.periodo} align="right">{mesCorto(f.periodo)}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {([['Demanda total', 'demanda'], ['  de ella, traslados a la red', 'traslados'], ['Recepciones aprobadas', 'programadas'],
              ['Recepciones planificadas', 'planificadas'], ['Stock final', 'stock_final'], ['Stock de seguridad', 'stock_seguridad']] as const).map(([t, k]) => (
              <TableRow key={k} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell sx={{ fontWeight: k === 'stock_final' || k === 'planificadas' ? 700 : 400, whiteSpace: 'pre' }}>{t}</TableCell>
                {actual.filas.map(f => <TableCell key={f.periodo} align="right" sx={{ fontWeight: k === 'stock_final' || k === 'planificadas' ? 700 : 400, color: k === 'stock_final' && f.bajo_seguridad ? '#DC2626' : undefined }}>{n0((f as any)[k] ?? 0)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function Aprobadas() {
  const qc = useQueryClient()
  const nombres = useQuery({ queryKey: ['aps', 'plan'], queryFn: apsApi.plan }).data
  const { data = [], isLoading } = useQuery({ queryKey: ['aps', 'ordenes'], queryFn: () => apsApi.ordenes() })
  const accion = async (f: () => Promise<unknown>, msg: string) => { try { await f(); toast.success(msg); qc.invalidateQueries({ queryKey: ['aps'] }) } catch (e) { toast.error(errorApi(e)) } }
  if (isLoading) return <LinearProgress />
  return (
    <Box sx={{ p: 3 }}>
      <Typography fontSize={13} color="text.secondary" mb={2}>Mientras una orden está aprobada, el plan la cuenta como recepción programada. Al recibirla, su cantidad entra a las existencias de la ubicación (en un traslado, también sale del origen).</Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Tipo</TableCell><TableCell>Producto</TableCell><TableCell>Ubicación</TableCell><TableCell align="right">Cantidad</TableCell><TableCell>Mes</TableCell><TableCell>Estado</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data.map(o => (
              <TableRow key={o.id} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell>{TIPO_ORDEN[o.tipo] ?? o.tipo}</TableCell><TableCell>{nombreP(nombres, o.producto_id)}</TableCell><TableCell>{nombreU(nombres, o.ubicacion_id)}</TableCell>
                <TableCell align="right">{n0(o.cantidad)}</TableCell><TableCell>{mesCorto(o.periodo)}</TableCell>
                <TableCell><Etiqueta texto={o.estado.toLowerCase()} color={o.estado === 'APROBADA' ? '#2563EB' : o.estado === 'RECIBIDA' ? '#16A34A' : '#64748B'} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{o.estado === 'APROBADA' && (<>
                  <Button size="small" onClick={() => accion(() => apsApi.recibirOrden(o.id), 'Orden recibida: existencias actualizadas')}>Recibir</Button>
                  <Button size="small" color="error" onClick={() => { if (window.confirm('¿Cancelar la orden? Volverá a aparecer como sugerencia si todavía hace falta.')) accion(() => apsApi.cancelarOrden(o.id), 'Orden cancelada') }}>Cancelar</Button>
                </>)}</TableCell>
              </TableRow>
            ))}
            {!data.length && <TableRow><TableCell colSpan={7} sx={{ fontSize: 12, color: 'text.secondary' }}>Aún no hay órdenes aprobadas.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function Versiones() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: ['aps', 'versiones'], queryFn: apsApi.versiones })
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState({ nombre: '', observaciones: '' })
  const guardar = async () => {
    try { await apsApi.guardarVersion(f.nombre, f.observaciones || undefined); toast.success('Versión del plan guardada'); setAbierto(false); setF({ nombre: '', observaciones: '' }); qc.invalidateQueries({ queryKey: ['aps', 'versiones'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography fontSize={13} color="text.secondary">Una versión es una foto del plan: lo que se decidió en una reunión queda registrado aunque el plan cambie mañana con nueva demanda.</Typography>
        <Button variant="contained" sx={{ bgcolor: C }} onClick={() => setAbierto(true)}>Guardar versión del plan</Button>
      </Box>
      {isLoading && <LinearProgress />}
      <Table size="small">
        <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Versión</TableCell><TableCell>Fecha</TableCell><TableCell>Horizonte</TableCell><TableCell align="right">Líneas</TableCell><TableCell align="right">Costo</TableCell><TableCell>Por</TableCell><TableCell>Observaciones</TableCell></TableRow></TableHead>
        <TableBody>
          {data.map(v => (
            <TableRow key={v.id} sx={{ '& td': { fontSize: 12 } }}>
              <TableCell><b>{v.nombre}</b></TableCell><TableCell>{v.fecha?.slice(0, 10)}</TableCell><TableCell>{mesCorto(v.desde)} – {mesCorto(v.hasta)}</TableCell>
              <TableCell align="right">{v.lineas}</TableCell><TableCell align="right">{pesos(v.costo)}</TableCell><TableCell>{v.creado_por ?? '—'}</TableCell><TableCell>{v.observaciones ?? '—'}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !data.length && <TableRow><TableCell colSpan={7} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin versiones guardadas.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Guardar versión del plan</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Nombre de la versión" value={f.nombre} onChange={e => setF(x => ({ ...x, nombre: e.target.value }))} sx={{ mt: 1, mb: 2 }} placeholder="Ej. Plan S&OP octubre" />
          <TextField fullWidth size="small" multiline minRows={2} label="Observaciones" value={f.observaciones} onChange={e => setF(x => ({ ...x, observaciones: e.target.value }))} />
        </DialogContent>
        <DialogActions><Button onClick={() => setAbierto(false)}>Cancelar</Button><Button variant="contained" disabled={f.nombre.trim().length < 3} onClick={guardar}>Guardar</Button></DialogActions>
      </Dialog>
    </Box>
  )
}

export default function APSPlan() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<EventNote sx={{ fontSize: 28 }} />} titulo="Plan maestro (MPS / MRP)" subtitulo="APS · Qué producir, comprar y trasladar, cuánto y cuándo" color={C} />
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }} variant="scrollable">
            <Tab label="Órdenes sugeridas" /><Tab label="Detalle por producto" /><Tab label="Órdenes aprobadas" /><Tab label="Versiones" />
          </Tabs>
          {tab === 0 && <Sugeridas />}{tab === 1 && <Detalle />}{tab === 2 && <Aprobadas />}{tab === 3 && <Versiones />}
        </Paper>
      </Box>
    </Layout>
  )
}
