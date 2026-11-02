/**
 * Planta de reencauche · Carcasas y trazabilidad
 *
 * - Carcasas: lista paginada en el servidor, con búsqueda por código, DOT,
 *   serie o cliente; cada fila abre la hoja de vida.
 * - Trazabilidad hacia atrás: por lote de insumo (el proveedor avisa que un
 *   lote está defectuoso), por ciclo de vulcanización o por equipo y periodo.
 * - Conciliación: carcasas de la planta contra existencias del WMS.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, TextField, MenuItem, Button, Typography, Paper, Alert, LinearProgress } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { TireRepair } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, ESTADO_CARCASA } from '@/api/reencauche'
import { Encabezado, TablaRegistros, Cifra, errorApi } from '@/components/comun/Registro'
import { COLOR, SelectorPropietario, EstadoCarcasa, Paginacion, DialogoHojaDeVida, BotonEtiqueta } from '@/components/reencauche/comun'

function Lista({ onHoja }: { onHoja: (id: number) => void }) {
  const [q, setQ] = useState('')
  const [buscar, setBuscar] = useState('')
  const [cliente, setCliente] = useState<number | ''>('')
  const [estado, setEstado] = useState('')
  const [pag, setPag] = useState(0)
  const [por, setPor] = useState(50)
  const r = useQuery({ queryKey: ['rtm', 'carcasas', buscar, cliente, estado, pag, por],
    queryFn: () => rtm.carcasas({ q: buscar || undefined, depositante_id: cliente || undefined, estado: estado || undefined,
      limite: por, desplazamiento: pag * por }) })
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <TextField size="small" label="Código, DOT, serie o cliente" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setBuscar(q.trim()); setPag(0) } }} sx={{ minWidth: 260 }} />
        <Button variant="outlined" onClick={() => { setBuscar(q.trim()); setPag(0) }}>Buscar</Button>
        <SelectorPropietario valor={cliente} onChange={v => { setCliente(v); setPag(0) }} todos />
        <TextField select size="small" label="Estado" value={estado} onChange={e => { setEstado(e.target.value); setPag(0) }} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(ESTADO_CARCASA).map(([k, [t]]) => <MenuItem key={k} value={k}>{t}</MenuItem>)}
        </TextField>
      </Box>
      <TablaRegistros filas={r.data?.filas ?? []} cargando={r.isLoading} vacio="Sin carcasas" etiqueta={(c: any) => c.codigo}
        onFila={(c: any) => onHoja(c.id)} extra={(c: any) => <BotonEtiqueta codigos={[c.codigo]} texto="Etiqueta" />}
        columnas={[
          { titulo: 'Código', valor: (c: any) => <b style={{ fontFamily: 'monospace' }}>{c.codigo}</b> },
          { titulo: 'Cliente', valor: (c: any) => c.cliente },
          { titulo: 'Medida', valor: (c: any) => c.medida },
          { titulo: 'Marca', valor: (c: any) => `${c.marca} ${c.modelo}` },
          { titulo: 'DOT', valor: (c: any) => c.dot ?? (c.dot_ilegible ? 'Ilegible' : '—') },
          { titulo: 'Reenc.', valor: (c: any) => c.reencauches, alinear: 'right' },
          { titulo: 'Dónde está', valor: (c: any) => c.ubicacion },
          { titulo: 'Estado', valor: (c: any) => <EstadoCarcasa estado={c.estado} /> },
        ]} />
      <Paginacion total={r.data?.total ?? 0} pagina={pag} porPagina={por} onPagina={setPag} onPorPagina={setPor} />
    </>
  )
}

function Resultado({ d, onHoja }: { d: any; onHoja: (id: number) => void }) {
  return (
    <>
      <Grid container spacing={2} sx={{ my: 1 }}>
        <Grid size={{ xs: 4, md: 2 }}><Cifra etiqueta="Carcasas" valor={d.total} color={COLOR} /></Grid>
        <Grid size={{ xs: 4, md: 2 }}><Cifra etiqueta="Siguen en planta" valor={d.en_planta} color="#B45309" /></Grid>
        <Grid size={{ xs: 4, md: 2 }}><Cifra etiqueta="Ya salieron" valor={d.fuera} color="#DC2626" /></Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Por cliente</Typography>
            {d.por_cliente.map((x: any) => <Typography key={x.cliente} sx={{ fontSize: 12 }}>{x.cliente}: {x.carcasas}</Typography>)}
          </Paper>
        </Grid>
      </Grid>
      {d.ciclo && <Alert severity={d.ciclo.conforme ? 'success' : 'warning'} sx={{ mb: 1 }}>
        Ciclo {d.ciclo.codigo} {d.ciclo.conforme ? 'sin desviaciones' : 'con desviación'}
        {d.ciclo.variables && ' · ' + Object.entries(d.ciclo.variables).map(([k, v]: any) => `${k} ${v.real}`).join(' · ')}
      </Alert>}
      <TablaRegistros filas={d.carcasas.map((c: any) => ({ ...c, id: c.carcasa_id }))} vacio="Ninguna carcasa" etiqueta={(c: any) => c.codigo}
        onFila={(c: any) => onHoja(c.carcasa_id)}
        columnas={[
          { titulo: 'Código', valor: (c: any) => <b style={{ fontFamily: 'monospace' }}>{c.codigo}</b> },
          { titulo: 'Cliente', valor: (c: any) => c.cliente }, { titulo: 'Medida', valor: (c: any) => c.medida },
          { titulo: 'Orden', valor: (c: any) => c.orden }, { titulo: 'Dónde está', valor: (c: any) => c.ubicacion },
          { titulo: 'Estado', valor: (c: any) => <EstadoCarcasa estado={c.estado} /> },
        ]} />
      {d.total > d.carcasas.length && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>Se muestran {d.carcasas.length} de {d.total}.</Typography>}
    </>
  )
}

function Traza({ onHoja }: { onHoja: (id: number) => void }) {
  const [modo, setModo] = useState<'lote' | 'ciclo' | 'equipo'>('lote')
  const insumos = useQuery({ queryKey: ['rtm', 'insumos'], queryFn: () => rtm.insumos() })
  const equipos = useQuery({ queryKey: ['rtm', 'equipos'], queryFn: rtm.equipos })
  const [f, setF] = useState<any>({ producto_id: '', numero_lote: '', codigo: '', equipo_id: '', desde: '', hasta: '' })
  const [d, setD] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const consultar = async () => {
    setCargando(true)
    try {
      setD(modo === 'lote' ? await rtm.trazaLote({ producto_id: f.producto_id || undefined, numero_lote: f.numero_lote, limite: 500 })
        : modo === 'ciclo' ? await rtm.trazaCiclo(f.codigo)
        : await rtm.trazaEquipo({ equipo_id: f.equipo_id, desde: f.desde, hasta: f.hasta, limite: 500 }))
    } catch (e) { toast.error(errorApi(e, 'No se pudo consultar')); setD(null) }
    setCargando(false)
  }
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select size="small" label="Buscar por" value={modo} onChange={e => { setModo(e.target.value as any); setD(null) }} sx={{ minWidth: 180 }}>
          <MenuItem value="lote">Lote de insumo</MenuItem><MenuItem value="ciclo">Ciclo de vulcanización</MenuItem><MenuItem value="equipo">Equipo y periodo</MenuItem>
        </TextField>
        {modo === 'lote' && <>
          <TextField select size="small" label="Insumo" value={f.producto_id} onChange={e => setF({ ...f, producto_id: e.target.value })} sx={{ minWidth: 220 }}>
            <MenuItem value="">Cualquiera</MenuItem>
            {(insumos.data ?? []).map((i: any) => <MenuItem key={i.producto_id} value={i.producto_id}>{i.nombre}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Número de lote" value={f.numero_lote} onChange={e => setF({ ...f, numero_lote: e.target.value })} />
        </>}
        {modo === 'ciclo' && <TextField size="small" label="Código del ciclo (p. ej. AC1-0331)" value={f.codigo} onChange={e => setF({ ...f, codigo: e.target.value })} sx={{ minWidth: 260 }} />}
        {modo === 'equipo' && <>
          <TextField select size="small" label="Equipo" value={f.equipo_id} onChange={e => setF({ ...f, equipo_id: e.target.value })} sx={{ minWidth: 200 }}>
            {(equipos.data ?? []).map((x: any) => <MenuItem key={x.id} value={x.id}>{x.nombre}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="Desde" value={f.desde} onChange={e => setF({ ...f, desde: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="Hasta" value={f.hasta} onChange={e => setF({ ...f, hasta: e.target.value })} InputLabelProps={{ shrink: true }} />
        </>}
        <Button variant="contained" onClick={consultar} sx={{ bgcolor: COLOR }}>Consultar</Button>
      </Box>
      {cargando && <LinearProgress sx={{ mt: 1 }} />}
      {d && <Resultado d={d} onHoja={onHoja} />}
    </>
  )
}

function Conciliacion() {
  const c = useQuery({ queryKey: ['rtm', 'conciliacion'], queryFn: rtm.conciliacion })
  const nov = useQuery({ queryKey: ['rtm', 'novedades'], queryFn: () => rtm.novedades() })
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        {c.data && <Alert severity={c.data.cuadra ? 'success' : 'error'} sx={{ mb: 1 }}>
          {c.data.cuadra ? 'Las carcasas de la planta cuadran con las existencias del WMS.' : `${c.data.diferencias} diferencia(s) entre la planta y el WMS: un movimiento se hizo por fuera del flujo.`}
        </Alert>}
        <TablaRegistros filas={(c.data?.filas ?? []).map((f: any, i: number) => ({ ...f, id: i + 1 }))} cargando={c.isLoading}
          vacio="Sin carcasas en planta" etiqueta={(f: any) => f.ubicacion}
          columnas={[
            { titulo: 'Dueño', valor: (f: any) => f.depositante }, { titulo: 'Ubicación', valor: (f: any) => f.ubicacion },
            { titulo: 'Planta', valor: (f: any) => f.planta, alinear: 'right' }, { titulo: 'WMS', valor: (f: any) => f.wms, alinear: 'right' },
            { titulo: 'Diferencia', valor: (f: any) => <b style={{ color: f.diferencia ? '#DC2626' : undefined }}>{f.diferencia}</b>, alinear: 'right' },
          ]} />
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Novedades de recepción</Typography>
        <TablaRegistros filas={(nov.data ?? []).map((n: any, i: number) => ({ ...n, id: i + 1 }))} cargando={nov.isLoading}
          vacio="Sin diferencias contra remisiones" etiqueta={(n: any) => n.recepcion}
          columnas={[
            { titulo: 'Recepción', valor: (n: any) => n.recepcion }, { titulo: 'Cliente', valor: (n: any) => n.cliente },
            { titulo: 'Remitidas', valor: (n: any) => n.declaradas, alinear: 'right' }, { titulo: 'Contadas', valor: (n: any) => n.contadas, alinear: 'right' },
            { titulo: 'Dif.', valor: (n: any) => <b style={{ color: '#DC2626' }}>{n.diferencia}</b>, alinear: 'right' },
          ]} />
      </Grid>
    </Grid>
  )
}

export default function RTMCarcasas() {
  const [pestana, setPestana] = useState(0)
  const [hoja, setHoja] = useState<number | null>(null)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<TireRepair sx={{ fontSize: 28 }} />} titulo="Carcasas y trazabilidad"
          subtitulo="La historia de cada llanta y, hacia atrás, qué llantas tocó un lote, un ciclo o un equipo" color={COLOR} />
        <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }}>
          <Tab label="Carcasas" /><Tab label="Trazabilidad hacia atrás" /><Tab label="Conciliación con el WMS" />
        </Tabs>
        {pestana === 0 && <Lista onHoja={setHoja} />}
        {pestana === 1 && <Traza onHoja={setHoja} />}
        {pestana === 2 && <Conciliacion />}
        <DialogoHojaDeVida abierto={!!hoja} id={hoja ?? undefined} onCerrar={() => setHoja(null)} />
      </Box>
    </Layout>
  )
}
