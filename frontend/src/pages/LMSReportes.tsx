/**
 * LMS · Reportes
 *
 * Era una maqueta: KPIs por área, horas, «matriz de compliance» y top de
 * cursos escritos a mano. Ahora sale de las inscripciones, los cursos y la
 * matriz reales. El cumplimiento de obligatorios se mide por cargo: de las
 * personas de cada cargo, cuántas completaron cada curso obligatorio.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress, alpha } from '@mui/material'
import { Assessment } from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { lmsApi } from '@/api/lms'
import { Encabezado, TablaRegistros } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const color = (p: number) => (p >= 90 ? '#15803D' : p >= 60 ? '#D97706' : '#DC2626')

export default function LMSReportes() {
  const { data, isLoading } = useQuery({ queryKey: ['lms-reportes'], queryFn: lmsApi.reportes })
  const { data: matriz = [] } = useQuery({ queryKey: ['lms-matriz'], queryFn: lmsApi.matriz.listar })
  const [tab, setTab] = useState(0)
  const porCargo = Object.values(matriz.reduce<Record<string, { id: number; cargo: string; total: number; brechas: number; suma: number }>>((acc, m, i) => {
    const x = acc[m.cargo] ??= { id: i + 1, cargo: m.cargo, total: 0, brechas: 0, suma: 0 }
    x.total++; if (m.brecha > 0) x.brechas++; x.suma += m.brecha; return acc
  }, {})).sort((a, b) => b.suma - a.suma)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Assessment sx={{ fontSize: 28 }} />} titulo="Reportes de formación" subtitulo="LMS · Cumplimiento, horas, brechas y cursos" color={LMS_COLOR} />
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable"><Tab label="Obligatorios por cargo" /><Tab label="Horas de capacitación" /><Tab label="Brechas por cargo" /><Tab label="Top de cursos" /></Tabs>
        {tab === 0 && (
          !data?.obligatorios.length ? <Typography color="text.secondary">No hay cursos obligatorios publicados.</Typography> : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}><TableCell>Cargo</TableCell><TableCell align="right">Personas</TableCell>{data.obligatorios.map(o => <TableCell key={o} align="center">{o}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {data.cumplimiento_por_cargo.map(c => (
                    <TableRow key={c.cargo}>
                      <TableCell><b>{c.cargo}</b></TableCell><TableCell align="right">{c.personas}</TableCell>
                      {c.cursos.map(x => { const p = c.personas ? (x.completaron / c.personas) * 100 : 0; return <TableCell key={x.curso} align="center" sx={{ bgcolor: alpha(color(p), 0.12), color: color(p), fontWeight: 700 }}>{x.completaron}/{c.personas} · {p.toFixed(0)}%</TableCell> })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )
        )}
        {tab === 1 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 340 }}>
            <Typography fontWeight={700} fontSize={14} mb={1}>Horas de cursos completados por mes · total {data?.horas_por_mes.reduce((s, m) => s + m.horas, 0).toFixed(1) ?? 0} h</Typography>
            {!data?.horas_por_mes.length ? <Typography color="text.secondary" fontSize={13}>Aún no hay cursos completados.</Typography> : (
              <ResponsiveContainer width="100%" height="88%"><BarChart data={data.horas_por_mes}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="horas" name="Horas" fill={LMS_COLOR} /></BarChart></ResponsiveContainer>
            )}
          </Paper>
        )}
        {tab === 2 && <TablaRegistros filas={porCargo} vacio="Sin matriz de competencias" etiqueta={c => c.cargo}
          columnas={[{ titulo: 'Cargo', valor: c => <b>{c.cargo}</b> }, { titulo: 'Competencias', alinear: 'right', valor: c => c.total }, { titulo: 'Con brecha', alinear: 'right', valor: c => c.brechas },
            { titulo: 'Niveles por cerrar', alinear: 'right', valor: c => <Box sx={{ color: c.suma ? '#DC2626' : '#15803D', fontWeight: 700 }}>{c.suma}</Box> }]} />}
        {tab === 3 && <TablaRegistros filas={(data?.top_cursos ?? []).map((c, i) => ({ ...c, id: i + 1 }))} vacio="Sin cursos" etiqueta={c => c.curso}
          columnas={[{ titulo: 'Curso', valor: c => <><b>{c.curso}</b><Typography fontSize={11} color="text.secondary">{c.codigo}</Typography></> }, { titulo: 'Inscritos', alinear: 'right', valor: c => c.inscritos },
            { titulo: 'Completaron', alinear: 'right', valor: c => c.completados }, { titulo: 'Finalización', alinear: 'right', valor: c => (c.tasa == null ? '—' : `${c.tasa}%`) },
            { titulo: 'Nota promedio', alinear: 'right', valor: c => c.nota_promedio ?? '—' }]} />}
      </Box>
    </Layout>
  )
}
