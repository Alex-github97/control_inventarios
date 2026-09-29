/**
 * SST · Indicadores del sistema de gestión
 *
 * Era una maqueta: IF 7,0, IS 45, cobertura de EPP 94,2 % y seis meses de
 * gráficas escritos a mano, en un sistema que no sabía cuántas horas se
 * habían trabajado.
 *
 * Ahora los calcula el servidor con los incidentes, las inspecciones, las
 * capacitaciones y los períodos (trabajadores y horas-hombre de cada mes, que
 * se registran en Configuración). Un mes sin período no tiene índice y se
 * dice; las metas son las de Configuración.
 */
import { useState } from 'react'
import { Box, Typography, Paper, Chip, Alert, TextField, MenuItem, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Analytics } from '@mui/icons-material'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { sstApi } from '@/api/sst'
import { Encabezado } from '@/components/comun/Registro'
import { COLOR_MODULO, SERIES } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const EPP: Record<string, string> = { CABEZA: 'Cabeza', OJOS_CARA: 'Ojos', AUDITIVO: 'Auditivo', RESPIRATORIO: 'Respiratorio', MANOS: 'Manos', PIES: 'Pies', CUERPO: 'Cuerpo', CAIDAS: 'Caídas' }
const fmt = (n: number | null | undefined, d = 1) => (n == null ? '—' : n.toLocaleString('es-CO', { maximumFractionDigits: d }))

export default function SSTIndicadores() {
  const actual = new Date().getFullYear()
  const [anio, setAnio] = useState(actual)
  const { data, isLoading } = useQuery({ queryKey: ['sst-indicadores', anio], queryFn: () => sstApi.indicadores(anio) })
  const { data: cfg } = useQuery({ queryKey: ['sst-config'], queryFn: sstApi.config })
  const { data: tablero } = useQuery({ queryKey: ['sst-tablero'], queryFn: sstApi.tablero })
  const meta = (k: string) => (cfg?.[k] ? Number(cfg[k]) : null)

  const a = data?.anual
  // Solo hasta el mes actual en el año en curso: los meses futuros no son «cero accidentes».
  const hasta = anio === actual ? new Date().getMonth() + 1 : 12
  const meses = (data?.meses ?? []).slice(0, hasta).map(m => ({ ...m, nombre: MESES[m.mes - 1] }))
  const sinPeriodo = meses.filter(m => m.horas_hombre == null).map(m => m.nombre)

  type Tarjeta = { t: string; v: string; u: string; meta: number | null; cumple: boolean | null; d: string }
  const menor = (v: number | null | undefined, m: number | null) => (v == null || m == null ? null : v <= m)
  const mayor = (v: number | null | undefined, m: number | null) => (v == null || m == null ? null : v >= m)
  const tarjetas: Tarjeta[] = [
    { t: 'Índice de frecuencia (IF)', v: fmt(a?.if), u: 'AT / millón h-h', meta: meta('meta_if'), cumple: menor(a?.if, meta('meta_if')), d: 'AT con incapacidad × 1.000.000 / horas-hombre' },
    { t: 'Índice de severidad (IS)', v: fmt(a?.is), u: 'días / millón h-h', meta: meta('meta_is'), cumple: menor(a?.is, meta('meta_is')), d: 'Días perdidos × 1.000.000 / horas-hombre' },
    { t: 'Índice de lesión incapacitante', v: fmt(a?.ili, 3), u: 'ILI', meta: null, cumple: null, d: 'IF × IS / 1.000' },
    { t: 'Días sin accidente', v: tablero?.dias_sin_accidente == null ? '—' : String(tablero.dias_sin_accidente), u: 'días', meta: meta('meta_dias_sin_accidente'), cumple: mayor(tablero?.dias_sin_accidente, meta('meta_dias_sin_accidente')), d: tablero?.ultimo_accidente ? `Último accidente: ${tablero.ultimo_accidente}` : 'Sin accidentes registrados' },
    { t: 'Cumplimiento de capacitaciones', v: a?.cumplimiento_capacitaciones == null ? '—' : `${fmt(a.cumplimiento_capacitaciones)}%`, u: '', meta: meta('meta_cumplimiento_capacitaciones'), cumple: mayor(a?.cumplimiento_capacitaciones, meta('meta_cumplimiento_capacitaciones')), d: 'Completadas / programadas en el año' },
    { t: 'Cumplimiento de inspecciones', v: a?.cumplimiento_inspecciones == null ? '—' : `${fmt(a.cumplimiento_inspecciones)}%`, u: '', meta: meta('meta_cumplimiento_inspecciones'), cumple: mayor(a?.cumplimiento_inspecciones, meta('meta_cumplimiento_inspecciones')), d: 'Completadas / programadas en el año' },
    { t: 'EPP vigentes', v: a?.epp_vigentes_pct == null ? '—' : `${fmt(a.epp_vigentes_pct)}%`, u: '', meta: meta('meta_epp_vigentes'), cumple: mayor(a?.epp_vigentes_pct, meta('meta_epp_vigentes')), d: 'Entregas activas sin vencer' },
    { t: 'Proporción de AT mortales', v: a?.proporcion_at_mortales == null ? '—' : `${fmt(a.proporcion_at_mortales)}%`, u: '', meta: null, cumple: null, d: 'Resolución 0312: mortales / total de AT del año' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Encabezado icono={<Analytics sx={{ fontSize: 28 }} />} titulo="Indicadores SST" subtitulo="SST · IF, IS, ILI y cumplimiento del SG-SST" color={SST_COLOR} />
          <TextField select size="small" label="Año" value={anio} onChange={e => setAnio(Number(e.target.value))} sx={{ minWidth: 110 }}>
            {[actual, actual - 1, actual - 2].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        </Box>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        {sinPeriodo.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Faltan trabajadores y horas-hombre de: {sinPeriodo.join(', ')}. Sin ese dato no se calculan IF, IS ni ILI de esos meses.
            Regístralos en <RouterLink to="/sst/config">Configuración → Períodos</RouterLink>.
            {a && a.accidentes_sin_periodo > 0 && ` ${a.accidentes_sin_periodo} accidente(s) de esos meses no entran al índice anual.`}
          </Alert>
        )}

        <Grid container spacing={2} mb={3}>
          {tarjetas.map(t => {
            const color = t.cumple == null ? '#6B7280' : t.cumple ? '#15803D' : '#DC2626'
            return (
              <Grid key={t.t} size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(color, 0.3)}`, height: '100%' }}>
                  <Typography fontSize={12} color="text.secondary">{t.t}</Typography>
                  <Typography fontSize={24} fontWeight={800} color={color}>{t.v} <Typography component="span" fontSize={11} color="text.secondary">{t.u}</Typography></Typography>
                  {t.meta != null && <Chip size="small" label={`Meta ${t.t.startsWith('Índice') ? '≤' : '≥'} ${t.meta}`} sx={{ height: 18, fontSize: 10, mb: 0.5 }} />}
                  <Typography fontSize={11} color="text.disabled">{t.d}</Typography>
                </Paper>
              </Grid>
            )
          })}
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 300 }}>
              <Typography fontWeight={700} fontSize={14} mb={1}>Accidentalidad por mes</Typography>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={meses}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nombre" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend />
                  <Bar dataKey="accidentes" name="Accidentes de trabajo" fill={SERIES[0]} /><Bar dataKey="incidentes" name="Otros eventos" fill={SERIES[2]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 300 }}>
              <Typography fontWeight={700} fontSize={14} mb={1}>IF e IS por mes</Typography>
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={meses}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nombre" fontSize={11} /><YAxis yAxisId="if" fontSize={11} /><YAxis yAxisId="is" orientation="right" fontSize={11} /><Tooltip /><Legend />
                  <Line yAxisId="if" dataKey="if" name="IF" stroke={SERIES[0]} connectNulls={false} /><Line yAxisId="is" dataKey="is" name="IS" stroke={SERIES[1]} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 300 }}>
              <Typography fontWeight={700} fontSize={14} mb={1}>Inspecciones y capacitaciones</Typography>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={meses}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nombre" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend />
                  <Bar dataKey="inspecciones_programadas" name="Insp. programadas" fill={alpha(SERIES[1], 0.4)} /><Bar dataKey="inspecciones_completadas" name="Insp. completadas" fill={SERIES[1]} />
                  <Bar dataKey="capacitaciones_programadas" name="Cap. programadas" fill={alpha(SERIES[3], 0.4)} /><Bar dataKey="capacitaciones_completadas" name="Cap. completadas" fill={SERIES[3]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 300 }}>
              <Typography fontWeight={700} fontSize={14} mb={1}>EPP entregados vigentes por tipo</Typography>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={(data?.epp_por_tipo ?? []).map(e => ({ ...e, nombre: EPP[e.tipo] ?? e.tipo }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="nombre" width={90} fontSize={11} /><Tooltip />
                  <Bar dataKey="cantidad" name="Unidades" fill={SST_COLOR} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
              <Typography fontWeight={700} fontSize={14} sx={{ p: 2, pb: 0 }}>Detalle mensual (Resolución 0312 de 2019)</Typography>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                  <TableCell>Mes</TableCell><TableCell align="right">Trabajadores</TableCell><TableCell align="right">Horas-hombre</TableCell><TableCell align="right">AT</TableCell>
                  <TableCell align="right">Días perdidos</TableCell><TableCell align="right">Frecuencia</TableCell><TableCell align="right">Severidad</TableCell><TableCell align="right">Ausentismo</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {meses.map(m => (
                    <TableRow key={m.mes}>
                      <TableCell>{m.nombre}</TableCell>
                      <TableCell align="right">{fmt(m.trabajadores, 0)}</TableCell>
                      <TableCell align="right">{fmt(m.horas_hombre, 0)}</TableCell>
                      <TableCell align="right">{m.accidentes}</TableCell>
                      <TableCell align="right">{m.dias_perdidos}</TableCell>
                      <TableCell align="right">{m.frecuencia_0312 == null ? '—' : `${fmt(m.frecuencia_0312, 2)}%`}</TableCell>
                      <TableCell align="right">{m.severidad_0312 == null ? '—' : fmt(m.severidad_0312, 2)}</TableCell>
                      <TableCell align="right">{m.ausentismo == null ? '—' : `${fmt(m.ausentismo, 2)}%`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
