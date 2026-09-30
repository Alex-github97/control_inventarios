/**
 * APS · S&OP
 *
 * Era maqueta: un ciclo de junio con progreso, timeline, reuniones, consenso
 * por familia y brechas supply-demanda escritos a mano.
 *
 * Ahora un ciclo S&OP es un registro de reuniones: su mes, las revisiones
 * (demanda, supply, financiera, ejecutiva) con asistentes y compromisos, y los
 * acuerdos. El tablero del mes —demanda contra producción y compras por
 * familia, capacidad y alertas— sale del plan, no se escribe. Un ciclo
 * cerrado ya no se edita: sus acuerdos son registro.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Button, TextField, MenuItem, Alert, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Groups, DeleteOutline } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, pesos, pct, nombreR, mesCorto, NIVEL_ALERTA, type Ciclo } from '@/api/aps'
import { Encabezado, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const TIPOS_REV = ['Revisión de demanda', 'Revisión de supply', 'Revisión financiera', 'Revisión ejecutiva']

function Resumen({ periodo }: { periodo: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'soip-resumen', periodo], queryFn: () => apsApi.resumenSoip(periodo) })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  if (!data.en_horizonte) return <Alert severity="info">{mesCorto(periodo)} está fuera del horizonte del plan ({data.periodos?.[0] && mesCorto(data.periodos[0])} a {data.periodos && mesCorto(data.periodos[data.periodos.length - 1])}). El tablero se arma con el plan vigente.</Alert>
  return (
    <Box>
      <Table size="small">
        <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Familia</TableCell><TableCell align="right">Demanda</TableCell><TableCell align="right">Producción</TableCell><TableCell align="right">Compras</TableCell><TableCell align="right">Stock final</TableCell><TableCell align="right">Valor stock</TableCell></TableRow></TableHead>
        <TableBody>
          {data.familias?.map(f => (
            <TableRow key={f.familia} sx={{ '& td': { fontSize: 12 } }}>
              <TableCell><b>{f.familia}</b></TableCell><TableCell align="right">{n0(f.demanda)}</TableCell><TableCell align="right">{n0(f.produccion)}</TableCell>
              <TableCell align="right">{n0(f.compras)}</TableCell><TableCell align="right">{n0(f.stock_final)}</TableCell><TableCell align="right">{pesos(f.valor_stock)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Grid container spacing={2} mt={1}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography fontSize={12} fontWeight={700} color="text.secondary">Capacidad del mes</Typography>
          {data.capacidad?.map(c => <Typography key={c.recurso_id} fontSize={12} color={c.sobrecarga ? '#DC2626' : undefined}>{nombreR(data, c.recurso_id)}: {pct(c.uso_pct)}{c.sobrecarga ? ' — no alcanza' : ''}</Typography>)}
          {!data.capacidad?.length && <Typography fontSize={12} color="text.secondary">Sin recursos.</Typography>}
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography fontSize={12} fontWeight={700} color="text.secondary">Alertas a tratar</Typography>
          {data.alertas?.map((a, i) => <Typography key={i} fontSize={12}><span style={{ color: NIVEL_ALERTA[a.nivel] }}>●</span> {a.titulo}</Typography>)}
          {!data.alertas?.length && <Typography fontSize={12} color="text.secondary">Sin alertas.</Typography>}
        </Grid>
      </Grid>
    </Box>
  )
}

export default function APSSOIP() {
  const qc = useQueryClient()
  const { data: ciclos = [], isLoading } = useQuery({ queryKey: ['aps', 'ciclos'], queryFn: apsApi.ciclos })
  const [selId, setSelId] = useState<number | null>(null)
  const sel = ciclos.find(c => c.id === selId) ?? ciclos[0]
  const revs = useQuery({ queryKey: ['aps', 'revisiones', sel?.id], queryFn: () => apsApi.revisiones(sel!.id), enabled: !!sel })
  const [nuevo, setNuevo] = useState(false)
  const [f, setF] = useState({ nombre: '', periodo: '', facilitador: '' })
  const [acuerdos, setAcuerdos] = useState<string | null>(null)
  const [rev, setRev] = useState({ tipo: TIPOS_REV[0], fecha: '', asistentes: '', compromisos: '' })
  const refrescar = () => qc.invalidateQueries({ queryKey: ['aps'] })
  const hacer = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast.success(msg); refrescar(); return true } catch (e) { toast.error(errorApi(e)); return false } }
  const cerrado = sel?.estado === 'CERRADO'

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Groups sx={{ fontSize: 28 }} />} titulo="S&OP" subtitulo="APS · Ciclos de planeación de ventas y operaciones: reuniones, acuerdos y el tablero del mes" color={C} accion="Nuevo ciclo" onAccion={() => setNuevo(true)} />
        {isLoading && <LinearProgress />}
        {!isLoading && !ciclos.length && <Alert severity="info">Sin ciclos S&OP. Cree el del mes que se va a planear.</Alert>}
        {sel && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                {ciclos.map(c => (
                  <Box key={c.id} onClick={() => { setSelId(c.id); setAcuerdos(null) }} sx={{ p: 1.5, cursor: 'pointer', borderBottom: '1px solid #E2E8F0', bgcolor: c.id === sel.id ? '#EFF6FF' : undefined }}>
                    <Typography fontSize={13} fontWeight={700}>{c.nombre}</Typography>
                    <Typography fontSize={11} color="text.secondary">{mesCorto(c.periodo)} · {c.estado === 'CERRADO' ? 'cerrado' : 'abierto'}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                  <Box><Typography fontWeight={800}>{sel.nombre}</Typography><Typography fontSize={12} color="text.secondary">Mes que se planea: {mesCorto(sel.periodo)}{sel.facilitador ? ` · facilita ${sel.facilitador}` : ''}</Typography></Box>
                  <Etiqueta texto={cerrado ? `Cerrado ${sel.fecha_cierre?.slice(0, 10) ?? ''}` : 'Abierto'} color={cerrado ? '#64748B' : '#16A34A'} />
                </Box>
                <Typography fontSize={12} fontWeight={700} color="text.secondary" mt={2} mb={1}>Tablero del mes (sale del plan vigente)</Typography>
                <Resumen periodo={sel.periodo} />
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                <Typography fontWeight={700} mb={1}>Revisiones</Typography>
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Revisión</TableCell><TableCell>Fecha</TableCell><TableCell>Asistentes</TableCell><TableCell>Compromisos</TableCell><TableCell /></TableRow></TableHead>
                  <TableBody>
                    {(revs.data ?? []).map(r => (
                      <TableRow key={r.id} sx={{ '& td': { fontSize: 12 } }}>
                        <TableCell><b>{r.tipo}</b></TableCell><TableCell>{r.fecha?.slice(0, 10)}</TableCell><TableCell>{r.asistentes ?? '—'}</TableCell><TableCell>{r.compromisos ?? '—'}</TableCell>
                        <TableCell>{!cerrado && <IconButton size="small" aria-label={`Borrar ${r.tipo}`} onClick={() => hacer(() => apsApi.borrarRevision(r.id), 'Revisión borrada')}><DeleteOutline fontSize="small" /></IconButton>}</TableCell>
                      </TableRow>
                    ))}
                    {!revs.data?.length && <TableRow><TableCell colSpan={5} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin revisiones registradas.</TableCell></TableRow>}
                  </TableBody>
                </Table>
                {!cerrado && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                    <TextField select size="small" label="Revisión" value={rev.tipo} onChange={e => setRev(r => ({ ...r, tipo: e.target.value }))} sx={{ minWidth: 190 }}>{TIPOS_REV.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
                    <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={rev.fecha} onChange={e => setRev(r => ({ ...r, fecha: e.target.value }))} />
                    <TextField size="small" label="Asistentes" value={rev.asistentes} onChange={e => setRev(r => ({ ...r, asistentes: e.target.value }))} />
                    <TextField size="small" label="Compromisos" value={rev.compromisos} onChange={e => setRev(r => ({ ...r, compromisos: e.target.value }))} sx={{ flex: 1, minWidth: 200 }} />
                    <Button variant="outlined" disabled={!rev.fecha} onClick={() => hacer(() => apsApi.crearRevision({ ciclo_id: sel.id, tipo: rev.tipo, fecha: `${rev.fecha}T12:00:00Z`, asistentes: rev.asistentes || null, compromisos: rev.compromisos || null }), 'Revisión registrada').then(ok => ok && setRev({ tipo: TIPOS_REV[0], fecha: '', asistentes: '', compromisos: '' }))}>Registrar</Button>
                  </Box>
                )}
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography fontWeight={700} mb={1}>Acuerdos del ciclo</Typography>
                <TextField fullWidth multiline minRows={3} disabled={cerrado} value={acuerdos ?? sel.acuerdos ?? ''} onChange={e => setAcuerdos(e.target.value)} placeholder="Qué se decidió: volúmenes, prioridades, inversiones, riesgos aceptados" inputProps={{ 'aria-label': 'Acuerdos del ciclo' }} />
                {!cerrado && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button variant="outlined" disabled={acuerdos == null} onClick={() => hacer(() => apsApi.editarCiclo(sel.id, { nombre: sel.nombre, periodo: sel.periodo, fecha_inicio: sel.fecha_inicio, facilitador: sel.facilitador, acuerdos }), 'Acuerdos guardados').then(ok => ok && setAcuerdos(null))}>Guardar acuerdos</Button>
                    <Button variant="contained" sx={{ bgcolor: C }} onClick={() => { if (window.confirm('Al cerrar el ciclo sus acuerdos quedan como registro y no se editan. ¿Cerrar?')) hacer(() => apsApi.cerrarCiclo(sel.id), 'Ciclo cerrado') }}>Cerrar ciclo</Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
        <Dialog open={nuevo} onClose={() => setNuevo(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nuevo ciclo S&OP</DialogTitle>
          <DialogContent>
            <TextField fullWidth size="small" label="Nombre" value={f.nombre} onChange={e => setF(x => ({ ...x, nombre: e.target.value }))} sx={{ mt: 1, mb: 2 }} placeholder="Ej. S&OP noviembre" />
            <TextField fullWidth size="small" type="month" label="Mes que se planea" InputLabelProps={{ shrink: true }} value={f.periodo} onChange={e => setF(x => ({ ...x, periodo: e.target.value }))} sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="Facilitador" value={f.facilitador} onChange={e => setF(x => ({ ...x, facilitador: e.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNuevo(false)}>Cancelar</Button>
            <Button variant="contained" disabled={f.nombre.trim().length < 3 || !f.periodo} onClick={() => hacer(() => apsApi.crearCiclo({ nombre: f.nombre, periodo: f.periodo, facilitador: f.facilitador || null, fecha_inicio: new Date().toISOString() } as Partial<Ciclo>), 'Ciclo creado').then(ok => { if (ok) { setNuevo(false); setF({ nombre: '', periodo: '', facilitador: '' }) } })}>Crear</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
