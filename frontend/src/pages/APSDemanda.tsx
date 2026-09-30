/**
 * APS · Planeación de la demanda
 *
 * Era maqueta: pronósticos «activos», un detalle por período del «Aceite Motor
 * 20W50», ajustes colaborativos y precisiones por familia escritos a mano.
 *
 * Ahora sigue el ciclo real:
 *   1. Historia: la demanda real por producto, ubicación y mes (se registra o
 *      se pega desde una hoja de cálculo).
 *   2. Pronóstico: el motor prueba seis métodos y se queda con el que mejor
 *      predijo los meses que no vio. Se ve la comparación completa.
 *   3. Consenso: se publica una versión y las áreas proponen ajustes con su
 *      justificación; los aprobados forman el consenso que usa el plan.
 *   4. Exactitud: lo publicado contra lo que de verdad pasó.
 */
import { useMemo, useState } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, Button, TextField, MenuItem, Alert, LinearProgress, Table, TableHead, TableRow,
  TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tooltip, IconButton,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { TrendingUp, Upload, CheckCircle, DeleteOutline } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, n1, pct, nombreP, nombreU, mesCorto, CLASE_DEMANDA, type SerieResumen } from '@/api/aps'
import { Encabezado, Cifra, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const AREAS = ['Comercial', 'Mercadeo', 'Operaciones', 'Finanzas', 'Gerencia']

function GraficoPronostico({ historia, periodos, pron, inf, sup, consenso }: {
  historia: [string, number][]; periodos: string[]; pron: number[]; inf?: number[]; sup?: number[]; consenso?: (number | null)[]
}) {
  const h = historia.slice(-24)
  const n = h.length + periodos.length
  const todos = [...h.map(x => x[1]), ...pron, ...(sup ?? []), ...(consenso ?? []).filter((x): x is number => x != null)]
  const max = Math.max(...todos, 1)
  const w = 900, alto = 240, pl = 48, pb = 24
  const x = (i: number) => pl + (i / Math.max(n - 1, 1)) * (w - pl - 10)
  const y = (v: number) => 8 + (1 - v / max) * (alto - pb - 8)
  const linea = (vals: number[], off: number) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const off = h.length
  const banda = inf && sup ? `${sup.map((v, i) => `${i ? 'L' : 'M'}${x(i + off)},${y(v)}`).join(' ')} ${inf.slice().reverse().map((v, i) => `L${x(off + inf.length - 1 - i)},${y(v)}`).join(' ')} Z` : ''
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${alto}`} role="img" aria-label="Historia y pronóstico">
      {[0, 0.5, 1].map(f => <g key={f}><line x1={pl} x2={w - 10} y1={y(max * f)} y2={y(max * f)} stroke="#F1F5F9" /><text x={2} y={y(max * f) + 3} fontSize={10} fill="#64748B">{n0(max * f)}</text></g>)}
      {banda && <path d={banda} fill={C} opacity={0.12} />}
      <path d={linea(h.map(v => v[1]), 0)} fill="none" stroke="#334155" strokeWidth={1.8} />
      <path d={linea([h[h.length - 1]?.[1] ?? pron[0], ...pron], off - 1)} fill="none" stroke={C} strokeWidth={2} strokeDasharray="6 4" />
      {consenso && consenso.some(v => v != null) && consenso.map((v, i) => v != null && <circle key={i} cx={x(i + off)} cy={y(v)} r={4} fill="#D97706"><title>Consenso {n0(v)}</title></circle>)}
      <line x1={x(off - 0.5)} x2={x(off - 0.5)} y1={8} y2={alto - pb} stroke="#CBD5E1" strokeDasharray="3 3" />
      {h.filter((_, i) => i % 3 === 0).map(([p], k) => <text key={p} x={x(k * 3)} y={alto - 6} fontSize={10} fill="#64748B" textAnchor="middle">{mesCorto(p)}</text>)}
      {periodos.map((p, i) => i % 2 === 0 && <text key={p} x={x(off + i)} y={alto - 6} fontSize={10} fill={C} textAnchor="middle">{mesCorto(p)}</text>)}
    </svg>
  )
}

function Historia() {
  const qc = useQueryClient()
  const prods = useQuery({ queryKey: ['aps', 'productos'], queryFn: apsApi.productos.listar }).data ?? []
  const ubics = useQuery({ queryKey: ['aps', 'ubicaciones'], queryFn: apsApi.ubicaciones.listar }).data ?? []
  const [pid, setPid] = useState<number | ''>('')
  const [uid, setUid] = useState<number | ''>('')
  const { data = [], isLoading } = useQuery({ queryKey: ['aps', 'demanda', pid, uid], queryFn: () => apsApi.demanda({ producto_id: pid || undefined, ubicacion_id: uid || undefined }) })
  const [carga, setCarga] = useState(false)
  const [texto, setTexto] = useState('')
  const [errores, setErrores] = useState<string[]>([])
  const [nuevo, setNuevo] = useState({ periodo: '', cantidad: '' })

  const cargar = async () => {
    try {
      const r = await apsApi.cargarDemanda(texto)
      if (r.errores.length) { setErrores(r.errores); toast.error(`No se guardó nada: ${r.total_errores ?? r.errores.length} línea(s) con error`); return }
      toast.success(`${r.guardadas} registros de demanda guardados`); setCarga(false); setTexto(''); setErrores([])
      qc.invalidateQueries({ queryKey: ['aps'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  const registrar = async () => {
    try {
      await apsApi.registrarDemanda({ producto_id: Number(pid), ubicacion_id: Number(uid), periodo: nuevo.periodo, cantidad: Number(nuevo.cantidad) })
      toast.success('Demanda registrada'); setNuevo({ periodo: '', cantidad: '' }); qc.invalidateQueries({ queryKey: ['aps'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
        <TextField select size="small" label="Producto" value={pid} onChange={e => setPid(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 260 }}>
          <MenuItem value="">Todos</MenuItem>{prods.map(p => <MenuItem key={p.id} value={p.id}>{p.codigo} · {p.nombre}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Ubicación" value={uid} onChange={e => setUid(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todas</MenuItem>{ubics.map(u => <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Upload />} sx={{ bgcolor: C }} onClick={() => setCarga(true)}>Pegar desde hoja de cálculo</Button>
      </Box>
      {pid !== '' && uid !== '' && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography fontSize={13} fontWeight={700}>Registrar un mes</Typography>
          <TextField size="small" type="month" label="Mes" InputLabelProps={{ shrink: true }} value={nuevo.periodo} onChange={e => setNuevo(v => ({ ...v, periodo: e.target.value }))} />
          <TextField size="small" type="number" label="Cantidad" value={nuevo.cantidad} onChange={e => setNuevo(v => ({ ...v, cantidad: e.target.value }))} />
          <Button variant="outlined" disabled={!nuevo.periodo || nuevo.cantidad === ''} onClick={registrar}>Guardar</Button>
          <Typography fontSize={11} color="text.secondary">Si el mes ya existe, se reemplaza.</Typography>
        </Paper>
      )}
      {isLoading && <LinearProgress />}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}><TableCell>Mes</TableCell><TableCell>Producto</TableCell><TableCell>Ubicación</TableCell><TableCell align="right">Cantidad</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data.slice(0, 500).map(d => (
              <TableRow key={d.id} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell>{d.periodo}</TableCell>
                <TableCell>{prods.find(p => p.id === d.producto_id)?.codigo ?? d.producto_id}</TableCell>
                <TableCell>{ubics.find(u => u.id === d.ubicacion_id)?.nombre ?? d.ubicacion_id}</TableCell>
                <TableCell align="right">{n0(d.cantidad)}</TableCell>
                <TableCell><IconButton size="small" aria-label={`Borrar ${d.periodo}`} onClick={async () => { if (!window.confirm(`¿Borrar la demanda de ${d.periodo}?`)) return; await apsApi.borrarDemanda(d.id); qc.invalidateQueries({ queryKey: ['aps'] }) }}><DeleteOutline fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}
            {!isLoading && !data.length && <TableRow><TableCell colSpan={5} sx={{ color: 'text.secondary', fontSize: 12 }}>Sin demanda registrada. Péguela desde una hoja de cálculo o registre mes a mes.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={carga} onClose={() => setCarga(false)} maxWidth="md" fullWidth>
        <DialogTitle>Pegar demanda desde una hoja de cálculo</DialogTitle>
        <DialogContent>
          <Typography fontSize={13} color="text.secondary" mb={1}>Cuatro columnas: <b>código de producto, código de ubicación, mes (AAAA-MM), cantidad</b>. Copie las celdas de Excel y péguelas aquí. Si una línea tiene error no se guarda ninguna.</Typography>
          <TextField fullWidth multiline minRows={10} value={texto} onChange={e => setTexto(e.target.value)} placeholder={'PROD-01\tPLANTA\t2025-01\t1200\nPROD-01\tPLANTA\t2025-02\t1350'} inputProps={{ 'aria-label': 'Datos de demanda' }} sx={{ fontFamily: 'monospace' }} />
          {errores.length > 0 && <Alert severity="error" sx={{ mt: 1 }}>{errores.slice(0, 10).map(e => <div key={e}>{e}</div>)}{errores.length > 10 && <div>…</div>}</Alert>}
        </DialogContent>
        <DialogActions><Button onClick={() => setCarga(false)}>Cancelar</Button><Button variant="contained" disabled={!texto.trim()} onClick={cargar}>Guardar demanda</Button></DialogActions>
      </Dialog>
    </Box>
  )
}

function Pronostico({ sel, setSel }: { sel: SerieResumen | null; setSel: (s: SerieResumen) => void }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'pronostico'], queryFn: apsApi.pronostico })
  const serie = useQuery({ queryKey: ['aps', 'serie', sel?.producto_id, sel?.ubicacion_id], queryFn: () => apsApi.serie(sel!.producto_id, sel!.ubicacion_id), enabled: !!sel })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  if (!data.series.length) return <Alert severity="info" sx={{ m: 3 }}>No hay demanda registrada. Cárguela en la pestaña Historia.</Alert>
  const s = serie.data
  const publicar = async () => {
    try { const r = await apsApi.publicar(sel!.producto_id, sel!.ubicacion_id); toast.success(`Versión ${r.version} publicada`); qc.invalidateQueries({ queryKey: ['aps'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box sx={{ p: 3 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', maxHeight: 330, mb: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11 } }}>
            <TableCell>Producto</TableCell><TableCell>Ubicación</TableCell><TableCell>Demanda</TableCell><TableCell>Método elegido</TableCell>
            <TableCell align="right">Error (WAPE)</TableCell><TableCell align="right">Mejora sobre el ingenuo</TableCell><TableCell align="right">Próximo mes</TableCell><TableCell>Consenso</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.series.map(r => {
              const activo = sel?.producto_id === r.producto_id && sel?.ubicacion_id === r.ubicacion_id
              return (
                <TableRow key={`${r.producto_id}-${r.ubicacion_id}`} hover selected={activo} onClick={() => setSel(r)} sx={{ cursor: 'pointer', '& td': { fontSize: 12 } }}>
                  <TableCell><b>{nombreP(data, r.producto_id)}</b></TableCell><TableCell>{nombreU(data, r.ubicacion_id)}</TableCell>
                  <TableCell><Etiqueta texto={CLASE_DEMANDA[r.clase]?.[0] ?? r.clase} color={CLASE_DEMANDA[r.clase]?.[1] ?? '#64748B'} /></TableCell>
                  <TableCell>{r.nombre_metodo ?? '—'}{!r.suficiente && <Typography component="span" fontSize={10} color="#D97706"> · pocos datos</Typography>}</TableCell>
                  <TableCell align="right">{pct(r.wape)}</TableCell><TableCell align="right">{pct(r.fva_pct)}</TableCell>
                  <TableCell align="right">{n0(r.proximo)}</TableCell><TableCell>{r.usa_consenso ? <Chip size="small" color="warning" label="Publicado" /> : '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
      {!sel && <Typography fontSize={13} color="text.secondary">Seleccione una fila para ver su pronóstico y la comparación de métodos.</Typography>}
      {sel && serie.isLoading && <LinearProgress />}
      {sel && s && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography fontWeight={800}>{nombreP(data, sel.producto_id)} · {nombreU(data, sel.ubicacion_id)}</Typography>
              <Typography fontSize={12} color="text.secondary">
                {s.estadistico.nombre} · {s.estadistico.meses} meses de historia{s.estadistico.meses_validacion ? `, validado en los últimos ${s.estadistico.meses_validacion} que no vio` : ''}. Línea punteada: pronóstico; franja: intervalo del 80 %{s.publicado ? '; puntos naranja: consenso publicado' : ''}.
              </Typography>
            </Box>
            <Button variant="contained" sx={{ bgcolor: C }} onClick={publicar}>{s.publicado ? 'Publicar nueva versión' : 'Publicar como versión oficial'}</Button>
          </Box>
          <GraficoPronostico historia={Object.entries(s.historia)} periodos={data.periodos} pron={s.estadistico.pronostico}
            inf={s.estadistico.inferior} sup={s.estadistico.superior}
            consenso={s.publicado ? data.periodos.map(p => s.publicado!.detalles.find(d => d.periodo === p)?.consenso ?? null) : undefined} />
          <Grid container spacing={2} mt={1}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography fontSize={12} fontWeight={700} color="text.secondary">Métodos probados (en los meses que no vieron)</Typography>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Método</TableCell><TableCell align="right">RMSE</TableCell><TableCell align="right">WAPE</TableCell><TableCell align="right">Sesgo</TableCell></TableRow></TableHead>
                <TableBody>
                  {s.estadistico.comparacion.map((c, i) => (
                    <TableRow key={c.metodo} sx={{ '& td': { fontSize: 12, fontWeight: i === 0 ? 700 : 400 } }}>
                      <TableCell>{i === 0 && <CheckCircle sx={{ fontSize: 14, color: '#16A34A', verticalAlign: 'middle', mr: 0.5 }} />}{c.nombre}</TableCell>
                      <TableCell align="right">{n1(c.rmse)}</TableCell><TableCell align="right">{pct(c.wape)}</TableCell><TableCell align="right">{pct(c.sesgo)}</TableCell>
                    </TableRow>
                  ))}
                  {!s.estadistico.comparacion.length && <TableRow><TableCell colSpan={4} sx={{ fontSize: 12, color: 'text.secondary' }}>Con menos de 6 meses se usa el promedio: no hay con qué validar.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography fontSize={12} fontWeight={700} color="text.secondary">Próximos meses</Typography>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Mes</TableCell><TableCell align="right">Pronóstico</TableCell><TableCell align="right">Intervalo 80 %</TableCell></TableRow></TableHead>
                <TableBody>
                  {data.periodos.map((p, i) => (
                    <TableRow key={p} sx={{ '& td': { fontSize: 12 } }}>
                      <TableCell>{mesCorto(p)}</TableCell><TableCell align="right">{n0(s.estadistico.pronostico[i])}</TableCell>
                      <TableCell align="right">{s.estadistico.inferior ? `${n0(s.estadistico.inferior[i])} – ${n0(s.estadistico.superior?.[i])}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  )
}

function Consenso({ sel }: { sel: SerieResumen | null }) {
  const qc = useQueryClient()
  const nombres = useQuery({ queryKey: ['aps', 'pronostico'], queryFn: apsApi.pronostico }).data
  const serie = useQuery({ queryKey: ['aps', 'serie', sel?.producto_id, sel?.ubicacion_id], queryFn: () => apsApi.serie(sel!.producto_id, sel!.ubicacion_id), enabled: !!sel })
  const [aj, setAj] = useState({ periodo: '', area: 'Comercial', cantidad: '', justificacion: '' })
  if (!sel) return <Alert severity="info" sx={{ m: 3 }}>Seleccione un producto en la pestaña Pronóstico.</Alert>
  const pub = serie.data?.publicado
  const refrescar = () => qc.invalidateQueries({ queryKey: ['aps'] })
  const proponer = async () => {
    try {
      await apsApi.proponerAjuste({ pronostico_id: pub!.id, periodo: aj.periodo, area: aj.area, cantidad_ajuste: Number(aj.cantidad), justificacion: aj.justificacion })
      toast.success('Ajuste propuesto'); setAj(a => ({ ...a, cantidad: '', justificacion: '' })); refrescar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box sx={{ p: 3 }}>
      <Typography fontWeight={800} mb={1}>{nombreP(nombres, sel.producto_id)} · {nombreU(nombres, sel.ubicacion_id)}</Typography>
      {serie.isLoading && <LinearProgress />}
      {!serie.isLoading && !pub && <Alert severity="info">Esta serie no tiene una versión publicada. Publíquela en la pestaña Pronóstico para que las áreas propongan ajustes.</Alert>}
      {pub && (<>
        <Typography fontSize={12} color="text.secondary" mb={1}>Versión {pub.version}{pub.fecha ? ` del ${pub.fecha.slice(0, 10)}` : ''}. Consenso = estadístico + ajustes aprobados. El plan usa el consenso.</Typography>
        <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Mes</TableCell><TableCell align="right">Estadístico</TableCell><TableCell align="right">Ajustes aprobados</TableCell><TableCell align="right">Consenso</TableCell></TableRow></TableHead>
            <TableBody>
              {pub.detalles.map(d => (
                <TableRow key={d.periodo} sx={{ '& td': { fontSize: 12 } }}>
                  <TableCell>{mesCorto(d.periodo)}</TableCell><TableCell align="right">{n0(d.estadistico)}</TableCell>
                  <TableCell align="right" sx={{ color: d.ajuste_aprobado > 0 ? '#16A34A' : d.ajuste_aprobado < 0 ? '#DC2626' : undefined }}>{d.ajuste_aprobado ? `${d.ajuste_aprobado > 0 ? '+' : ''}${n0(d.ajuste_aprobado)}` : '—'}</TableCell>
                  <TableCell align="right"><b>{n0(d.consenso)}</b></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography fontSize={13} fontWeight={700} mb={1}>Proponer un ajuste</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Mes" value={aj.periodo} onChange={e => setAj(a => ({ ...a, periodo: e.target.value }))} sx={{ minWidth: 120 }}>
              {pub.detalles.map(d => <MenuItem key={d.periodo} value={d.periodo}>{mesCorto(d.periodo)}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Área" value={aj.area} onChange={e => setAj(a => ({ ...a, area: e.target.value }))} sx={{ minWidth: 140 }}>
              {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Ajuste (+/− unidades)" value={aj.cantidad} onChange={e => setAj(a => ({ ...a, cantidad: e.target.value }))} />
            <TextField size="small" label="Justificación" value={aj.justificacion} onChange={e => setAj(a => ({ ...a, justificacion: e.target.value }))} sx={{ flex: 1, minWidth: 240 }} placeholder="Ej. campaña de temporada con el cliente X" />
            <Button variant="contained" sx={{ bgcolor: C }} disabled={!aj.periodo || !aj.cantidad || aj.justificacion.trim().length < 3} onClick={proponer}>Proponer</Button>
          </Box>
        </Paper>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Mes</TableCell><TableCell>Área</TableCell><TableCell>Quién</TableCell><TableCell align="right">Ajuste</TableCell><TableCell>Justificación</TableCell><TableCell>Estado</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {pub.ajustes.map(a => (
              <TableRow key={a.id} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell>{mesCorto(a.periodo)}</TableCell><TableCell>{a.area}</TableCell><TableCell>{a.usuario}</TableCell>
                <TableCell align="right">{a.cantidad_ajuste > 0 ? '+' : ''}{n0(a.cantidad_ajuste)}</TableCell><TableCell>{a.justificacion}</TableCell>
                <TableCell>{a.aprobado ? <Etiqueta texto="Aprobado" color="#16A34A" /> : <Etiqueta texto="Propuesto" color="#D97706" />}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{!a.aprobado && (<>
                  <Button size="small" onClick={async () => { try { await apsApi.aprobarAjuste(a.id); toast.success('Ajuste aprobado: ya forma parte del consenso'); refrescar() } catch (e) { toast.error(errorApi(e)) } }}>Aprobar</Button>
                  <Button size="small" color="error" onClick={async () => { await apsApi.retirarAjuste(a.id); refrescar() }}>Retirar</Button>
                </>)}</TableCell>
              </TableRow>
            ))}
            {!pub.ajustes.length && <TableRow><TableCell colSpan={7} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin ajustes propuestos.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </>)}
    </Box>
  )
}

function Exactitud() {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'exactitud'], queryFn: apsApi.exactitud })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const tabla = (titulo: string, filas: { clave: string; exactitud_pct: number | null; sesgo_pct: number | null; real: number }[], nombre: string) => (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <Typography fontSize={12} fontWeight={700} color="text.secondary" sx={{ p: 1.5, pb: 0 }}>{titulo}</Typography>
      <Table size="small">
        <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>{nombre}</TableCell><TableCell align="right">Exactitud</TableCell><TableCell align="right">Sesgo</TableCell><TableCell align="right">Demanda real</TableCell></TableRow></TableHead>
        <TableBody>
          {filas.map(f => (
            <TableRow key={f.clave} sx={{ '& td': { fontSize: 12 } }}>
              <TableCell>{nombre === 'Mes' ? mesCorto(f.clave) : f.clave}</TableCell><TableCell align="right"><b>{pct(f.exactitud_pct)}</b></TableCell>
              <TableCell align="right" sx={{ color: Math.abs(f.sesgo_pct ?? 0) > 10 ? '#DC2626' : undefined }}>{f.sesgo_pct != null ? `${f.sesgo_pct > 0 ? '+' : ''}${n1(f.sesgo_pct)} %` : '—'}</TableCell>
              <TableCell align="right">{n0(f.real)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title="Pronóstico publicado contra la demanda real de esos meses: 100 − WAPE."><Box><Cifra etiqueta="Exactitud de lo publicado" valor={pct(data.kpis.exactitud_publicada_pct)} color={C} sub={`${data.kpis.periodos_publicados_evaluados} meses evaluados`} /></Box></Tooltip></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sesgo de lo publicado" valor={data.kpis.sesgo_publicado_pct != null ? `${data.kpis.sesgo_publicado_pct > 0 ? '+' : ''}${n1(data.kpis.sesgo_publicado_pct)} %` : '—'} color={Math.abs(data.kpis.sesgo_publicado_pct ?? 0) > 10 ? '#DC2626' : '#64748B'} sub="Positivo: se pronosticó de más" /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Tooltip title="Cómo le fue al método elegido en los meses que no vio al ajustar. Existe desde el primer día, sin esperar a publicar."><Box><Cifra etiqueta="Exactitud en validación (modelo actual)" valor={pct(data.kpis.exactitud_validacion_pct)} color="#16A34A" sub={`${data.kpis.series_con_historia_suficiente} de ${data.kpis.series} series con historia suficiente`} /></Box></Tooltip></Grid>
      </Grid>
      {!data.por_mes.length && <Alert severity="info" sx={{ mb: 2 }}>Todavía no hay meses publicados que ya hayan pasado. La exactitud de lo publicado aparece cuando un pronóstico publicado se cruza con la demanda real.</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>{tabla('Lo publicado, por mes', data.por_mes, 'Mes')}</Grid>
        <Grid size={{ xs: 12, md: 4 }}>{tabla('Lo publicado, por familia', data.por_familia, 'Familia')}</Grid>
        <Grid size={{ xs: 12, md: 4 }}>{tabla('Modelo actual en validación, por familia', data.validacion_por_familia.map(v => ({ clave: v.familia, exactitud_pct: v.exactitud_pct, sesgo_pct: null, real: 0 })), 'Familia')}</Grid>
      </Grid>
    </Box>
  )
}

export default function APSDemanda() {
  const [tab, setTab] = useState(1)
  const [sel, setSel] = useState<SerieResumen | null>(null)
  const elegir = useMemo(() => (s: SerieResumen) => setSel(s), [])
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<TrendingUp sx={{ fontSize: 28 }} />} titulo="Planeación de la demanda" subtitulo="APS · Historia, pronóstico con selección de método, consenso y exactitud" color={C} />
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }} variant="scrollable">
            <Tab label="Historia" /><Tab label="Pronóstico" /><Tab label="Consenso" /><Tab label="Exactitud" />
          </Tabs>
          {tab === 0 && <Historia />}{tab === 1 && <Pronostico sel={sel} setSel={elegir} />}
          {tab === 2 && <Consenso sel={sel} />}{tab === 3 && <Exactitud />}
        </Paper>
      </Box>
    </Layout>
  )
}
