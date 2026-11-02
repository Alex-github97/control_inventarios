/**
 * Planta de reencauche · Terminal de estación
 *
 * Hecha para un escáner y pocos toques: se elige la estación una vez (se
 * recuerda en este equipo), se escanea la carcasa y la terminal muestra en qué
 * etapa está, el botón de iniciar o terminar, las mediciones que pide la etapa
 * con su rango, los insumos a descontar por lote y, en las inspecciones, la
 * decisión con sus defectos y motivos. A la derecha, la cola de la estación.
 *
 * Las reglas no viven aquí: si algo no se puede (saltarse una etapa, avanzar
 * una condicional, una medida fuera de tolerancia sin decisión), el servidor
 * lo rechaza y la terminal muestra por qué.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Paper, Typography, TextField, Button, MenuItem, Alert, Chip, ToggleButton, ToggleButtonGroup, Checkbox,
  FormControlLabel, IconButton, Autocomplete, LinearProgress, Divider, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { QrCodeScanner, PlayArrow, Stop, SkipNext, Add, Delete, Refresh } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, fechaHora, type OrdenTerminal } from '@/api/reencauche'
import { Encabezado, errorApi } from '@/components/comun/Registro'
import { COLOR } from '@/components/reencauche/comun'

const leer = (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

const DECISIONES: Record<string, [string, string]> = {
  APROBADA: ['Aprobada', '#15803D'], CONDICIONAL: ['Condicional', '#B45309'], RECHAZADA: ['Rechazada', '#DC2626'],
  RETENIDA: ['Retenida', '#7C3AED'], CORRECCION: ['Corrección autorizada', '#0369A1'],
}
const UBICACIONES = ['CORONA', 'HOMBRO', 'COSTADO', 'TALON', 'INTERIOR']
const PRUEBAS = ['DETECTOR_ELECTRICO', 'SHEAROGRAFIA', 'RAYOS_X', 'INFLADO', 'ALTA_PRESION']

function Rango({ lim }: { lim?: { min?: number | null; max?: number | null } }) {
  if (!lim || (lim.min == null && lim.max == null)) return <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Sin especificación</Typography>
  return <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Rango {lim.min ?? '—'} a {lim.max ?? '—'}</Typography>
}

function FormularioTerminar({ o, onListo }: { o: OrdenTerminal; onListo: () => void }) {
  const etapa = o.etapa!
  const motivos = useQuery({ queryKey: ['rtm', 'motivos'], queryFn: rtm.motivos, staleTime: 300_000 })
  const defectos = useQuery({ queryKey: ['rtm', 'defectos'], queryFn: rtm.defectos, staleTime: 300_000 })
  const insumos = useQuery({ queryKey: ['rtm', 'insumos'], queryFn: () => rtm.insumos(), enabled: etapa.insumos.length > 0 })
  const roles = useQuery({ queryKey: ['rtm', 'roles', 'yo'], queryFn: rtm.misRoles, staleTime: 300_000 })
  const lim = o.especificacion?.limites ?? {}
  const inicialConsumos = () => etapa.insumos.map(clase => {
    const opciones = (insumos.data ?? []).filter((i: any) => i.clase === clase)
    const elegido = clase === 'BANDA' && o.banda_producto_id ? o.banda_producto_id : opciones[0]?.producto_id ?? ''
    const cantidad = clase === 'BANDA' ? o.especificacion?.longitud_banda_m : clase === 'COJIN' ? o.especificacion?.longitud_cojin_m
      : clase === 'CEMENTO' ? o.especificacion?.cemento_estandar : clase === 'PARCHE' ? 1 : ''
    return { clase, producto_id: elegido, numero_lote: '', cantidad: cantidad ?? '', usar: clase !== 'PARCHE' && clase !== 'RELLENO' && clase !== 'COMPUESTO' }
  })
  const [meds, setMeds] = useState<Record<string, any>>({})
  const [decision, setDecision] = useState<string>('')
  const [accion, setAccion] = useState<string>('')
  const [motivosSel, setMotivosSel] = useState<any[]>([])
  const [defs, setDefs] = useState<any[]>([])
  const [reps, setReps] = useState<any[]>([])
  const [autorizar, setAutorizar] = useState(false)
  const [cons, setCons] = useState<any[]>([])
  const [pruebas, setPruebas] = useState<any[]>([])
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  useEffect(() => { if (insumos.data) setCons(inicialConsumos()) }, [insumos.data])  // eslint-disable-line react-hooks/exhaustive-deps
  const fuera = etapa.mediciones.some(m => {
    const v = meds[m.clave]; const l = lim[m.clave]
    if (m.tipo === 'SI_NO' || v === '' || v == null || !l) return false
    const n = Number(v); return (l.min != null && n < l.min) || (l.max != null && n > l.max)
  })
  const rechazo = decision === 'RECHAZADA' || accion === 'RECHAZAR'
  const decisiones = etapa.decision ? Object.keys(DECISIONES).filter(k => etapa.decision_final || !['RETENIDA', 'CORRECCION'].includes(k)) : []
  const terminar = async () => {
    setEnviando(true)
    try {
      const r = await rtm.terminar(o.paso_abierto_id!, {
        mediciones: Object.fromEntries(etapa.mediciones.map(m => [m.clave, m.tipo === 'SI_NO' ? meds[m.clave] === true : meds[m.clave]])),
        decision: decision || null, accion_fuera: fuera && !etapa.decision ? accion || null : null,
        motivos: motivosSel.map(m => m.id), defectos: defs.filter(d => d.defecto_id).map(d => ({ ...d, tamano_mm: d.tamano_mm === '' ? null : Number(d.tamano_mm) })),
        reparaciones: reps.map(r => ({ ...r, tamano_mm: Number(r.tamano_mm), profundidad_mm: r.profundidad_mm === '' ? null : Number(r.profundidad_mm) })),
        autorizar_reparacion: autorizar,
        consumos: cons.filter(c => c.usar && c.producto_id && c.cantidad).map(c => ({ producto_id: c.producto_id, numero_lote: c.numero_lote || undefined, cantidad: Number(c.cantidad) })),
        pruebas: pruebas.map(p => ({ prueba: p.prueba, resultado: p.resultado, conforme: p.conforme })), observaciones: obs || null,
      })
      if (pruebas.some(p => p.archivo)) {
        const hoja = await rtm.hojaDeVida(o.codigo)
        const paso = hoja.visitas.flatMap((v: any) => v.pasos).find((p: any) => p.id === r.paso_id)
        for (const [i, p] of pruebas.entries()) {
          const pr = paso?.pruebas?.[i]
          if (p.archivo && pr) await rtm.subirArchivoPrueba(pr.id, p.archivo)
        }
      }
      toast.success(r.orden_estado === 'TERMINADA' ? `${o.codigo} terminada: pasó a producto terminado` : r.orden_estado === 'RECHAZADA'
        ? `${o.codigo} rechazada: pasa a disposición` : r.decision_pendiente ? `${o.codigo} queda para dictamen técnico` : `Etapa cerrada (${r.resultado.toLowerCase()})`)
      onListo()
    } catch (e) { toast.error(errorApi(e, 'No se pudo cerrar la etapa'), { duration: 6000 }) }
    setEnviando(false)
  }
  return (
    <Box>
      {etapa.mediciones.length > 0 && <>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Mediciones</Typography>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {etapa.mediciones.map(m => {
            const l = lim[m.clave]; const v = meds[m.clave]
            const malo = m.tipo !== 'SI_NO' && v !== '' && v != null && l && ((l.min != null && Number(v) < l.min) || (l.max != null && Number(v) > l.max))
            return (
              <Grid key={m.clave} size={{ xs: 12, sm: 6 }}>
                {m.tipo === 'SI_NO' ? <>
                  <Typography sx={{ fontSize: 13 }}>{m.nombre}</Typography>
                  <ToggleButtonGroup exclusive size="small" value={v ?? null} onChange={(_, x) => x !== null && setMeds({ ...meds, [m.clave]: x })}>
                    <ToggleButton value={true} color="success">Sí</ToggleButton><ToggleButton value={false} color="error">No</ToggleButton>
                  </ToggleButtonGroup>
                </> : <>
                  <TextField fullWidth size="small" type="number" label={`${m.nombre}${m.unidad ? ` (${m.unidad})` : ''}`} value={v ?? ''}
                    error={!!malo} onChange={e => setMeds({ ...meds, [m.clave]: e.target.value })} inputProps={{ step: 'any' }} />
                  <Rango lim={l} />
                </>}
              </Grid>
            )
          })}
        </Grid>
      </>}
      {fuera && !etapa.decision && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Hay mediciones fuera de tolerancia. Antes de cerrar elija qué hacer:
          <ToggleButtonGroup exclusive size="small" value={accion} onChange={(_, x) => setAccion(x ?? '')} sx={{ display: 'flex', mt: 1 }}>
            <ToggleButton value="REPETIR">Repetir</ToggleButton><ToggleButton value="EVALUACION">Enviar a evaluación</ToggleButton><ToggleButton value="RECHAZAR">Rechazar</ToggleButton>
          </ToggleButtonGroup>
        </Alert>
      )}
      {decisiones.length > 0 && <>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Decisión</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {decisiones.map(k => (
            <Button key={k} variant={decision === k ? 'contained' : 'outlined'} onClick={() => setDecision(k)}
              sx={{ borderColor: DECISIONES[k][1], color: decision === k ? '#fff' : DECISIONES[k][1], bgcolor: decision === k ? DECISIONES[k][1] : undefined,
                '&:hover': { bgcolor: decision === k ? DECISIONES[k][1] : alpha(DECISIONES[k][1], 0.08) } }}>{DECISIONES[k][0]}</Button>
          ))}
        </Box>
      </>}
      {etapa.tipo === 'INSPECCION' && <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Defectos</Typography>
          <IconButton size="small" onClick={() => setDefs([...defs, { defecto_id: '', ubicacion: '', tamano_mm: '' }])}><Add fontSize="small" /></IconButton>
        </Box>
        {defs.map((d, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField select size="small" label="Defecto" value={d.defecto_id} sx={{ flex: 2 }}
              onChange={e => setDefs(defs.map((x, j) => j === i ? { ...x, defecto_id: e.target.value } : x))}>
              {(defectos.data ?? []).filter((x: any) => x.activo).map((x: any) => <MenuItem key={x.id} value={x.id}>{x.zona.toLowerCase().replace('_', ' ')} · {x.nombre}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Dónde" value={d.ubicacion} sx={{ flex: 1 }} onChange={e => setDefs(defs.map((x, j) => j === i ? { ...x, ubicacion: e.target.value } : x))} />
            <TextField size="small" type="number" label="mm" value={d.tamano_mm} sx={{ width: 90 }} onChange={e => setDefs(defs.map((x, j) => j === i ? { ...x, tamano_mm: e.target.value } : x))} />
            <IconButton onClick={() => setDefs(defs.filter((_, j) => j !== i))}><Delete fontSize="small" /></IconButton>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Pruebas especiales</Typography>
          <IconButton size="small" onClick={() => setPruebas([...pruebas, { prueba: 'SHEAROGRAFIA', resultado: '', conforme: true, archivo: null }])}><Add fontSize="small" /></IconButton>
        </Box>
        {pruebas.map((p, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField select size="small" label="Prueba" value={p.prueba} sx={{ width: 190 }} onChange={e => setPruebas(pruebas.map((x, j) => j === i ? { ...x, prueba: e.target.value } : x))}>
              {PRUEBAS.map(x => <MenuItem key={x} value={x}>{x.toLowerCase().replace('_', ' ')}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Resultado" value={p.resultado} sx={{ flex: 1, minWidth: 180 }} onChange={e => setPruebas(pruebas.map((x, j) => j === i ? { ...x, resultado: e.target.value } : x))} />
            <FormControlLabel control={<Checkbox checked={p.conforme} onChange={e => setPruebas(pruebas.map((x, j) => j === i ? { ...x, conforme: e.target.checked } : x))} />} label="Conforme" />
            <Button component="label" size="small">{p.archivo ? p.archivo.name : 'Adjuntar'}<input hidden type="file" accept="image/*,.pdf"
              onChange={e => setPruebas(pruebas.map((x, j) => j === i ? { ...x, archivo: e.target.files?.[0] ?? null } : x))} /></Button>
            <IconButton onClick={() => setPruebas(pruebas.filter((_, j) => j !== i))}><Delete fontSize="small" /></IconButton>
          </Box>
        ))}
      </>}
      {rechazo && (
        <Autocomplete multiple size="small" options={(motivos.data ?? []).filter((m: any) => m.activo)} value={motivosSel}
          getOptionLabel={(m: any) => m.nombre} isOptionEqualToValue={(a: any, b: any) => a.id === b.id}
          onChange={(_, v) => setMotivosSel(v)} sx={{ mb: 2 }}
          renderInput={p => <TextField {...p} label="Motivos de rechazo (al menos uno)" error={!motivosSel.length} />} />
      )}
      {etapa.reparaciones && <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Reparaciones</Typography>
          <IconButton size="small" onClick={() => setReps([...reps, { tipo_dano: 'CORTE', ubicacion: 'CORONA', tamano_mm: '', profundidad_mm: '', tipo_reparacion: 'PARCHE', material: '' }])}><Add fontSize="small" /></IconButton>
        </Box>
        {reps.map((r, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Daño" value={r.tipo_dano} sx={{ width: 140 }} onChange={e => setReps(reps.map((x, j) => j === i ? { ...x, tipo_dano: e.target.value } : x))}>
              {['CORTE', 'PERFORACION', 'SEPARACION', 'GRIETA'].map(x => <MenuItem key={x} value={x}>{x.toLowerCase()}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Ubicación" value={r.ubicacion} sx={{ width: 130 }} onChange={e => setReps(reps.map((x, j) => j === i ? { ...x, ubicacion: e.target.value } : x))}>
              {UBICACIONES.map(x => <MenuItem key={x} value={x}>{x.toLowerCase()}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Tamaño mm" value={r.tamano_mm} sx={{ width: 110 }} onChange={e => setReps(reps.map((x, j) => j === i ? { ...x, tamano_mm: e.target.value } : x))} />
            <TextField size="small" type="number" label="Prof. mm" value={r.profundidad_mm} sx={{ width: 100 }} onChange={e => setReps(reps.map((x, j) => j === i ? { ...x, profundidad_mm: e.target.value } : x))} />
            <TextField size="small" label="Reparación" value={r.tipo_reparacion} sx={{ width: 130 }} onChange={e => setReps(reps.map((x, j) => j === i ? { ...x, tipo_reparacion: e.target.value.toUpperCase() } : x))} />
            <TextField size="small" label="Material" value={r.material} sx={{ flex: 1, minWidth: 120 }} onChange={e => setReps(reps.map((x, j) => j === i ? { ...x, material: e.target.value } : x))} />
            <IconButton onClick={() => setReps(reps.filter((_, j) => j !== i))}><Delete fontSize="small" /></IconButton>
          </Box>
        ))}
        {reps.length > 0 && roles.data?.TECNICO && <FormControlLabel control={<Checkbox checked={autorizar} onChange={e => setAutorizar(e.target.checked)} />}
          label="Autorizo como técnico los daños que excedan el límite" sx={{ mb: 1 }} />}
      </>}
      {cons.length > 0 && <>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Insumos (salen de la ubicación de esta estación)</Typography>
        {cons.map((c, i) => (
          <Box key={c.clase} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Checkbox checked={c.usar} onChange={e => setCons(cons.map((x, j) => j === i ? { ...x, usar: e.target.checked } : x))} />
            <TextField select size="small" label={c.clase.toLowerCase()} value={c.producto_id} sx={{ minWidth: 200, flex: 1 }}
              onChange={e => setCons(cons.map((x, j) => j === i ? { ...x, producto_id: e.target.value } : x))}>
              {(insumos.data ?? []).filter((x: any) => x.clase === c.clase).map((x: any) => <MenuItem key={x.producto_id} value={x.producto_id}>{x.nombre}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Lote (escanear)" value={c.numero_lote} sx={{ width: 150 }} onChange={e => setCons(cons.map((x, j) => j === i ? { ...x, numero_lote: e.target.value } : x))} />
            <TextField size="small" type="number" label="Cantidad" value={c.cantidad} sx={{ width: 110 }} inputProps={{ step: 'any' }}
              onChange={e => setCons(cons.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} />
          </Box>
        ))}
      </>}
      <TextField fullWidth size="small" label="Observaciones" value={obs} onChange={e => setObs(e.target.value)} sx={{ mb: 2 }} />
      <Button fullWidth size="large" variant="contained" startIcon={<Stop />} onClick={terminar} disabled={enviando || (etapa.decision && !decision)}
        sx={{ bgcolor: COLOR, py: 1.5, fontSize: 16 }}>Terminar {etapa.nombre.toLowerCase()}</Button>
    </Box>
  )
}

export default function RTMTerminal() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [estacion, setEstacion] = useState(leer('rtm.estacion'))
  const [codigo, setCodigo] = useState('')
  const [orden, setOrden] = useState<OrdenTerminal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const equipos = useQuery({ queryKey: ['rtm', 'equipos'], queryFn: rtm.equipos })
  const est = useQuery({ queryKey: ['rtm', 'estacion', estacion], queryFn: () => rtm.estacion(estacion), enabled: !!estacion, retry: false })
  const cola = useQuery({ queryKey: ['rtm', 'cola', estacion], queryFn: () => rtm.cola(estacion), enabled: !!est.data, refetchInterval: 15_000 })
  const elegir = (c: string) => { setEstacion(c); guardar('rtm.estacion', c); setOrden(null) }
  const escanear = async (c: string) => {
    if (!c.trim()) return
    setError(null)
    try { setOrden(await rtm.escanear(estacion, c.trim().toUpperCase())); setCodigo('') }
    catch (e) { setOrden(null); setError(errorApi(e, 'No se pudo leer la carcasa')) }
  }
  const refrescar = async () => {
    qc.invalidateQueries({ queryKey: ['rtm', 'cola', estacion] })
    if (orden) { try { setOrden(await rtm.escanear(estacion, orden.codigo)) } catch { setOrden(null) } }
    setTimeout(() => entrada.current?.focus(), 50)
  }
  const iniciar = async () => {
    try { await rtm.iniciar(estacion, orden!.codigo); toast.success('Etapa iniciada'); refrescar() } catch (e) { toast.error(errorApi(e)) }
  }
  const omitir = async () => {
    try { await rtm.omitir(orden!.codigo, 'Etapa opcional omitida en la terminal'); toast.success('Etapa omitida'); refrescar() } catch (e) { toast.error(errorApi(e)) }
  }
  useEffect(() => { entrada.current?.focus() }, [estacion])
  const autoclave = est.data?.tipo === 'AUTOCLAVE'
  const opciones = useMemo(() => (equipos.data ?? []).filter((e: any) => e.estado === 'ACTIVO'), [equipos.data])
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<QrCodeScanner sx={{ fontSize: 28 }} />} titulo="Terminal de estación"
          subtitulo={est.data ? `${est.data.nombre} · ${est.data.etapas.map((x: any) => x.nombre).join(', ')}` : 'Elija la estación de este equipo'} color={COLOR} />
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select size="small" label="Estación" value={estacion} onChange={e => elegir(e.target.value)} sx={{ minWidth: 260 }}>
            {opciones.map((e: any) => <MenuItem key={e.codigo} value={e.codigo}>{e.codigo} · {e.nombre}</MenuItem>)}
          </TextField>
          {est.data && !est.data.tiene_ubicacion && <Alert severity="warning" sx={{ py: 0 }}>Esta estación no tiene ubicación del WMS: no puede registrar.</Alert>}
        </Box>
        {autoclave && <Alert severity="info" action={<Button onClick={() => navigate('/reencauche/vulcanizacion')}>Ir a vulcanización</Button>}>
          Los autoclaves se operan por ciclo: cargue las carcasas en la pantalla de vulcanización.</Alert>}
        {est.data && !autoclave && <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
              <TextField inputRef={entrada} fullWidth label="Escanee el código de la carcasa" value={codigo} autoFocus
                onChange={e => setCodigo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') escanear(codigo) }}
                InputProps={{ sx: { fontSize: 22, fontFamily: 'monospace' } }} />
              {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
            </Paper>
            {orden && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: alpha(COLOR, 0.4) }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace' }}>{orden.codigo}</Typography>
                    <Typography sx={{ fontSize: 13 }}>{orden.cliente} · {orden.medida} · {orden.marca} {orden.modelo}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Reencauche nº {orden.numero_reencauche} · banda {orden.banda ?? 'sin definir'} · {orden.ubicacion}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Etapa actual</Typography>
                    <Typography sx={{ fontWeight: 800, color: COLOR }}>{orden.etapa?.nombre ?? '—'}</Typography>
                    {orden.etapa && !orden.etapa.obligatoria && <Chip size="small" label="Opcional" />}
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                {orden.aviso && <Alert severity="warning">{orden.aviso}</Alert>}
                {!orden.aviso && !orden.en_proceso && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button fullWidth size="large" variant="contained" startIcon={<PlayArrow />} onClick={iniciar} sx={{ bgcolor: COLOR, py: 1.5, fontSize: 16 }}>
                      Iniciar {orden.etapa?.nombre.toLowerCase()}</Button>
                    {orden.etapa && !orden.etapa.obligatoria && <Button size="large" variant="outlined" startIcon={<SkipNext />} onClick={omitir}>Omitir</Button>}
                  </Box>
                )}
                {!orden.aviso && orden.en_proceso && orden.paso_abierto_id && <FormularioTerminar key={orden.paso_abierto_id} o={orden} onListo={refrescar} />}
                {!orden.aviso && orden.en_proceso && !orden.paso_abierto_id && <Alert severity="info">En proceso en otra estación.</Alert>}
              </Paper>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>Cola de la estación ({cola.data?.length ?? 0})</Typography>
                <IconButton size="small" onClick={() => cola.refetch()}><Refresh fontSize="small" /></IconButton>
              </Box>
              {cola.isLoading && <LinearProgress />}
              {(cola.data ?? []).map((c: any) => (
                <Box key={c.orden_id} onClick={() => escanear(c.codigo)} sx={{ p: 1, mb: 0.75, borderRadius: 2, cursor: 'pointer', border: '1px solid',
                  borderColor: c.en_proceso ? COLOR : 'divider', '&:hover': { bgcolor: alpha(COLOR, 0.05) } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b style={{ fontFamily: 'monospace' }}>{c.codigo}</b>
                    {c.prioridad <= 2 && <Chip size="small" color="error" label={c.prioridad === 1 ? 'Urgente' : 'Alta'} />}
                  </Box>
                  <Typography sx={{ fontSize: 11.5 }}>{c.cliente} · {c.medida} · {c.banda ?? 'sin banda'}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{c.etapa} · {c.en_proceso ? 'en proceso' : `espera desde ${fechaHora(c.desde)}`}</Typography>
                </Box>
              ))}
              {!cola.isLoading && !cola.data?.length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Nada en cola.</Typography>}
            </Paper>
          </Grid>
        </Grid>}
      </Box>
    </Layout>
  )
}
