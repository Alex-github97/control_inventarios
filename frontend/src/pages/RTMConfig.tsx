/**
 * Planta de reencauche · Configuración
 *
 * Planta (almacén del WMS y sus zonas), equipos con su ubicación de estación,
 * rutas y etapas, especificaciones por medida y banda, límites de reparación,
 * defectos y motivos de rechazo, insumos, recetas de vulcanización, tarifas y
 * los roles de la planta. Lo sembrado es plantilla editable; las recetas no se
 * siembran: las define la planta según el fabricante.
 */
import { useEffect, useState } from 'react'
import {
  Box, Tabs, Tab, TextField, Button, MenuItem, Switch, FormControlLabel, Alert, Typography, Paper, Checkbox, IconButton,
  Autocomplete, Chip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Settings, Save, ArrowUpward, ArrowDownward, ContentCopy } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, pesos } from '@/api/reencauche'
import { Encabezado, TablaRegistros, FormularioRegistro, Etiqueta, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR, usePropietarios } from '@/components/reencauche/comun'

const CLASES = ['BANDA', 'COJIN', 'CEMENTO', 'PARCHE', 'RELLENO', 'COMPUESTO']
const MEDICIONES = [['diametro', 'Diámetro de raspado (mm)'], ['ancho', 'Ancho de raspado (mm)'], ['radio', 'Radio de corona (mm)'],
  ['longitud_banda', 'Longitud de banda (m)'], ['centrado', 'Desviación de centrado (mm)'], ['profundidad_final', 'Profundidad final (mm)'],
  ['profundidad_remanente', 'Profundidad remanente al recibir (mm)']]

function Planta() {
  const qc = useQueryClient()
  const p = useQuery({ queryKey: ['rtm', 'planta'], queryFn: rtm.planta })
  const alms = useQuery({ queryKey: ['rtm', 'almacenes'], queryFn: rtm.almacenes })
  const [f, setF] = useState<any>(null)
  useEffect(() => { if (p.data && !f) setF({ ...p.data }) }, [p.data])  // eslint-disable-line react-hooks/exhaustive-deps
  if (!f) return null
  const guardar = async () => {
    try {
      await rtm.guardarPlanta({ almacen_id: f.almacen_id || null, prefijo_codigo: f.prefijo_codigo, cargo_inspeccion: Number(f.cargo_inspeccion),
        permite_venta_rechazo: f.permite_venta_rechazo, costo_hora_mano_obra: Number(f.costo_hora_mano_obra) })
      toast.success('Planta guardada'); setF(null); qc.invalidateQueries({ queryKey: ['rtm'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, maxWidth: 820 }}>
      {!p.data?.lista && <Alert severity="warning" sx={{ mb: 2 }}>Elija el almacén del WMS donde opera la planta: se crean las zonas de recepción, producción, insumos, terminado y rechazos.</Alert>}
      <Grid container spacing={2}>
        <Grid size={6}><TextField select fullWidth size="small" label="Almacén del WMS" value={f.almacen_id ?? ''} onChange={e => setF({ ...f, almacen_id: Number(e.target.value) })}>
          {(alms.data ?? []).map((a: any) => <MenuItem key={a.id} value={a.id}>{a.nombre}{a.ciudad ? ` · ${a.ciudad}` : ''}</MenuItem>)}</TextField></Grid>
        <Grid size={3}><TextField fullWidth size="small" label="Prefijo de códigos" value={f.prefijo_codigo} onChange={e => setF({ ...f, prefijo_codigo: e.target.value })} helperText={`Último: ${f.consecutivo}`} /></Grid>
        <Grid size={3}><TextField fullWidth size="small" type="number" label="Cargo por inspección de rechazo" value={f.cargo_inspeccion} onChange={e => setF({ ...f, cargo_inspeccion: e.target.value })} helperText={pesos(Number(f.cargo_inspeccion))} /></Grid>
        <Grid size={4}><TextField fullWidth size="small" type="number" label="Costo hora de mano de obra" value={f.costo_hora_mano_obra} onChange={e => setF({ ...f, costo_hora_mano_obra: e.target.value })} helperText="Para el costo por llanta" /></Grid>
        <Grid size={8}><FormControlLabel control={<Switch checked={f.permite_venta_rechazo} onChange={e => setF({ ...f, permite_venta_rechazo: e.target.checked })} />}
          label="Vender como carcasa no apta las rechazadas de la planta" /></Grid>
      </Grid>
      {p.data?.lista && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 2 }}>
        {Object.values(p.data.ubicaciones).map((u: any) => <Chip key={u.nombre} label={`${u.nombre}: ${u.codigo}`} size="small" />)}
      </Box>}
      <Button variant="contained" startIcon={<Save />} onClick={guardar} sx={{ bgcolor: COLOR, mt: 1 }}>Guardar</Button>
    </Paper>
  )
}

function Equipos() {
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: ['rtm', 'equipos'], queryFn: rtm.equipos })
  const tipos = useQuery({ queryKey: ['rtm', 'tipos-equipo'], queryFn: rtm.tiposEquipo })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: any }>({ abierto: false, r: null })
  const campos: Campo[] = [
    { clave: 'codigo', etiqueta: 'Código (se escanea en la terminal)', obligatorio: true, ancho: 6 },
    { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true, ancho: 6 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: (tipos.data ?? []).map(t => [t, t.toLowerCase()] as [string, string]) },
    { clave: 'capacidad', etiqueta: 'Capacidad (llantas por ciclo)', tipo: 'numero', min: 1, ancho: 6 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', ancho: 6, opciones: [['ACTIVO', 'Activo'], ['MANTENIMIENTO', 'Mantenimiento'], ['INACTIVO', 'Inactivo']] },
    { clave: 'eam_activo_id', etiqueta: 'Activo de Gestión de Activos (id, opcional)', tipo: 'numero', ancho: 6 },
  ]
  return (
    <>
      <Button variant="contained" onClick={() => setDlg({ abierto: true, r: null })} sx={{ bgcolor: COLOR, mb: 1.5 }}>Nuevo equipo</Button>
      <TablaRegistros filas={lista.data ?? []} cargando={lista.isLoading} vacio="Sin equipos" etiqueta={(e: any) => e.nombre}
        onEditar={(e: any) => setDlg({ abierto: true, r: e })}
        columnas={[
          { titulo: 'Código', valor: (e: any) => <b>{e.codigo}</b> }, { titulo: 'Nombre', valor: (e: any) => e.nombre },
          { titulo: 'Tipo', valor: (e: any) => e.tipo.toLowerCase() }, { titulo: 'Capacidad', valor: (e: any) => e.capacidad, alinear: 'right' },
          { titulo: 'Ubicación WMS', valor: (e: any) => e.ubicacion ?? <span style={{ color: '#DC2626' }}>Sin ubicación: no registra en la terminal</span> },
          { titulo: 'Estado', valor: (e: any) => <Etiqueta texto={e.estado.toLowerCase()} color={e.estado === 'ACTIVO' ? '#15803D' : '#64748B'} /> },
        ]} />
      <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? 'Editar equipo' : 'Nuevo equipo'} campos={campos} registro={dlg.r}
        valoresIniciales={{ capacidad: 1, estado: 'ACTIVO' }} onCerrar={() => setDlg({ abierto: false, r: null })}
        onGuardar={async c => {
          const cuerpo = { ...c, capacidad: c.capacidad ?? 1, estado: c.estado ?? 'ACTIVO' }
          dlg.r ? await rtm.editarEquipo(dlg.r.id, cuerpo) : await rtm.crearEquipo(cuerpo)
          toast.success('Equipo guardado'); qc.invalidateQueries({ queryKey: ['rtm', 'equipos'] })
        }} />
    </>
  )
}

function Rutas() {
  const qc = useQueryClient()
  const rutas = useQuery({ queryKey: ['rtm', 'rutas'], queryFn: rtm.rutas })
  const etapas = useQuery({ queryKey: ['rtm', 'etapas'], queryFn: rtm.etapas })
  const [ed, setEd] = useState<any>(null)
  const guardar = async () => {
    try {
      const cuerpo = { codigo: ed.codigo, nombre: ed.nombre, descripcion: ed.descripcion, por_defecto: ed.por_defecto, activo: ed.activo,
        etapas: ed.etapas.map((e: any) => ({ etapa_id: e.etapa_id, obligatoria: e.obligatoria })) }
      ed.id ? await rtm.editarRuta(ed.id, cuerpo) : await rtm.crearRuta(cuerpo)
      toast.success('Ruta guardada'); setEd(null); qc.invalidateQueries({ queryKey: ['rtm', 'rutas'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  const mover = (i: number, d: number) => { const x = [...ed.etapas]; [x[i], x[i + d]] = [x[i + d], x[i]]; setEd({ ...ed, etapas: x }) }
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 5 }}>
        <TablaRegistros filas={rutas.data ?? []} cargando={rutas.isLoading} vacio="Sin rutas" etiqueta={(r: any) => r.nombre}
          onEditar={(r: any) => setEd(JSON.parse(JSON.stringify(r)))}
          extra={(r: any) => <IconButton size="small" title="Crear variante" onClick={() => setEd({ ...JSON.parse(JSON.stringify(r)), id: null, codigo: `${r.codigo}-V`, nombre: `${r.nombre} (variante)`, por_defecto: false })}><ContentCopy fontSize="small" /></IconButton>}
          columnas={[
            { titulo: 'Ruta', valor: (r: any) => <><b>{r.nombre}</b>{r.por_defecto && <Chip size="small" label="Por defecto" sx={{ ml: 1 }} />}</> },
            { titulo: 'Etapas', valor: (r: any) => r.etapas.length, alinear: 'right' },
            { titulo: 'Abiertas', valor: (r: any) => r.ordenes_abiertas, alinear: 'right' },
            { titulo: 'Activa', valor: (r: any) => r.activo ? 'Sí' : 'No' },
          ]} />
        <Alert severity="info" sx={{ mt: 1.5 }}>Una ruta con órdenes abiertas no cambia sus etapas: cree una variante y desactive la original; las órdenes abiertas siguen su curso.</Alert>
      </Grid>
      {ed && <Grid size={{ xs: 12, md: 7 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Grid container spacing={1.5} sx={{ mb: 1 }}>
            <Grid size={4}><TextField fullWidth size="small" label="Código" value={ed.codigo} onChange={e => setEd({ ...ed, codigo: e.target.value })} /></Grid>
            <Grid size={8}><TextField fullWidth size="small" label="Nombre" value={ed.nombre} onChange={e => setEd({ ...ed, nombre: e.target.value })} /></Grid>
            <Grid size={6}><FormControlLabel control={<Switch checked={ed.activo} onChange={e => setEd({ ...ed, activo: e.target.checked })} />} label="Activa" /></Grid>
            <Grid size={6}><FormControlLabel control={<Switch checked={ed.por_defecto} onChange={e => setEd({ ...ed, por_defecto: e.target.checked })} />} label="Por defecto" /></Grid>
          </Grid>
          {ed.etapas.map((e: any, i: number) => (
            <Box key={e.etapa_id} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, py: 0.25 }}>
              <Typography sx={{ width: 22, fontSize: 12, color: 'text.secondary' }}>{i + 1}</Typography>
              <Box sx={{ flex: 1 }}>{e.nombre}{e.decision && <Chip size="small" label="Decisión" sx={{ ml: 1, height: 18, fontSize: 10 }} />}</Box>
              <FormControlLabel control={<Checkbox size="small" checked={e.obligatoria} onChange={x => setEd({ ...ed, etapas: ed.etapas.map((y: any, j: number) => j === i ? { ...y, obligatoria: x.target.checked } : y) })} />} label="Obligatoria" />
              <IconButton size="small" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUpward fontSize="small" /></IconButton>
              <IconButton size="small" disabled={i === ed.etapas.length - 1} onClick={() => mover(i, 1)}><ArrowDownward fontSize="small" /></IconButton>
              <Button size="small" color="error" onClick={() => setEd({ ...ed, etapas: ed.etapas.filter((_: any, j: number) => j !== i) })}>Quitar</Button>
            </Box>
          ))}
          <Autocomplete size="small" options={(etapas.data ?? []).filter((x: any) => !ed.etapas.some((y: any) => y.etapa_id === x.id))} getOptionLabel={(x: any) => x.nombre}
            value={null} onChange={(_, x: any) => x && setEd({ ...ed, etapas: [...ed.etapas, { etapa_id: x.id, nombre: x.nombre, obligatoria: true, decision: x.decision }] })}
            renderInput={p => <TextField {...p} label="Agregar etapa" />} sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', gap: 1 }}><Button variant="contained" startIcon={<Save />} onClick={guardar} sx={{ bgcolor: COLOR }}>Guardar ruta</Button><Button onClick={() => setEd(null)}>Cancelar</Button></Box>
        </Paper>
      </Grid>}
    </Grid>
  )
}

function Especificaciones() {
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: ['rtm', 'especificaciones'], queryFn: rtm.especificaciones })
  const bandas = useQuery({ queryKey: ['rtm', 'insumos', 'BANDA'], queryFn: () => rtm.insumos('BANDA') })
  const [ed, setEd] = useState<any>(null)
  const nuevo = () => setEd({ medida: '', banda_producto_id: '', limites: {}, longitud_banda_m: '', longitud_cojin_m: '', cemento_estandar: '', activo: true })
  const lim = (k: string, m: 'min' | 'max', v: string) => setEd({ ...ed, limites: { ...ed.limites, [k]: { ...(ed.limites[k] ?? {}), [m]: v === '' ? null : Number(v) } } })
  const guardar = async () => {
    const n = (v: any) => (v === '' || v == null ? null : Number(v))
    try {
      const cuerpo = { ...ed, banda_producto_id: ed.banda_producto_id || null, longitud_banda_m: n(ed.longitud_banda_m), longitud_cojin_m: n(ed.longitud_cojin_m), cemento_estandar: n(ed.cemento_estandar) }
      ed.id ? await rtm.editarEspecificacion(ed.id, cuerpo) : await rtm.crearEspecificacion(cuerpo)
      toast.success('Especificación guardada'); setEd(null); qc.invalidateQueries({ queryKey: ['rtm', 'especificaciones'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Button variant="contained" onClick={nuevo} sx={{ bgcolor: COLOR, mb: 1.5 }}>Nueva especificación</Button>
        <TablaRegistros filas={lista.data ?? []} cargando={lista.isLoading} vacio="Sin especificaciones: las mediciones se registran sin comparar" etiqueta={(e: any) => e.medida}
          onEditar={(e: any) => setEd({ ...e, banda_producto_id: e.banda_producto_id ?? '' })}
          columnas={[{ titulo: 'Medida', valor: (e: any) => <b>{e.medida}</b> }, { titulo: 'Banda', valor: (e: any) => e.banda ?? 'Cualquiera' },
            { titulo: 'Banda (m)', valor: (e: any) => e.longitud_banda_m ?? '—', alinear: 'right' }]} />
      </Grid>
      {ed && <Grid size={{ xs: 12, md: 7 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Grid container spacing={1.5}>
            <Grid size={6}><TextField fullWidth size="small" label="Medida" placeholder="295/80 R22.5" value={ed.medida} onChange={e => setEd({ ...ed, medida: e.target.value })} /></Grid>
            <Grid size={6}><TextField select fullWidth size="small" label="Banda" value={ed.banda_producto_id} onChange={e => setEd({ ...ed, banda_producto_id: e.target.value })}>
              <MenuItem value="">Cualquier banda</MenuItem>{(bandas.data ?? []).map((b: any) => <MenuItem key={b.producto_id} value={b.producto_id}>{b.nombre}</MenuItem>)}</TextField></Grid>
            {MEDICIONES.map(([k, t]) => (
              <Grid key={k} size={12} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography sx={{ flex: 1, fontSize: 13 }}>{t}</Typography>
                <TextField size="small" type="number" label="Mín" value={ed.limites[k]?.min ?? ''} onChange={e => lim(k, 'min', e.target.value)} sx={{ width: 110 }} inputProps={{ step: 'any' }} />
                <TextField size="small" type="number" label="Máx" value={ed.limites[k]?.max ?? ''} onChange={e => lim(k, 'max', e.target.value)} sx={{ width: 110 }} inputProps={{ step: 'any' }} />
              </Grid>
            ))}
            <Grid size={4}><TextField fullWidth size="small" type="number" label="Banda a cortar (m)" value={ed.longitud_banda_m ?? ''} onChange={e => setEd({ ...ed, longitud_banda_m: e.target.value })} /></Grid>
            <Grid size={4}><TextField fullWidth size="small" type="number" label="Cojín (m)" value={ed.longitud_cojin_m ?? ''} onChange={e => setEd({ ...ed, longitud_cojin_m: e.target.value })} /></Grid>
            <Grid size={4}><TextField fullWidth size="small" type="number" label="Cemento estándar" value={ed.cemento_estandar ?? ''} onChange={e => setEd({ ...ed, cemento_estandar: e.target.value })} /></Grid>
          </Grid>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}><Button variant="contained" startIcon={<Save />} onClick={guardar} sx={{ bgcolor: COLOR }}>Guardar</Button><Button onClick={() => setEd(null)}>Cancelar</Button></Box>
        </Paper>
      </Grid>}
    </Grid>
  )
}

function Calidad() {
  const qc = useQueryClient()
  const limites = useQuery({ queryKey: ['rtm', 'limites'], queryFn: rtm.limites })
  const defectos = useQuery({ queryKey: ['rtm', 'defectos'], queryFn: rtm.defectos })
  const motivos = useQuery({ queryKey: ['rtm', 'motivos'], queryFn: rtm.motivos })
  const [lim, setLim] = useState({ ubicacion: 'CORONA', tipo_dano: 'CORTE', tamano_max_mm: '' })
  const [def, setDef] = useState({ nombre: '', zona: 'BANDA' })
  const [mot, setMot] = useState('')
  const refrescar = () => qc.invalidateQueries({ queryKey: ['rtm'] })
  const intentar = async (f: () => Promise<any>, ok: string) => { try { await f(); toast.success(ok); refrescar() } catch (e) { toast.error(errorApi(e)) } }
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Límites de reparación</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField select size="small" value={lim.ubicacion} onChange={e => setLim({ ...lim, ubicacion: e.target.value })}>{['CORONA', 'HOMBRO', 'COSTADO', 'TALON', 'INTERIOR'].map(x => <MenuItem key={x} value={x}>{x.toLowerCase()}</MenuItem>)}</TextField>
          <TextField size="small" label="Daño" value={lim.tipo_dano} onChange={e => setLim({ ...lim, tipo_dano: e.target.value.toUpperCase() })} sx={{ width: 120 }} />
          <TextField size="small" type="number" label="Máx mm" value={lim.tamano_max_mm} onChange={e => setLim({ ...lim, tamano_max_mm: e.target.value })} sx={{ width: 90 }} />
          <Button onClick={() => intentar(() => rtm.guardarLimite({ ...lim, tamano_max_mm: Number(lim.tamano_max_mm) }), 'Límite guardado')} disabled={lim.tamano_max_mm === ''}>Guardar</Button>
        </Box>
        <TablaRegistros filas={limites.data ?? []} vacio="Sin límites" etiqueta={(l: any) => l.ubicacion} onFila={(l: any) => setLim({ ubicacion: l.ubicacion, tipo_dano: l.tipo_dano, tamano_max_mm: String(l.tamano_max_mm) })}
          columnas={[{ titulo: 'Ubicación', valor: (l: any) => l.ubicacion.toLowerCase() }, { titulo: 'Daño', valor: (l: any) => l.tipo_dano.toLowerCase() },
            { titulo: 'Máx mm', valor: (l: any) => l.tamano_max_mm, alinear: 'right' },
            { titulo: '', valor: (l: any) => l.plantilla ? <Etiqueta texto="Plantilla" color="#B45309" /> : '' }]} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Defectos por zona</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField select size="small" value={def.zona} onChange={e => setDef({ ...def, zona: e.target.value })}>{['BANDA', 'HOMBROS', 'COSTADOS', 'TALONES', 'INTERIOR', 'CARCASA_RASPADA'].map(x => <MenuItem key={x} value={x}>{x.toLowerCase().replace('_', ' ')}</MenuItem>)}</TextField>
          <TextField size="small" label="Defecto" value={def.nombre} onChange={e => setDef({ ...def, nombre: e.target.value })} sx={{ flex: 1 }} />
          <Button onClick={() => intentar(() => rtm.crearDefecto(def), 'Defecto agregado').then(() => setDef({ ...def, nombre: '' }))} disabled={def.nombre.length < 2}>Agregar</Button>
        </Box>
        <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
          <TablaRegistros filas={defectos.data ?? []} vacio="Sin defectos" etiqueta={(d: any) => d.nombre}
            columnas={[{ titulo: 'Zona', valor: (d: any) => d.zona.toLowerCase().replace('_', ' ') }, { titulo: 'Defecto', valor: (d: any) => d.nombre },
              { titulo: 'Activo', valor: (d: any) => <Switch size="small" checked={d.activo} onChange={e => intentar(() => rtm.editarDefecto(d.id, { nombre: d.nombre, zona: d.zona, activo: e.target.checked }), 'Defecto actualizado')} /> }]} />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Motivos de rechazo</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField size="small" label="Motivo" value={mot} onChange={e => setMot(e.target.value)} sx={{ flex: 1 }} />
          <Button onClick={() => intentar(() => rtm.crearMotivo({ nombre: mot }), 'Motivo agregado').then(() => setMot(''))} disabled={mot.length < 2}>Agregar</Button>
        </Box>
        <TablaRegistros filas={motivos.data ?? []} vacio="Sin motivos" etiqueta={(m: any) => m.nombre}
          columnas={[{ titulo: 'Motivo', valor: (m: any) => m.nombre },
            { titulo: 'Activo', valor: (m: any) => <Switch size="small" checked={m.activo} onChange={e => intentar(() => rtm.editarMotivo(m.id, { nombre: m.nombre, activo: e.target.checked }), 'Motivo actualizado')} /> }]} />
      </Grid>
    </Grid>
  )
}

function Insumos() {
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: ['rtm', 'insumos'], queryFn: () => rtm.insumos() })
  const [q, setQ] = useState('')
  const prods = useQuery({ queryKey: ['rtm', 'productos-wms', q], queryFn: () => rtm.productosWms(q || undefined) })
  const [sel, setSel] = useState<any>(null)
  const [clase, setClase] = useState('BANDA')
  const guardar = async () => {
    try { await rtm.guardarInsumo({ producto_id: sel.id, clase }); toast.success('Insumo registrado'); setSel(null); qc.invalidateQueries({ queryKey: ['rtm', 'insumos'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <>
      <Alert severity="info" sx={{ mb: 1.5 }}>Los insumos son productos propios del WMS con lote (bandas en metros). Se reciben por el WMS y se trasladan a la ubicación de cada estación, de donde la terminal los descuenta.</Alert>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Autocomplete size="small" options={prods.data ?? []} value={sel} onChange={(_, v) => setSel(v)} onInputChange={(_, v) => setQ(v)}
          getOptionLabel={(p: any) => `${p.sku} · ${p.nombre}`} sx={{ minWidth: 360 }} renderInput={p => <TextField {...p} label="Producto del WMS" />} />
        <TextField select size="small" label="Clase" value={clase} onChange={e => setClase(e.target.value)}>{CLASES.map(c => <MenuItem key={c} value={c}>{c.toLowerCase()}</MenuItem>)}</TextField>
        <Button variant="contained" onClick={guardar} disabled={!sel} sx={{ bgcolor: COLOR }}>Marcar como insumo</Button>
      </Box>
      <TablaRegistros filas={lista.data ?? []} cargando={lista.isLoading} vacio="Sin insumos" etiqueta={(i: any) => i.nombre}
        columnas={[{ titulo: 'Clase', valor: (i: any) => i.clase.toLowerCase() }, { titulo: 'SKU', valor: (i: any) => i.sku }, { titulo: 'Insumo', valor: (i: any) => i.nombre },
          { titulo: 'Existencia en la planta', valor: (i: any) => `${i.existencia ?? '—'} ${i.unidad?.toLowerCase() ?? ''}`, alinear: 'right' },
          { titulo: 'Costo promedio', valor: (i: any) => pesos(i.costo_promedio), alinear: 'right' }]} />
    </>
  )
}

function Recetas() {
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: ['rtm', 'recetas'], queryFn: rtm.recetas })
  const equipos = useQuery({ queryKey: ['rtm', 'equipos'], queryFn: rtm.equipos })
  const insumos = useQuery({ queryKey: ['rtm', 'insumos'], queryFn: () => rtm.insumos() })
  const roles = useQuery({ queryKey: ['rtm', 'roles', 'yo'], queryFn: rtm.misRoles })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: any }>({ abierto: false, r: null })
  const ins = (c: string) => (insumos.data ?? []).filter((i: any) => i.clase === c).map((i: any) => [i.producto_id, i.nombre] as [number, string])
  const campos: Campo[] = [
    { clave: 'codigo', etiqueta: 'Código', obligatorio: true, ancho: 4 }, { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true, ancho: 8 },
    { clave: 'equipo_id', etiqueta: 'Autoclave', tipo: 'seleccion', obligatorio: true, ancho: 4,
      opciones: (equipos.data ?? []).filter((e: any) => e.tipo === 'AUTOCLAVE').map((e: any) => [e.id, e.nombre] as [number, string]) },
    { clave: 'banda_producto_id', etiqueta: 'Banda (vacío: cualquiera)', tipo: 'seleccion', ancho: 4, opciones: ins('BANDA') },
    { clave: 'cojin_producto_id', etiqueta: 'Cojín (vacío: cualquiera)', tipo: 'seleccion', ancho: 4, opciones: ins('COJIN') },
    { clave: 'temperatura_c', etiqueta: 'Temperatura (°C)', tipo: 'numero', obligatorio: true, ancho: 3 }, { clave: 'temperatura_tol', etiqueta: '± °C', tipo: 'numero', obligatorio: true, ancho: 3 },
    { clave: 'presion_bar', etiqueta: 'Presión (bar)', tipo: 'numero', obligatorio: true, ancho: 3 }, { clave: 'presion_tol', etiqueta: '± bar', tipo: 'numero', obligatorio: true, ancho: 3 },
    { clave: 'vacio_bar', etiqueta: 'Vacío (bar)', tipo: 'numero', obligatorio: true, ancho: 3 }, { clave: 'vacio_tol', etiqueta: '± bar', tipo: 'numero', obligatorio: true, ancho: 3 },
    { clave: 'tiempo_min', etiqueta: 'Tiempo (min)', tipo: 'numero', obligatorio: true, ancho: 3 }, { clave: 'tiempo_tol', etiqueta: '± min', tipo: 'numero', obligatorio: true, ancho: 3 },
  ]
  return (
    <>
      <Alert severity="info" sx={{ mb: 1.5 }}>El sistema no trae temperaturas ni tiempos: cada receta se define con el manual del fabricante. Cambiar una receta crea otra versión en borrador; solo calidad la aprueba y los ciclos guardan con cuál corrieron.</Alert>
      <Button variant="contained" onClick={() => setDlg({ abierto: true, r: null })} sx={{ bgcolor: COLOR, mb: 1.5 }}>Nueva versión de receta</Button>
      <TablaRegistros filas={lista.data ?? []} cargando={lista.isLoading} vacio="Sin recetas: ninguna carcasa puede cargarse al autoclave" etiqueta={(r: any) => r.codigo}
        extra={(r: any) => <>
          <Button size="small" onClick={() => setDlg({ abierto: true, r: { ...r, id: undefined } })}>Nueva versión</Button>
          {r.estado === 'BORRADOR' && <Button size="small" disabled={!roles.data?.CALIDAD} onClick={async () => {
            try { await rtm.aprobarReceta(r.id); toast.success('Receta aprobada'); qc.invalidateQueries({ queryKey: ['rtm', 'recetas'] }) } catch (e) { toast.error(errorApi(e)) }
          }}>Aprobar</Button>}
        </>}
        columnas={[
          { titulo: 'Receta', valor: (r: any) => <b>{r.codigo} v{r.version}</b> }, { titulo: 'Autoclave', valor: (r: any) => r.equipo },
          { titulo: 'Banda', valor: (r: any) => r.banda ?? 'Cualquiera' }, { titulo: 'Cojín', valor: (r: any) => r.cojin ?? 'Cualquiera' },
          { titulo: 'Programa', valor: (r: any) => `${r.temperatura_c}±${r.temperatura_tol} °C · ${r.presion_bar}±${r.presion_tol} bar · ${r.vacio_bar}±${r.vacio_tol} · ${r.tiempo_min}±${r.tiempo_tol} min` },
          { titulo: 'Estado', valor: (r: any) => <Etiqueta texto={r.estado.toLowerCase()} color={r.estado === 'APROBADA' ? '#15803D' : r.estado === 'BORRADOR' ? '#B45309' : '#94A3B8'} /> },
        ]} />
      <FormularioRegistro abierto={dlg.abierto} titulo="Receta de vulcanización" campos={campos} registro={null} valoresIniciales={dlg.r ?? {}} ancho="md"
        onCerrar={() => setDlg({ abierto: false, r: null })}
        onGuardar={async c => { await rtm.crearReceta(c); toast.success('Receta creada en borrador'); qc.invalidateQueries({ queryKey: ['rtm', 'recetas'] }) }} />
    </>
  )
}

function Tarifas() {
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: ['rtm', 'tarifas'], queryFn: rtm.tarifas })
  const props = usePropietarios()
  const bandas = useQuery({ queryKey: ['rtm', 'insumos', 'BANDA'], queryFn: () => rtm.insumos('BANDA') })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: any }>({ abierto: false, r: null })
  const campos: Campo[] = [
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: [['REENCAUCHE', 'Reencauche (por medida y banda)'], ['REPARACION', 'Reparación (por tipo)'], ['CARGO_INSPECCION', 'Cargo de inspección de rechazo'], ['VENTA', 'Venta de reencauchada de la planta']] },
    { clave: 'depositante_id', etiqueta: 'Cliente (vacío: tarifa general)', tipo: 'seleccion', ancho: 6, opciones: (props.data ?? []).filter((p: any) => !p.propio).map((p: any) => [p.id, p.nombre] as [number, string]) },
    { clave: 'medida', etiqueta: 'Medida', ancho: 4 },
    { clave: 'banda_producto_id', etiqueta: 'Banda (vacío: cualquiera)', tipo: 'seleccion', ancho: 4, opciones: (bandas.data ?? []).map((b: any) => [b.producto_id, b.nombre] as [number, string]) },
    { clave: 'tipo_reparacion', etiqueta: 'Tipo de reparación', ancho: 4 },
    { clave: 'valor', etiqueta: 'Valor (antes de IVA)', tipo: 'numero', obligatorio: true, min: 0, ancho: 6 },
    { clave: 'activo', etiqueta: 'Activa', tipo: 'interruptor', ancho: 6 },
  ]
  return (
    <>
      <Alert severity="info" sx={{ mb: 1.5 }}>El precio se congela en la orden al aprobar la inspección final: cambiar una tarifa no toca lo ya aprobado.</Alert>
      <Button variant="contained" onClick={() => setDlg({ abierto: true, r: null })} sx={{ bgcolor: COLOR, mb: 1.5 }}>Nueva tarifa</Button>
      <TablaRegistros filas={lista.data ?? []} cargando={lista.isLoading} vacio="Sin tarifas" etiqueta={(t: any) => t.tipo} onEditar={(t: any) => setDlg({ abierto: true, r: t })}
        columnas={[{ titulo: 'Tipo', valor: (t: any) => t.tipo.toLowerCase().replace('_', ' ') }, { titulo: 'Cliente', valor: (t: any) => t.cliente },
          { titulo: 'Medida', valor: (t: any) => t.medida ?? '—' }, { titulo: 'Banda', valor: (t: any) => t.banda ?? '—' },
          { titulo: 'Reparación', valor: (t: any) => t.tipo_reparacion ?? '—' }, { titulo: 'Valor', valor: (t: any) => pesos(t.valor), alinear: 'right' },
          { titulo: 'Activa', valor: (t: any) => t.activo ? 'Sí' : 'No' }]} />
      <FormularioRegistro abierto={dlg.abierto} titulo="Tarifa" campos={campos} registro={dlg.r} valoresIniciales={{ activo: true }}
        onCerrar={() => setDlg({ abierto: false, r: null })}
        onGuardar={async c => { dlg.r ? await rtm.editarTarifa(dlg.r.id, c) : await rtm.crearTarifa(c); toast.success('Tarifa guardada'); qc.invalidateQueries({ queryKey: ['rtm', 'tarifas'] }) }} />
    </>
  )
}

function Roles() {
  const qc = useQueryClient()
  const usuarios = useQuery({ queryKey: ['rtm', 'usuarios'], queryFn: rtm.usuarios })
  const roles = useQuery({ queryKey: ['rtm', 'roles'], queryFn: rtm.roles })
  const de = (uid: number): string[] => roles.data?.find((r: any) => r.usuario_id === uid)?.roles ?? []
  const cambiar = async (uid: number, rol: string, si: boolean) => {
    const nuevos = si ? [...de(uid), rol] : de(uid).filter(r => r !== rol)
    try { await rtm.guardarRoles({ usuario_id: uid, roles: nuevos }); qc.invalidateQueries({ queryKey: ['rtm', 'roles'] }) } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <>
      <Alert severity="info" sx={{ mb: 1.5 }}>Técnico: dictamina condicionales, autoriza reparaciones fuera de límite y dictamina garantías. Calidad: libera retenciones y aprueba recetas. Supervisor: corrige pasos cerrados. El administrador puede todo. La API lo comprueba.</Alert>
      <TablaRegistros filas={usuarios.data ?? []} cargando={usuarios.isLoading} vacio="Sin usuarios" etiqueta={(u: any) => u.nombre}
        columnas={[{ titulo: 'Usuario', valor: (u: any) => `${u.nombre} (${u.usuario})` },
          ...['TECNICO', 'CALIDAD', 'SUPERVISOR'].map(r => ({ titulo: r.charAt(0) + r.slice(1).toLowerCase(), alinear: 'center' as const,
            valor: (u: any) => <Checkbox size="small" checked={de(u.id).includes(r)} onChange={e => cambiar(u.id, r, e.target.checked)} /> }))]} />
    </>
  )
}

export default function RTMConfig() {
  const [pestana, setPestana] = useState(0)
  const paginas = [['Planta', <Planta />], ['Equipos', <Equipos />], ['Rutas', <Rutas />], ['Especificaciones', <Especificaciones />],
    ['Calidad', <Calidad />], ['Insumos', <Insumos />], ['Recetas', <Recetas />], ['Tarifas', <Tarifas />], ['Roles', <Roles />]] as const
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Settings sx={{ fontSize: 28 }} />} titulo="Configuración de la planta"
          subtitulo="Almacén, equipos, rutas, especificaciones, catálogos, recetas, tarifas y roles" color={COLOR} />
        <Tabs value={pestana} onChange={(_, v) => setPestana(v)} variant="scrollable" sx={{ mb: 2 }}>
          {paginas.map(([t]) => <Tab key={t} label={t} />)}
        </Tabs>
        {paginas[pestana][1]}
      </Box>
    </Layout>
  )
}
