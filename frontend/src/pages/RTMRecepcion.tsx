/**
 * Planta de reencauche · Recepción
 *
 * Una recepción agrupa las llantas que llegan juntas de un mismo dueño, con su
 * remisión. Cada carcasa recibe su código (consecutivo o escrito), entra al
 * WMS como unidad serializada de su dueño y queda en la cola de inspección
 * inicial. Al cerrar se ve la diferencia contra la remisión o lo recogido.
 *
 * Si la llanta ya pasó por la planta (mismo código, DOT o serie), se propone
 * usar la misma carcasa con su historia.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Button, TextField, MenuItem, Checkbox, FormControlLabel, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Tabs, Tab,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { MoveToInbox, Add, Lock, Inventory } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, fechaHora } from '@/api/reencauche'
import { Encabezado, TablaRegistros, Etiqueta, errorApi } from '@/components/comun/Registro'
import {
  COLOR, SelectorPropietario, usePropietarios, BotonEtiqueta, EstadoCarcasa, Paginacion, DialogoHojaDeVida,
} from '@/components/reencauche/comun'

const VACIA = { codigo: '', marca: '', medida: '', modelo: '', dot: '', dot_ilegible: false, serie: '', profundidad_mm: '',
  estado_costados: '', reencauches: '', posicion_anterior: '', observaciones: '', costo_compra: '', banda_producto_id: '', prioridad: 3 }

function NuevaRecepcion({ abierto, onCerrar, onCreada }: { abierto: boolean; onCerrar: () => void; onCreada: (id: number) => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState<any>({ depositante_id: '', remision: '', cantidad_declarada: '', placa: '', entrega_nombre: '' })
  const [nuevo, setNuevo] = useState<{ nombre: string; nit: string } | null>(null)
  const guardar = async () => {
    try {
      const r = await rtm.crearRecepcion({ ...f, depositante_id: f.depositante_id || null, remision: f.remision || null,
        cantidad_declarada: f.cantidad_declarada === '' ? null : Number(f.cantidad_declarada) })
      toast.success(`Recepción ${r.codigo} abierta`); onCreada(r.id); onCerrar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  const crearCliente = async () => {
    try {
      const d = await rtm.crearPropietario({ nombre: nuevo!.nombre, nit: nuevo!.nit || null })
      await qc.invalidateQueries({ queryKey: ['rtm', 'propietarios'] }); setF({ ...f, depositante_id: d.id }); setNuevo(null)
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva recepción</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12} sx={{ display: 'flex', gap: 1 }}>
            <SelectorPropietario valor={f.depositante_id} onChange={v => setF({ ...f, depositante_id: v })} etiqueta="Propietario de las llantas" ancho={340} />
            <Button size="small" onClick={() => setNuevo({ nombre: '', nit: '' })}>Cliente nuevo</Button>
          </Grid>
          {nuevo && <Grid size={12} sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" label="Nombre" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
            <TextField size="small" label="NIT" value={nuevo.nit} onChange={e => setNuevo({ ...nuevo, nit: e.target.value })} />
            <Button onClick={crearCliente} disabled={nuevo.nombre.trim().length < 2}>Crear</Button>
          </Grid>}
          <Grid size={6}><TextField fullWidth size="small" label="Remisión del cliente" value={f.remision} onChange={e => setF({ ...f, remision: e.target.value })} helperText="Sin remisión, la declarada será la contada" /></Grid>
          <Grid size={6}><TextField fullWidth size="small" type="number" label="Cantidad remitida" value={f.cantidad_declarada} onChange={e => setF({ ...f, cantidad_declarada: e.target.value })} /></Grid>
          <Grid size={6}><TextField fullWidth size="small" label="Placa (si el cliente las trae)" value={f.placa} onChange={e => setF({ ...f, placa: e.target.value.toUpperCase() })} /></Grid>
          <Grid size={6}><TextField fullWidth size="small" label="Quién entrega" value={f.entrega_nombre} onChange={e => setF({ ...f, entrega_nombre: e.target.value })} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions><Button onClick={onCerrar}>Cancelar</Button><Button variant="contained" onClick={guardar} disabled={!f.depositante_id}>Abrir recepción</Button></DialogActions>
    </Dialog>
  )
}

function Registro({ rid }: { rid: number }) {
  const qc = useQueryClient()
  const r = useQuery({ queryKey: ['rtm', 'recepcion', rid], queryFn: () => rtm.recepcion(rid) })
  const bandas = useQuery({ queryKey: ['rtm', 'insumos', 'BANDA'], queryFn: () => rtm.insumos('BANDA') })
  const props = usePropietarios()
  const [f, setF] = useState<any>(VACIA)
  const [coinc, setCoinc] = useState<any[]>([])
  const [hoja, setHoja] = useState<number | null>(null)
  const rec = r.data
  const propia = !!props.data?.find((p: any) => p.id === rec?.depositante_id)?.propio
  const buscar = async () => {
    if (!f.dot && !f.serie && !f.codigo) return setCoinc([])
    setCoinc(await rtm.coincidencias({ dot: f.dot || undefined, serie: f.serie || undefined, codigo: f.codigo || undefined }))
  }
  const registrar = async (carcasaId?: number) => {
    try {
      const cuerpo = carcasaId ? { carcasa_id: carcasaId, banda_producto_id: f.banda_producto_id || null, prioridad: f.prioridad }
        : Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]))
      const x = await rtm.registrarCarcasa(rid, cuerpo)
      toast.success(`${x.codigo} registrada${x.numero_reencauche > 1 ? ` (reencauche nº ${x.numero_reencauche})` : ''}`)
      setF({ ...VACIA, marca: f.marca, medida: f.medida, modelo: f.modelo, banda_producto_id: f.banda_producto_id }); setCoinc([])
      qc.invalidateQueries({ queryKey: ['rtm', 'recepcion', rid] }); qc.invalidateQueries({ queryKey: ['rtm', 'recepciones'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  const cerrar = async () => {
    try {
      const x = await rtm.cerrarRecepcion(rid)
      toast[x.diferencia ? 'error' : 'success'](x.diferencia ? `Cerrada con diferencia ${x.diferencia > 0 ? '+' : ''}${x.diferencia}` : 'Recepción cerrada sin diferencia')
      qc.invalidateQueries({ queryKey: ['rtm'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  if (!rec) return null
  const abierta = rec.estado === 'EN_CURSO'
  const campo = (k: string, etiqueta: string, ancho = 3, extra: any = {}) => (
    <Grid size={{ xs: 12, sm: 6, md: ancho }}><TextField fullWidth size="small" label={etiqueta} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} {...extra} /></Grid>
  )
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>{rec.codigo} · {rec.cliente}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Remisión {rec.remision ?? '—'} · remitidas {rec.cantidad_declarada ?? 'sin dato'} · registradas {rec.registradas}
            {rec.viaje_id ? ' · llegó en un viaje de recogida' : ''}{rec.eam_lote_id ? ' · lote de Gestión de Activos' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {!abierta && <Etiqueta texto={rec.diferencia ? `Diferencia ${rec.diferencia > 0 ? '+' : ''}${rec.diferencia}` : 'Cuadrada'} color={rec.diferencia ? '#DC2626' : '#15803D'} />}
          <BotonEtiqueta codigos={(rec.carcasas ?? []).map((c: any) => c.codigo)} texto="Etiquetas de todas" />
          {abierta && <Button variant="contained" color="warning" startIcon={<Lock />} onClick={cerrar}>Cerrar recepción</Button>}
        </Box>
      </Box>
      {abierta && <>
        <Grid container spacing={1.5} sx={{ mb: 1 }}>
          {campo('marca', 'Marca *')}{campo('medida', 'Medida *', 3, { placeholder: '295/80 R22.5' })}{campo('modelo', 'Modelo *')}
          {campo('codigo', 'Código (vacío = consecutivo)', 3, { onBlur: buscar })}
          {campo('dot', 'DOT', 2, { onBlur: buscar, disabled: f.dot_ilegible })}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}><FormControlLabel control={<Checkbox checked={f.dot_ilegible} onChange={e => setF({ ...f, dot_ilegible: e.target.checked, dot: '' })} />} label="DOT ilegible" /></Grid>
          {campo('serie', 'Serie', 2, { onBlur: buscar })}{campo('profundidad_mm', 'Profundidad (mm)', 2, { type: 'number' })}
          {campo('reencauches', 'Reencauches previos', 2, { type: 'number' })}{campo('estado_costados', 'Estado de los costados', 4)}
          {campo('posicion_anterior', 'Posición anterior', 2)}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField select fullWidth size="small" label="Banda pedida" value={f.banda_producto_id} onChange={e => setF({ ...f, banda_producto_id: e.target.value })}>
              <MenuItem value="">Sin definir</MenuItem>
              {(bandas.data ?? []).map((b: any) => <MenuItem key={b.producto_id} value={b.producto_id}>{b.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField select fullWidth size="small" label="Prioridad" value={f.prioridad} onChange={e => setF({ ...f, prioridad: Number(e.target.value) })}>
              {[[1, 'Urgente'], [2, 'Alta'], [3, 'Normal'], [4, 'Baja'], [5, 'Muy baja']].map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          {propia && campo('costo_compra', 'Costo de compra', 2, { type: 'number' })}
          {campo('observaciones', 'Observaciones', propia ? 5 : 7)}
        </Grid>
        {coinc.length > 0 && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Esta llanta ya pasó por la planta:
            {coinc.map(c => (
              <Box key={c.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                <b>{c.codigo}</b> · {c.medida} · {c.cliente} · <EstadoCarcasa estado={c.estado} />
                <Button size="small" onClick={() => setHoja(c.id)}>Historia</Button>
                {c.puede_volver ? <Button size="small" variant="contained" onClick={() => registrar(c.id)}>Usar esta carcasa</Button>
                  : <Typography sx={{ fontSize: 12 }}>(sigue en la planta)</Typography>}
              </Box>
            ))}
          </Alert>
        )}
        <Button variant="contained" startIcon={<Add />} onClick={() => registrar()} disabled={!f.marca || !f.medida || !f.modelo}
          sx={{ bgcolor: COLOR, mb: 2 }}>Registrar carcasa</Button>
      </>}
      <TablaRegistros filas={rec.carcasas ?? []} vacio="Sin carcasas registradas" etiqueta={(c: any) => c.codigo} onFila={(c: any) => setHoja(c.id)}
        extra={(c: any) => <BotonEtiqueta codigos={[c.codigo]} texto="Etiqueta" />}
        columnas={[
          { titulo: 'Código', valor: (c: any) => <b style={{ fontFamily: 'monospace' }}>{c.codigo}</b> },
          { titulo: 'Medida', valor: (c: any) => c.medida },
          { titulo: 'Marca y modelo', valor: (c: any) => `${c.marca} ${c.modelo}` },
          { titulo: 'DOT', valor: (c: any) => c.dot ?? (c.dot_ilegible ? 'Ilegible' : '—') },
          { titulo: 'Reenc.', valor: (c: any) => c.reencauches, alinear: 'right' },
          { titulo: 'Estado', valor: (c: any) => <EstadoCarcasa estado={c.estado} /> },
        ]} />
      <DialogoHojaDeVida abierto={!!hoja} id={hoja ?? undefined} onCerrar={() => setHoja(null)} />
    </Paper>
  )
}

function PorRecibir({ onCreada }: { onCreada: (id: number) => void }) {
  const qc = useQueryClient()
  const recogidas = useQuery({ queryKey: ['rtm', 'recogidas', 'RECOGIDA'], queryFn: () => rtm.recogidas('RECOGIDA') })
  const lotes = useQuery({ queryKey: ['rtm', 'cmms', 'lotes'], queryFn: rtm.lotesCmms })
  const desdeRecogida = async (s: any) => {
    try { const r = await rtm.crearRecepcion({ solicitud_id: s.id }); toast.success(`Recepción ${r.codigo} con ${s.recogidas} llantas declaradas`); onCreada(r.id); qc.invalidateQueries({ queryKey: ['rtm'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  const desdeLote = async (l: any) => {
    try { const r = await rtm.recibirLoteCmms(l.id); toast.success(`Recepción ${r.codigo}: ${r.carcasas} llantas del lote ${l.codigo}`); onCreada(r.recepcion_id); qc.invalidateQueries({ queryKey: ['rtm'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Recogidas que llegaron en un viaje</Typography>
        <TablaRegistros filas={recogidas.data ?? []} cargando={recogidas.isLoading} vacio="No hay recogidas por recibir" etiqueta={(s: any) => s.codigo}
          extra={(s: any) => <Button size="small" variant="outlined" onClick={() => desdeRecogida(s)}>Recibir</Button>}
          columnas={[
            { titulo: 'Recogida', valor: (s: any) => s.codigo }, { titulo: 'Cliente', valor: (s: any) => s.cliente },
            { titulo: 'Viaje', valor: (s: any) => s.viaje }, { titulo: 'Recogidas', valor: (s: any) => s.recogidas, alinear: 'right' },
            { titulo: 'Remisión', valor: (s: any) => s.remision ?? '—' },
          ]} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Lotes de reencauche de la flota (Gestión de Activos)</Typography>
        <TablaRegistros filas={lotes.data ?? []} cargando={lotes.isLoading} vacio="No hay lotes de Gestión de Activos por recibir" etiqueta={(l: any) => l.codigo}
          extra={(l: any) => <Button size="small" variant="outlined" startIcon={<Inventory />} onClick={() => desdeLote(l)}>Recibir lote</Button>}
          columnas={[
            { titulo: 'Lote', valor: (l: any) => l.codigo }, { titulo: 'Enviado', valor: (l: any) => l.fecha_envio },
            { titulo: 'Proveedor', valor: (l: any) => l.proveedor ?? '—' }, { titulo: 'Llantas', valor: (l: any) => l.llantas, alinear: 'right' },
          ]} />
      </Grid>
    </Grid>
  )
}

export default function RTMRecepcion() {
  const [pestana, setPestana] = useState(0)
  const [nueva, setNueva] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [estado, setEstado] = useState('')
  const [pag, setPag] = useState(0)
  const [por, setPor] = useState(25)
  const lista = useQuery({ queryKey: ['rtm', 'recepciones', estado, pag, por],
    queryFn: () => rtm.recepciones({ estado: estado || undefined, limite: por, desplazamiento: pag * por }) })
  const abrir = (id: number) => { setSel(id); setPestana(0) }
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<MoveToInbox sx={{ fontSize: 28 }} />} titulo="Recepción de carcasas"
          subtitulo="Cada llanta con su código, su dueño y su estado de llegada, contra la remisión" color={COLOR}
          accion="Nueva recepción" onAccion={() => setNueva(true)} />
        <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }}>
          <Tab label="Recepciones" /><Tab label="Por recibir (recogidas y CMMS)" />
        </Tabs>
        {pestana === 0 && <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: sel ? 4 : 12 }}>
            <TextField select size="small" label="Estado" value={estado} onChange={e => { setEstado(e.target.value); setPag(0) }} sx={{ mb: 1, minWidth: 160 }}>
              <MenuItem value="">Todas</MenuItem><MenuItem value="EN_CURSO">En curso</MenuItem><MenuItem value="CERRADA">Cerradas</MenuItem>
            </TextField>
            <TablaRegistros filas={lista.data?.filas ?? []} cargando={lista.isLoading} vacio="Sin recepciones" etiqueta={(r: any) => r.codigo}
              onFila={(r: any) => setSel(r.id)}
              columnas={[
                { titulo: 'Recepción', valor: (r: any) => <b>{r.codigo}</b> },
                { titulo: 'Cliente', valor: (r: any) => r.cliente },
                { titulo: 'Llantas', valor: (r: any) => `${r.registradas}${r.cantidad_declarada != null ? ` / ${r.cantidad_declarada}` : ''}`, alinear: 'right' },
                { titulo: 'Estado', valor: (r: any) => r.estado === 'EN_CURSO' ? <Chip size="small" label="En curso" color="info" />
                  : <Etiqueta texto={r.diferencia ? `Dif. ${r.diferencia}` : 'Cerrada'} color={r.diferencia ? '#DC2626' : '#15803D'} /> },
                ...(sel ? [] : [{ titulo: 'Abierta', valor: (r: any) => fechaHora(r.creada_en) }]),
              ]} />
            <Paginacion total={lista.data?.total ?? 0} pagina={pag} porPagina={por} onPagina={setPag} onPorPagina={setPor} />
          </Grid>
          {sel && <Grid size={{ xs: 12, lg: 8 }}><Registro rid={sel} /></Grid>}
        </Grid>}
        {pestana === 1 && <PorRecibir onCreada={abrir} />}
        <NuevaRecepcion abierto={nueva} onCerrar={() => setNueva(false)} onCreada={abrir} />
      </Box>
    </Layout>
  )
}
