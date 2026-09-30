/**
 * GRC · Analítica de riesgo
 *
 * Era una pantalla «IA» con insights de confianza del 88 al 97 %
 * («riesgos cibernéticos en Q3», «anomalía SARLAFT»), predicciones y
 * recomendaciones escritas a mano. Ahora (ver
 * `backend/app/api/v1/endpoints/grc_analitica.py`):
 *
 *  - Incidentes: tendencia, incidentes que se repiten y tiempo de resolución
 *    con Kaplan-Meier, que cuenta los abiertos en vez de ignorarlos.
 *  - ¿La matriz acierta?: el riesgo evaluado de cada proceso contra los
 *    incidentes que de verdad ocurrieron, y los controles «efectivos» que la
 *    experiencia pone en duda.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, Alert, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody,
  ToggleButtonGroup, ToggleButton, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Insights } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { Encabezado, Cifra, Etiqueta } from '@/components/comun/Registro'
import { CartaControl, num, type PuntoCarta } from '@/components/analitica/Analitica'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const R = '/grc/analitica'

interface MK { suficiente: boolean; p?: number; pendiente?: number; tendencia?: 'SUBE' | 'BAJA' | 'ESTABLE'; puntos?: number; minimo?: number }
interface Resolucion { severidad: string; suficiente: boolean; eventos: number; abiertos: number; minimo?: number; mediana?: number | null; p90?: number | null; curva: [number, number][] }
interface Incidentes {
  total: number; meses: string[]
  carta: { suficiente: boolean; puntos?: number; minimo?: number; centro?: number; lcs?: number; lci?: number; puntos_base?: number; serie?: PuntoCarta[] }
  tendencia_total?: MK; tendencias: (MK & { dimension: string; nivel: string; total: number })[]
  resolucion: Resolucion[]
  abiertos: { id: number; codigo?: string; titulo: string; severidad?: string; proceso?: string; dias_abierto: number; mas_lento_que_pct: number | null; prob_cierre_30d: number | null }[]
  recurrentes: { terminos: string[]; cantidad: number; titulo: string; desde: string; hasta: string; graves: number; procesos: string[]; con_leccion: number }[]
}
interface Matriz {
  meses: number
  procesos: { proceso: string; riesgos: number; nivel_maximo: number | null; zona: string; incidentes: number; graves: number; veredicto: 'SUBESTIMADO' | 'SIN_RIESGOS' | 'SIN_EVIDENCIA' | 'COHERENTE'; riesgo_mayor: string | null }[]
  correlacion: { suficiente: boolean; rho?: number; p?: number; puntos: number; minimo?: number }
  controles_en_duda: { control: string; codigo?: string; procesos: string[]; incidentes_graves: number; ultima_evaluacion: string | null }[]
  incidentes_sin_proceso: number
}

const TEND = { SUBE: ['Sube', '#DC2626'], BAJA: ['Baja', '#16A34A'], ESTABLE: ['Estable', '#64748B'] } as const
const SEV_COLOR: Record<string, string> = { CRITICA: '#7F1D1D', ALTA: '#DC2626', MEDIA: '#D97706', BAJA: '#16A34A', TODAS: C }

function CurvaResolucion({ filas }: { filas: Resolucion[] }) {
  const validas = filas.filter(f => f.suficiente && f.curva.length > 1)
  if (!validas.length) return null
  const max = Math.min(Math.max(...validas.map(f => f.curva[f.curva.length - 1][0])), 365)
  const w = 520, h = 180, pl = 36, pb = 20
  const x = (t: number) => pl + (Math.min(t, max) / max) * (w - pl - 8)
  // s es la fracción todavía abierta: resuelto = 1 − s, que sube de abajo (0 %) a arriba (100 %).
  const y = (s: number) => 8 + s * (h - pb - 8)
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Curva de resolución">
      <line x1={pl} x2={w - 8} y1={h - pb} y2={h - pb} stroke="#CBD5E1" />
      <text x={2} y={12} fontSize={9} fill="#64748B">100 %</text><text x={2} y={h - pb} fontSize={9} fill="#64748B">0 %</text>
      <text x={w - 8} y={h - 4} fontSize={9} fill="#64748B" textAnchor="end">{num(max)} días</text>
      {validas.map(f => {
        let d = `M${x(0)},${y(1)}`
        let prev = 1
        for (const [t, s] of f.curva) { d += ` L${x(t)},${y(prev)} L${x(t)},${y(s)}`; prev = s }
        return <path key={f.severidad} d={d} fill="none" stroke={SEV_COLOR[f.severidad] ?? C} strokeWidth={f.severidad === 'TODAS' ? 2.5 : 1.5} strokeDasharray={f.severidad === 'TODAS' ? '5 3' : undefined} />
      })}
    </svg>
  )
}

function Incidentes() {
  const { data, isLoading } = useQuery({ queryKey: ['grc-analitica-incidentes'], queryFn: () => api.get(`${R}/incidentes`).then(r => r.data as Incidentes), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  if (!data.total) return <Alert severity="info">Aún no hay incidentes registrados.</Alert>
  const todas = data.resolucion.find(r => r.severidad === 'TODAS')
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Incidentes registrados" valor={num(data.total)} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Tendencia mensual" valor={data.tendencia_total?.suficiente ? TEND[data.tendencia_total.tendencia!][0] : '—'} color={data.tendencia_total?.tendencia ? TEND[data.tendencia_total.tendencia][1] : '#64748B'} sub={data.tendencia_total?.suficiente ? `p = ${num(data.tendencia_total.p, 3)}` : 'Faltan meses'} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Días para resolver (mediana)" valor={num(todas?.mediana, 1)} color="#7C3AED" sub="Contando los abiertos (Kaplan-Meier)" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Abiertos" valor={num(todas?.abiertos)} color="#D97706" /></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography fontWeight={800}>Incidentes por mes</Typography>
        {data.carta.suficiente ? (<>
          <Typography fontSize={12} color="text.secondary">Carta c · promedio {num(data.carta.centro, 1)} por mes en los primeros {data.carta.puntos_base} meses</Typography>
          <CartaControl serie={data.carta.serie!} centro={data.carta.centro!} lcs={data.carta.lcs} lci={data.carta.lci} unidad="" color={C} />
        </>) : <Typography fontSize={12} color="text.secondary">Faltan meses para fijar límites ({data.carta.puntos} de {data.carta.minimo}).</Typography>}
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Por</TableCell><TableCell>Grupo</TableCell><TableCell align="right">Incidentes</TableCell><TableCell>Tendencia</TableCell><TableCell align="right">p</TableCell></TableRow></TableHead>
          <TableBody>
            {data.tendencias.map(t => (
              <TableRow key={t.dimension + t.nivel} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell>{t.dimension}</TableCell><TableCell><b>{t.dimension === 'Proceso' ? t.nivel : t.nivel.charAt(0) + t.nivel.slice(1).toLowerCase()}</b></TableCell><TableCell align="right">{t.total}</TableCell>
                <TableCell>{t.suficiente ? <Etiqueta texto={TEND[t.tendencia!][0]} color={TEND[t.tendencia!][1]} /> : '—'}</TableCell>
                <TableCell align="right">{t.suficiente ? num(t.p, 3) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography fontWeight={800}>¿Cuánto tarda en resolverse?</Typography>
            <Typography fontSize={12} color="text.secondary" mb={1}>Porcentaje ya resuelto según los días transcurridos. Los abiertos cuentan hasta hoy: sin eso el tiempo saldría más corto de lo que es.</Typography>
            <CurvaResolucion filas={data.resolucion} />
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Severidad</TableCell><TableCell align="right">Resueltos</TableCell><TableCell align="right">Abiertos</TableCell><TableCell align="right">Mediana (días)</TableCell><TableCell align="right">El 90 % en</TableCell></TableRow></TableHead>
              <TableBody>
                {data.resolucion.map(r => (
                  <TableRow key={r.severidad} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell><span style={{ color: SEV_COLOR[r.severidad] }}>■</span> {r.severidad === 'TODAS' ? 'Todas' : r.severidad.charAt(0) + r.severidad.slice(1).toLowerCase()}</TableCell>
                    <TableCell align="right">{r.eventos}</TableCell><TableCell align="right">{r.abiertos}</TableCell>
                    <TableCell align="right">{r.suficiente ? num(r.mediana, 1) : <Tooltip title={`Hacen falta ${r.minimo} resueltos`}><span>—</span></Tooltip>}</TableCell>
                    <TableCell align="right">{r.suficiente && r.p90 != null ? `${num(r.p90)} días` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', overflow: 'auto' }}>
            <Typography fontWeight={800}>Abiertos que ya tardan más de lo normal</Typography>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Incidente</TableCell><TableCell align="right">Días abierto</TableCell><TableCell align="right">Más lento que</TableCell><TableCell align="right">Se cierre en 30 días</TableCell></TableRow></TableHead>
              <TableBody>
                {data.abiertos.slice(0, 12).map(a => (
                  <TableRow key={a.id} sx={{ '& td': { fontSize: 12 }, bgcolor: (a.mas_lento_que_pct ?? 0) >= 90 ? '#FEF2F2' : undefined }}>
                    <TableCell><b>{a.codigo ?? a.id}</b> {a.titulo}<Typography fontSize={11} color="text.secondary">{a.proceso ?? 'Sin proceso'} · {a.severidad?.toLowerCase()}</Typography></TableCell>
                    <TableCell align="right">{a.dias_abierto}</TableCell>
                    <TableCell align="right">{a.mas_lento_que_pct != null ? `${a.mas_lento_que_pct} % de los resueltos` : '—'}</TableCell>
                    <TableCell align="right">{a.prob_cierre_30d != null ? `${num(a.prob_cierre_30d, 0)} %` : <Tooltip title="Lleva más tiempo abierto que cualquier incidente resuelto: la historia no dice nada de este caso"><span>sin datos</span></Tooltip>}</TableCell>
                  </TableRow>
                ))}
                {!data.abiertos.length && <TableRow><TableCell colSpan={4} sx={{ fontSize: 12, color: 'text.secondary' }}>No hay incidentes abiertos.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography fontWeight={800}>Incidentes que se repiten</Typography>
        <Typography fontSize={12} color="text.secondary" mb={1}>Agrupados por lo que dicen. Si un grupo tiene incidentes graves y ninguno registra lección aprendida, la organización no está aprendiendo de ellos. Sinónimos sin raíz común («hurto» y «robo») pueden quedar en grupos distintos.</Typography>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Problema</TableCell><TableCell align="right">Veces</TableCell><TableCell align="right">Graves</TableCell><TableCell>Procesos</TableCell><TableCell>Periodo</TableCell><TableCell align="right">Con lección</TableCell></TableRow></TableHead>
          <TableBody>
            {data.recurrentes.map((g, i) => (
              <TableRow key={i} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell><b>{g.titulo}</b><Typography fontSize={11} color="text.secondary">{g.terminos.slice(0, 4).join(' · ')}</Typography></TableCell>
                <TableCell align="right">{g.cantidad}</TableCell><TableCell align="right">{g.graves}</TableCell>
                <TableCell>{g.procesos.join(', ')}</TableCell><TableCell>{g.desde} a {g.hasta}</TableCell>
                <TableCell align="right" sx={{ color: g.graves && !g.con_leccion ? '#DC2626' : undefined, fontWeight: g.graves && !g.con_leccion ? 700 : undefined }}>{g.con_leccion} de {g.cantidad}</TableCell>
              </TableRow>
            ))}
            {!data.recurrentes.length && <TableRow><TableCell colSpan={6} sx={{ fontSize: 12, color: 'text.secondary' }}>No se encontraron incidentes repetidos (grupos de 3 o más).</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

const VEREDICTO = {
  SUBESTIMADO: ['Riesgo subestimado', '#DC2626', 'Hubo incidentes graves pero la matriz lo califica por debajo de alto. Reevaluar probabilidad e impacto.'],
  SIN_RIESGOS: ['Sin riesgos registrados', '#D97706', 'Tiene incidentes y ningún riesgo identificado en la matriz.'],
  SIN_EVIDENCIA: ['Crítico sin incidentes', '#2563EB', 'Riesgo crítico sin incidentes en el periodo: los controles funcionan, o la calificación está exagerada. Vale la pena revisar cuál.'],
  COHERENTE: ['Coherente', '#16A34A', 'La calificación concuerda con lo ocurrido.'],
} as const

function MatrizVsRealidad() {
  const [meses, setMeses] = useState(12)
  const { data, isLoading } = useQuery({ queryKey: ['grc-analitica-matriz', meses], queryFn: () => api.get(`${R}/matriz`, { params: { meses } }).then(r => r.data as Matriz), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const alertas = data.procesos.filter(p => p.veredicto !== 'COHERENTE').length
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography fontSize={13} color="text.secondary" sx={{ flex: 1, minWidth: 280 }}>
          La matriz de riesgos es una predicción: dice dónde se espera que pasen cosas graves. Aquí se contrasta, proceso por proceso, con los incidentes que de verdad ocurrieron.
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={meses} onChange={(_, v) => v && setMeses(v)}>
          {[6, 12, 24].map(m => <ToggleButton key={m} value={m}>{m} meses</ToggleButton>)}
        </ToggleButtonGroup>
      </Box>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 4 }}><Cifra etiqueta="Procesos con discrepancia" valor={alertas} color={alertas ? '#DC2626' : '#16A34A'} sub={`de ${data.procesos.length}`} /></Grid>
        <Grid size={{ xs: 6, md: 4 }}><Cifra etiqueta="Controles «efectivos» en duda" valor={data.controles_en_duda.length} color={data.controles_en_duda.length ? '#D97706' : '#16A34A'} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Tooltip title="Correlación de rangos entre el riesgo evaluado y los incidentes, por proceso. Cerca de 1: la matriz ordena bien los procesos."><Box><Cifra etiqueta="¿Ordena bien la matriz?" valor={data.correlacion.suficiente ? `ρ = ${num(data.correlacion.rho, 2)}` : '—'} color={C} sub={data.correlacion.suficiente ? `p = ${num(data.correlacion.p, 3)}` : `Hacen falta ${data.correlacion.minimo} procesos con riesgo evaluado; hay ${data.correlacion.puntos}`} /></Box></Tooltip></Grid>
      </Grid>
      {data.incidentes_sin_proceso > 0 && <Alert severity="info" sx={{ mb: 2 }}>{data.incidentes_sin_proceso} incidentes no tienen proceso y no se pueden contrastar.</Alert>}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', mb: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Proceso</TableCell><TableCell align="right">Riesgos</TableCell><TableCell align="right">Nivel más alto</TableCell><TableCell align="right">Incidentes</TableCell><TableCell align="right">Graves</TableCell><TableCell>Lectura</TableCell></TableRow></TableHead>
          <TableBody>
            {data.procesos.map(p => (
              <TableRow key={p.proceso} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell><b>{p.proceso}</b>{p.riesgo_mayor && <Typography fontSize={11} color="text.secondary">{p.riesgo_mayor}</Typography>}</TableCell>
                <TableCell align="right">{p.riesgos}</TableCell>
                <TableCell align="right">{p.nivel_maximo ?? '—'} <Typography component="span" fontSize={10} color="text.secondary">{p.zona.toLowerCase().replace('_', ' ')}</Typography></TableCell>
                <TableCell align="right">{p.incidentes}</TableCell><TableCell align="right">{p.graves}</TableCell>
                <TableCell><Tooltip title={VEREDICTO[p.veredicto][2]}><span><Etiqueta texto={VEREDICTO[p.veredicto][0]} color={VEREDICTO[p.veredicto][1]} /></span></Tooltip></TableCell>
              </TableRow>
            ))}
            {!data.procesos.length && <TableRow><TableCell colSpan={6} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin riesgos ni incidentes con proceso asignado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {data.controles_en_duda.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography fontWeight={800}>Controles calificados «efectivos» donde siguen pasando incidentes graves</Typography>
          <Typography fontSize={12} color="text.secondary" mb={1}>No prueba que el control falle; dice que su calificación no se ha contrastado con la realidad. Conviene probarlo de nuevo.</Typography>
          {data.controles_en_duda.map(c => (
            <Typography key={c.control} fontSize={13}>• <b>{c.control}</b> ({c.procesos.join(', ')}): {c.incidentes_graves} incidentes graves en {data.meses} meses · última evaluación {c.ultima_evaluacion ?? 'nunca'}</Typography>
          ))}
        </Paper>
      )}
    </Box>
  )
}

export default function GRCIA() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Insights sx={{ fontSize: 28 }} />} titulo="Analítica de riesgo" subtitulo="GRC · Incidentes y contraste de la matriz de riesgos con lo que de verdad pasó" color={C} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E2E8F0' }}>
          <Tab label="Incidentes" />
          <Tab label="¿La matriz acierta?" />
        </Tabs>
        {tab === 0 && <Incidentes />}
        {tab === 1 && <MatrizVsRealidad />}
      </Box>
    </Layout>
  )
}
