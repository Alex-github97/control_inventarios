/**
 * MES · Tablero de planta
 *
 * Tenía 1.743 líneas y, salvo seis cifras de arriba, todo era maqueta: líneas
 * de producción, órdenes activas, paradas en curso («Robot Soldadura R-02»),
 * alertas y las tendencias de cada indicador estaban escritas a mano, y
 * registrar una parada solo la agregaba a la memoria del navegador.
 *
 * Ahora sale de `/mes/analitica/tablero`: OEE por línea de los últimos 7
 * días, producción y desperdicio del día, órdenes activas con su avance,
 * paradas abiertas con los minutos que llevan (se cierran desde aquí) y
 * alertas derivadas de todo eso. Registrar una parada la guarda en el servidor
 * sobre una ejecución en curso.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Paper, Typography, Button, Alert, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Factory } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { Encabezado, Cifra, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const num = (v?: number | null, d = 0) => v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: d })
const NIVEL: Record<string, string> = { CRITICA: '#DC2626', ADVERTENCIA: '#D97706', INFO: '#2563EB' }
const TIPOS_PARADA: [string, string][] = [['NO_PLANEADA', 'No planeada'], ['MANTENIMIENTO', 'Mantenimiento'], ['CALIDAD', 'Calidad'], ['MATERIAL', 'Falta de material'], ['SETUP', 'Alistamiento'], ['PLANEADA', 'Planeada']]

interface Tablero {
  kpis: { oee_7d: number | null; produccion_hoy: number; scrap_hoy_pct: number | null; ordenes_activas: number; ordenes_atrasadas: number; paradas_abiertas: number; inspecciones_pendientes: number }
  lineas: { linea_id: number; nombre: string; planta: string | null; oee_7d: number | null; disponibilidad: number | null; rendimiento: number | null; calidad: number | null; produccion_hoy: number; scrap_hoy_pct: number | null; ordenes_activas: number; paradas_abiertas: number }[]
  paradas: { id: number; tipo: string; causa: string; descripcion: string | null; equipo: string | null; linea: string | null; planta: string | null; inicio: string | null; minutos: number | null }[]
  ordenes: { id: number; numero: string; producto: string | null; linea: string | null; estado: string; planificada: number; producida: number; avance_pct: number | null; fin_plan: string | null; atrasada: boolean }[]
  tendencia: { dia: string; oee: number | null; produccion: number; scrap_pct: number | null }[]
  alertas: { nivel: string; titulo: string; detalle: string }[]
  ejecuciones_activas: { id: number; orden: string | null; equipo_id: number | null; equipo: string | null; linea: string | null }[]
}

function Barras({ datos, valor, color, sufijo = '' }: { datos: Tablero['tendencia']; valor: (d: Tablero['tendencia'][number]) => number | null; color: string; sufijo?: string }) {
  const vals = datos.map(valor)
  const max = Math.max(...vals.map(v => v ?? 0), 1)
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 90 }}>
      {datos.map((d, i) => (
        <Box key={d.dia} title={`${d.dia}: ${num(vals[i], 1)}${sufijo}`} sx={{ flex: 1, height: `${((vals[i] ?? 0) / max) * 100}%`, minHeight: vals[i] ? 2 : 0, bgcolor: color, opacity: i === datos.length - 1 ? 1 : 0.55, borderRadius: '3px 3px 0 0' }} />
      ))}
    </Box>
  )
}

export default function MESDashboard() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['mes-tablero'], queryFn: () => api.get<Tablero>('/mes/analitica/tablero').then(r => r.data), refetchInterval: 60_000 })
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState({ ejecucion_id: '', tipo: 'NO_PLANEADA', causa: '', descripcion: '' })
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['mes-tablero'] }); qc.invalidateQueries({ queryKey: ['mes-dashboard-kpis'] }) }

  const cerrar = async (id: number) => {
    try { await api.put(`/mes/paradas/${id}/cerrar`); toast.success('Parada cerrada: su duración queda registrada'); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }
  const registrar = async () => {
    const ej = data?.ejecuciones_activas.find(e => e.id === Number(f.ejecucion_id))
    try {
      await api.post('/mes/paradas', { ejecucion_id: Number(f.ejecucion_id), tipo: f.tipo, causa: f.causa, descripcion: f.descripcion || null, equipo_id: ej?.equipo_id ?? null })
      toast.success('Parada registrada'); setAbierto(false); setF({ ejecucion_id: '', tipo: 'NO_PLANEADA', causa: '', descripcion: '' }); refrescar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  const k = data?.kpis

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Factory sx={{ fontSize: 28 }} />} titulo="Tablero de planta" subtitulo="MES · Líneas, órdenes y paradas en curso, con datos de la planta (se actualiza cada minuto)" color={C} accion="Registrar parada" onAccion={() => setAbierto(true)} />
        {isLoading && <LinearProgress />}
        {k && (<>
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="OEE (7 días)" valor={k.oee_7d != null ? `${num(k.oee_7d, 1)} %` : '—'} color={(k.oee_7d ?? 0) >= 85 ? '#16A34A' : (k.oee_7d ?? 0) >= 65 ? '#D97706' : '#DC2626'} sub="Clase mundial ≥ 85 %" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Producción hoy" valor={num(k.produccion_hoy)} color={C} sub="Unidades buenas" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Desperdicio hoy" valor={k.scrap_hoy_pct != null ? `${num(k.scrap_hoy_pct, 2)} %` : '—'} color={(k.scrap_hoy_pct ?? 0) > 5 ? '#DC2626' : '#16A34A'} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Órdenes activas" valor={k.ordenes_activas} color="#2563EB" sub={k.ordenes_atrasadas ? `${k.ordenes_atrasadas} pasadas de fecha` : undefined} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Paradas abiertas" valor={k.paradas_abiertas} color={k.paradas_abiertas ? '#DC2626' : '#16A34A'} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Inspecciones por dictaminar" valor={k.inspecciones_pendientes} color={k.inspecciones_pendientes ? '#D97706' : '#16A34A'} /></Grid>
          </Grid>

          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Typography fontWeight={800} mb={1}>Paradas en curso</Typography>
                {!data!.paradas.length && <Typography fontSize={13} color="text.secondary">No hay paradas abiertas.</Typography>}
                {data!.paradas.map(p => (
                  <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid #F1F5F9' }}>
                    <Box sx={{ minWidth: 70, textAlign: 'center' }}>
                      <Typography fontWeight={800} color={(p.minutos ?? 0) >= 60 ? '#DC2626' : '#D97706'}>{p.minutos != null ? (p.minutos >= 60 ? `${Math.floor(p.minutos / 60)} h ${p.minutos % 60}` : `${p.minutos} min`) : '—'}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontSize={13} fontWeight={700}>{p.equipo ?? p.linea ?? 'Sin equipo'} · {p.causa}</Typography>
                      <Typography fontSize={11} color="text.secondary">{TIPOS_PARADA.find(t => t[0] === p.tipo)?.[1] ?? p.tipo}{p.linea ? ` · ${p.linea}` : ''}{p.planta ? ` · ${p.planta}` : ''}{p.descripcion ? ` · ${p.descripcion}` : ''}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => cerrar(p.id)} aria-label={`Cerrar parada ${p.causa}`}>Cerrar parada</Button>
                  </Box>
                ))}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Typography fontWeight={800} mb={1}>Alertas</Typography>
                {!data!.alertas.length && <Typography fontSize={13} color="text.secondary">Sin alertas.</Typography>}
                {data!.alertas.map((a, i) => (
                  <Box key={i} sx={{ py: 0.75 }}>
                    <Typography fontSize={13} fontWeight={700}><span style={{ color: NIVEL[a.nivel] }}>●</span> {a.titulo}</Typography>
                    <Typography fontSize={12} color="text.secondary">{a.detalle}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', mb: 2 }}>
            <Typography fontWeight={800} sx={{ p: 2, pb: 0 }}>Líneas</Typography>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
                <TableCell>Línea</TableCell><TableCell>Planta</TableCell><TableCell align="right">OEE 7 días</TableCell><TableCell align="right">Disp.</TableCell>
                <TableCell align="right">Rend.</TableCell><TableCell align="right">Cal.</TableCell><TableCell align="right">Producción hoy</TableCell>
                <TableCell align="right">Desperdicio hoy</TableCell><TableCell align="right">Órdenes</TableCell><TableCell align="right">Paradas</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {data!.lineas.map(l => (
                  <TableRow key={l.linea_id} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell><b>{l.nombre}</b></TableCell><TableCell>{l.planta ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: l.oee_7d == null ? undefined : l.oee_7d >= 85 ? '#16A34A' : l.oee_7d >= 65 ? '#D97706' : '#DC2626' }}>{l.oee_7d != null ? `${num(l.oee_7d, 1)} %` : 'Sin registros'}</TableCell>
                    <TableCell align="right">{num(l.disponibilidad, 1)}</TableCell><TableCell align="right">{num(l.rendimiento, 1)}</TableCell><TableCell align="right">{num(l.calidad, 1)}</TableCell>
                    <TableCell align="right">{num(l.produccion_hoy)}</TableCell><TableCell align="right">{l.scrap_hoy_pct != null ? `${num(l.scrap_hoy_pct, 2)} %` : '—'}</TableCell>
                    <TableCell align="right">{l.ordenes_activas}</TableCell><TableCell align="right" sx={{ color: l.paradas_abiertas ? '#DC2626' : undefined, fontWeight: l.paradas_abiertas ? 700 : 400 }}>{l.paradas_abiertas}</TableCell>
                  </TableRow>
                ))}
                {!data!.lineas.length && <TableRow><TableCell colSpan={10} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin líneas registradas.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', height: '100%' }}>
                <Typography fontWeight={800} sx={{ p: 2, pb: 0 }}>Órdenes activas</Typography>
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Orden</TableCell><TableCell>Producto</TableCell><TableCell>Línea</TableCell><TableCell align="right">Avance</TableCell><TableCell>Fin planeado</TableCell></TableRow></TableHead>
                  <TableBody>
                    {data!.ordenes.map(o => (
                      <TableRow key={o.id} hover sx={{ '& td': { fontSize: 12 }, cursor: 'pointer', bgcolor: o.atrasada ? '#FEF2F2' : undefined }} onClick={() => nav('/mes/ordenes')}>
                        <TableCell><b>{o.numero}</b></TableCell><TableCell>{o.producto ?? '—'}</TableCell><TableCell>{o.linea ?? '—'}</TableCell>
                        <TableCell align="right">{num(o.producida)} / {num(o.planificada)} ({num(o.avance_pct, 0)} %)</TableCell>
                        <TableCell>{o.fin_plan ?? '—'}{o.atrasada && <> <Etiqueta texto="Pasada de fecha" color="#DC2626" /></>}</TableCell>
                      </TableRow>
                    ))}
                    {!data!.ordenes.length && <TableRow><TableCell colSpan={5} sx={{ fontSize: 12, color: 'text.secondary' }}>No hay órdenes liberadas ni en ejecución.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography fontWeight={800}>Últimos 14 días</Typography>
                <Typography fontSize={12} color="text.secondary" mt={1}>OEE (%)</Typography>
                <Barras datos={data!.tendencia} valor={d => d.oee} color={C} sufijo=" %" />
                <Typography fontSize={12} color="text.secondary" mt={1}>Producción (unidades buenas)</Typography>
                <Barras datos={data!.tendencia} valor={d => d.produccion} color="#0891B2" />
              </Paper>
            </Grid>
          </Grid>
        </>)}

        <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Registrar parada</DialogTitle>
          <DialogContent>
            {!data?.ejecuciones_activas.length && <Alert severity="info" sx={{ mt: 1 }}>No hay ejecuciones en curso. Una parada se registra sobre una ejecución iniciada; inicie una en Ejecución de planta.</Alert>}
            {!!data?.ejecuciones_activas.length && (<>
              <TextField select fullWidth size="small" label="Ejecución en curso" value={f.ejecucion_id} onChange={e => setF(x => ({ ...x, ejecucion_id: e.target.value }))} sx={{ mt: 1, mb: 2 }}>
                {data.ejecuciones_activas.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.orden ?? `Ejecución ${e.id}`} · {e.equipo ?? 'sin equipo'}{e.linea ? ` · ${e.linea}` : ''}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Tipo" value={f.tipo} onChange={e => setF(x => ({ ...x, tipo: e.target.value }))} sx={{ mb: 2 }}>
                {TIPOS_PARADA.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Causa" value={f.causa} onChange={e => setF(x => ({ ...x, causa: e.target.value }))} sx={{ mb: 2 }} placeholder="Ej. atasco en la banda de salida" />
              <TextField fullWidth size="small" multiline minRows={2} label="Descripción" value={f.descripcion} onChange={e => setF(x => ({ ...x, descripcion: e.target.value }))} />
              <Typography fontSize={11} color="text.secondary" mt={1}>La parada empieza ahora y queda abierta hasta que se cierre desde el tablero.</Typography>
            </>)}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variant="contained" disabled={!f.ejecucion_id || f.causa.trim().length < 3} onClick={registrar}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
