/**
 * GRC · Tablero de gobierno, riesgo y cumplimiento
 *
 * Era una maqueta: cifras, riesgos críticos, auditorías y «cumplimiento por
 * marco» escritos a mano. Ahora las cifras vienen del servidor (que tenía dos
 * fijas en cero: auditorías en curso y terceros críticos), y las listas se
 * arman con los riesgos, auditorías y evaluaciones de cumplimiento reales.
 */
import { Box, Typography, Paper, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { AccountBalance } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { grcApi } from '@/api/grc'
import { Cifra, Encabezado, Etiqueta, fmtFecha } from '@/components/comun/Registro'
import { PRIORIDAD_COLOR, TIPOS_OBLIGACION, TIPOS_AUDITORIA, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO

export default function GRCDashboard() {
  const { data: k, isLoading } = useQuery({ queryKey: ['grc-tablero'], queryFn: grcApi.tablero })
  const { data: riesgos = [] } = useQuery({ queryKey: ['grc-riesgos'], queryFn: () => grcApi.riesgos.listar() })
  const { data: auditorias = [] } = useQuery({ queryKey: ['grc-auditorias'], queryFn: () => grcApi.auditorias.listar() })
  const { data: matriz = [] } = useQuery({ queryKey: ['grc-cumplimiento'], queryFn: () => grcApi.cumplimiento.listar() })
  const { data: obligaciones = [] } = useQuery({ queryKey: ['grc-obligaciones'], queryFn: () => grcApi.obligaciones.listar() })

  const criticos = riesgos.filter(r => ['critica', 'alta'].includes(r.prioridad ?? '') && !['cerrado', 'mitigado'].includes(r.estado)).slice(0, 6)
  const hoy = new Date().toISOString().slice(0, 10)
  const proximas = auditorias.filter(a => a.estado === 'planificada' && (a.fecha_inicio ?? '') >= hoy)
    .sort((a, b) => (a.fecha_inicio ?? '').localeCompare(b.fecha_inicio ?? '')).slice(0, 5)
  const porTipo = TIPOS_OBLIGACION.map(([t, l]) => {
    const ids = new Set(obligaciones.filter(o => o.tipo === t).map(o => o.id))
    const filas = matriz.filter(m => ids.has(m.obligacion_id) && m.puntaje != null)
    return { t, l, n: filas.length, prom: filas.length ? filas.reduce((s, m) => s + (m.puntaje ?? 0), 0) / filas.length : null }
  }).filter(x => x.n)
  const n = (key: string) => (k ? k[key] ?? 0 : '—')

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<AccountBalance sx={{ fontSize: 28 }} />} titulo="Gobierno, riesgo y cumplimiento" subtitulo="GRC · Tablero de control" color={GRC_COLOR} />
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Riesgos abiertos" valor={n('riesgos_abiertos')} color={GRC_COLOR} sub={`${n('riesgos_criticos')} de prioridad crítica`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Controles efectivos" valor={k ? `${k.controles_efectivos_pct}%` : '—'} color="#15803D" sub={`${n('controles_total')} controles`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cumplimiento general" valor={k ? `${k.cumplimiento_general_pct}%` : '—'} color="#0369A1" sub={`${n('obligaciones_vencidas')} obligaciones vencidas`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Hallazgos abiertos" valor={n('hallazgos_abiertos')} color="#DC2626" sub={`${n('hallazgos_cerrados')} cerrados`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Auditorías en curso" valor={n('auditorias_en_curso')} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Incidentes abiertos" valor={n('incidentes_abiertos')} color="#EA580C" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Terceros de riesgo alto o crítico" valor={n('terceros_criticos')} color="#7C3AED" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Políticas publicadas" valor={n('politicas_vigentes')} color="#15803D" sub={`${n('politicas_vencidas')} vencidas`} /></Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', height: '100%' }}>
              <Typography fontWeight={700} fontSize={14} sx={{ p: 2, pb: 1 }}>Riesgos de prioridad crítica y alta</Typography>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}><TableCell>Riesgo</TableCell><TableCell>Responsable</TableCell><TableCell align="center">Residual</TableCell><TableCell>Prioridad</TableCell></TableRow></TableHead>
                <TableBody>
                  {criticos.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Ningún riesgo abierto de prioridad crítica o alta</TableCell></TableRow>}
                  {criticos.map(r => (
                    <TableRow key={r.id}>
                      <TableCell sx={{ fontSize: 12 }}><b>{r.nombre}</b><Typography fontSize={11} color="text.secondary">{r.codigo}</Typography></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.responsable ?? '—'}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 12 }}>{r.nivel_residual ?? r.nivel_inherente ?? '—'}</TableCell>
                      <TableCell>{r.prioridad && <Etiqueta texto={r.prioridad} color={PRIORIDAD_COLOR[r.prioridad]} />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
              <Typography fontWeight={700} fontSize={14} mb={1}>Cumplimiento por tipo de obligación</Typography>
              {porTipo.length === 0 && <Typography fontSize={12} color="text.secondary">Sin evaluaciones con puntaje en la matriz.</Typography>}
              {porTipo.map(x => (
                <Box key={x.t} sx={{ mb: 1.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography fontSize={12}>{x.l}</Typography><Typography fontSize={12} fontWeight={700}>{x.prom!.toFixed(0)}%</Typography></Box>
                  <LinearProgress variant="determinate" value={x.prom!} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: x.prom! >= 90 ? '#15803D' : x.prom! >= 70 ? '#D97706' : '#DC2626' } }} />
                </Box>
              ))}
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={700} fontSize={14} mb={1}>Próximas auditorías</Typography>
              {proximas.length === 0 && <Typography fontSize={12} color="text.secondary">No hay auditorías planificadas desde hoy.</Typography>}
              {proximas.map(a => (
                <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                  <Box><Typography fontSize={12} fontWeight={600}>{a.nombre}</Typography><Typography fontSize={11} color="text.secondary">{etiqueta(TIPOS_AUDITORIA, a.tipo)} · {a.auditor_lider ?? 'sin auditor'}</Typography></Box>
                  <Typography fontSize={12}>{fmtFecha(a.fecha_inicio)}</Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
