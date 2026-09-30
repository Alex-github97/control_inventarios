/**
 * QMS · Analítica de calidad
 *
 * Era una pantalla «IA» con insights de confianza 94 %, una «correlación 0,74»
 * con la rotación de personal, un Ishikawa de causas fijas y una predicción de
 * NC para julio, todo escrito a mano. Ahora (ver
 * `backend/app/api/v1/endpoints/qms_analitica.py`):
 *
 *  - Tendencias: carta c de NC por mes y Mann-Kendall por proceso, origen y
 *    gravedad; quejas y días de cierre.
 *  - Problemas recurrentes: NC agrupadas por lo que dicen, y si el problema
 *    volvió después de cerrar su CAPA (eficacia, ISO 9001 10.2.1 d).
 *  - Proveedores: tendencia del puntaje con intervalo y proyección al mínimo.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, Alert, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Accordion, AccordionSummary, AccordionDetails, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Insights, ExpandMore } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { Encabezado, Cifra, Etiqueta } from '@/components/comun/Registro'
import { CartaControl, num, type PuntoCarta } from '@/components/analitica/Analitica'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const R = '/qms/analitica'

interface MK { suficiente: boolean; puntos?: number; minimo?: number; p?: number; pendiente?: number; tendencia?: 'SUBE' | 'BAJA' | 'ESTABLE' }
interface Tendencias {
  meses: string[]; mes_en_curso?: { mes: string; nc: number }; total: number[]
  carta: { suficiente: boolean; puntos?: number; minimo?: number; centro?: number; lcs?: number; lci?: number; puntos_base?: number; serie?: PuntoCarta[] }
  tendencia_total: MK; grupos: (MK & { dimension: string; nivel: string; total: number; serie: number[] })[]
  quejas: (MK & { total: number; serie: number[] }) | null
  cierre: (MK & { mediana_dias: number | null; meses_con_cierres: number }) | null
}
interface Grupo {
  terminos: string[]; cantidad: number; ultimos_90_dias: number; desde: string; hasta: string; procesos: string[]
  abiertas: number; sin_capa: number
  ncs: { id: number; codigo?: string; titulo: string; fecha: string; estado: string; proceso?: string }[]
  capas: { capa: string; titulo: string; estado: string; cerrada?: string; dias_desde_cierre?: number; reincidencias?: number; reincidencias_codigos?: string[]; veredicto: 'INEFICAZ' | 'SIN_REINCIDENCIA' | 'MUY_PRONTO' | 'ABIERTA' }[]
}
interface Proveedor {
  proveedor: string; nit?: string; evaluaciones: number; ultimo: number; ultimo_periodo: string; promedio: number
  serie: { periodo: string; puntaje: number }[]; suficiente: boolean; pendiente?: number; ic90?: [number, number]
  significativa?: boolean; meses_para_minimo: number | null; estado: 'BAJO_MINIMO' | 'EN_CAIDA' | 'ESTABLE' | 'MEJORA' | 'POCOS_DATOS'
}

const TEND = { SUBE: ['Sube', '#DC2626'], BAJA: ['Baja', '#16A34A'], ESTABLE: ['Estable', '#64748B'] } as const

function Mini({ serie, color }: { serie: number[]; color: string }) {
  const w = 120, h = 28, max = Math.max(...serie, 1)
  const d = serie.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(serie.length - 1, 1)) * w).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(' ')
  return <svg width={w} height={h} role="img" aria-label="Serie mensual"><path d={d} fill="none" stroke={color} strokeWidth={1.5} /></svg>
}

function Tendencia({ mk }: { mk: MK }) {
  if (!mk.suficiente) return <Typography fontSize={12} color="text.secondary">Faltan meses ({mk.puntos} de {mk.minimo})</Typography>
  const [t, col] = TEND[mk.tendencia!]
  return <Tooltip title={`p = ${num(mk.p, 3)} · pendiente de Sen ${num(mk.pendiente, 2)} por mes`}><span><Etiqueta texto={t} color={col} /></span></Tooltip>
}

// ─── Tendencias ───────────────────────────────────────────────────────────────

function Tendencias() {
  const { data, isLoading } = useQuery({ queryKey: ['qms-analitica-tendencias'], queryFn: () => api.get(`${R}/tendencias`).then(r => r.data as Tendencias), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  if (!data.meses.length) return <Alert severity="info">Aún no hay no conformidades registradas.</Alert>
  const alertas = (data.carta.serie ?? []).filter(p => p.alertas.length)
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Mann-Kendall pregunta si las NC tienden a subir o bajar mes a mes más de lo que explica el azar. Un mes malo no alcanza para decir «sube». El mes en curso ({data.mes_en_curso?.mes}, {data.mes_en_curso?.nc} NC hasta hoy) no entra, porque está incompleto.
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`NC en ${data.meses.length} meses completos`} valor={num(data.total.reduce((a, b) => a + b, 0))} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Tendencia de las NC" valor={data.tendencia_total.suficiente ? TEND[data.tendencia_total.tendencia!][0] : '—'} color={data.tendencia_total.tendencia ? TEND[data.tendencia_total.tendencia][1] : '#64748B'} sub={data.tendencia_total.suficiente ? `${num(data.tendencia_total.pendiente, 2)} NC más por mes · p = ${num(data.tendencia_total.p, 3)}` : undefined} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Quejas" valor={data.quejas ? num(data.quejas.total) : '—'} color="#D97706" sub={data.quejas?.suficiente ? `Tendencia: ${TEND[data.quejas.tendencia!][0].toLowerCase()}` : undefined} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Días para cerrar una NC (mediana)" valor={num(data.cierre?.mediana_dias)} color="#7C3AED" sub={data.cierre?.suficiente ? `Tendencia: ${TEND[data.cierre.tendencia!][0].toLowerCase()}` : undefined} /></Grid>
      </Grid>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography fontWeight={800}>No conformidades por mes</Typography>
        {data.carta.suficiente ? (<>
          <Typography fontSize={12} color="text.secondary">Carta c · promedio {num(data.carta.centro, 1)} por mes en los primeros {data.carta.puntos_base} meses · {alertas.length ? `${alertas.length} meses con señal` : 'sin señales'}</Typography>
          <CartaControl serie={data.carta.serie!} centro={data.carta.centro!} lcs={data.carta.lcs} lci={data.carta.lci} unidad="" color={C} />
          {alertas.slice(-4).reverse().map(p => <Typography key={p.etiqueta} fontSize={12}>• <b>{p.etiqueta}</b> ({p.valor} NC): {p.alertas.join('; ')}</Typography>)}
        </>) : <Typography fontSize={12} color="text.secondary">Faltan meses para fijar límites ({data.carta.puntos} de {data.carta.minimo}).</Typography>}
      </Paper>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Por</TableCell><TableCell>Grupo</TableCell><TableCell align="right">NC</TableCell><TableCell>Mes a mes</TableCell><TableCell>Tendencia</TableCell><TableCell align="right">Cambio por mes</TableCell></TableRow></TableHead>
          <TableBody>
            {data.grupos.map(g => (
              <TableRow key={g.dimension + g.nivel} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell>{g.dimension}</TableCell><TableCell><b>{g.nivel}</b></TableCell><TableCell align="right">{g.total}</TableCell>
                <TableCell><Mini serie={g.serie} color={g.tendencia === 'SUBE' ? '#DC2626' : C} /></TableCell>
                <TableCell><Tendencia mk={g} /></TableCell>
                <TableCell align="right">{g.suficiente && g.tendencia !== 'ESTABLE' ? `${g.pendiente! > 0 ? '+' : ''}${num(g.pendiente, 2)}` : '—'}</TableCell>
              </TableRow>
            ))}
            {!data.grupos.length && <TableRow><TableCell colSpan={6} sx={{ fontSize: 12, color: 'text.secondary' }}>Ningún grupo tiene al menos 5 NC.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      <Typography fontSize={11} color="text.secondary" mt={1}>Si un proceso sube, el origen y la gravedad por los que se reparten sus NC suelen subir con él: empezar por el proceso.</Typography>
    </Box>
  )
}

// ─── Recurrentes ──────────────────────────────────────────────────────────────

const VEREDICTO = {
  INEFICAZ: ['Ineficaz: el problema volvió', '#DC2626'], SIN_REINCIDENCIA: ['Eficaz: no ha vuelto', '#16A34A'],
  MUY_PRONTO: ['Muy pronto para juzgar', '#64748B'], ABIERTA: ['En curso', '#2563EB'],
} as const

function Recurrentes() {
  const { data, isLoading } = useQuery({ queryKey: ['qms-analitica-recurrentes'], queryFn: () => api.get(`${R}/recurrentes`).then(r => r.data as { suficiente: boolean; ncs_analizadas: number; ncs_agrupadas: number; capas_ineficaces: number; grupos: Grupo[]; dias_para_juzgar: number }), staleTime: 5 * 60_000 })
  if (isLoading) return <Box><Typography fontSize={12} color="text.secondary">Leyendo y agrupando las no conformidades…</Typography><LinearProgress /></Box>
  if (!data) return null
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Las NC se agrupan por las palabras que las distinguen (título, descripción y causa raíz), así que dos NC redactadas distinto sobre el mismo problema quedan juntas. Sinónimos sin raíz común («precinto» y «sello») pueden quedar en grupos separados: revisar los textos de cada grupo antes de concluir.
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="NC leídas" valor={num(data.ncs_analizadas)} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Problemas que se repiten" valor={data.grupos.length} color="#D97706" sub={`${num(data.ncs_agrupadas)} NC en grupos de 3 o más`} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Cifra etiqueta="CAPA cerradas cuyo problema volvió" valor={data.capas_ineficaces} color={data.capas_ineficaces ? '#DC2626' : '#16A34A'} sub={`Una CAPA se juzga después de ${data.dias_para_juzgar} días de cerrada`} /></Grid>
      </Grid>
      {!data.suficiente && <Alert severity="info">Hacen falta más NC con texto para buscar problemas repetidos.</Alert>}
      {data.grupos.map((g, i) => (
        <Accordion key={i} disableGutters variant="outlined" sx={{ mb: 1, borderRadius: 2, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <Typography fontWeight={800} sx={{ minWidth: 44 }}>{g.cantidad} NC</Typography>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography fontSize={13} fontWeight={700}>{g.ncs[g.ncs.length - 1].titulo}</Typography>
                <Typography fontSize={11} color="text.secondary">{g.terminos.slice(0, 4).join(' · ')} · {g.procesos.join(', ')} · {g.desde} a {g.hasta}</Typography>
              </Box>
              {g.ultimos_90_dias > 0 && <Chip size="small" label={`${g.ultimos_90_dias} en 90 días`} color="warning" variant="outlined" />}
              {g.capas.map(c => <Etiqueta key={c.capa} texto={`${c.capa}: ${VEREDICTO[c.veredicto][0]}`} color={VEREDICTO[c.veredicto][1]} />)}
              {!g.capas.length && <Etiqueta texto="Sin CAPA" color="#D97706" />}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {g.capas.filter(c => c.veredicto === 'INEFICAZ').map(c => (
              <Alert key={c.capa} severity="error" sx={{ mb: 1 }}>
                <b>{c.capa}</b> ({c.titulo}) se cerró el {c.cerrada} y el problema volvió {c.reincidencias} {c.reincidencias === 1 ? 'vez' : 'veces'}: {c.reincidencias_codigos?.join(', ')}. La causa raíz no se eliminó; hay que reabrir el análisis.
              </Alert>
            ))}
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>NC</TableCell><TableCell>Título</TableCell><TableCell>Proceso</TableCell><TableCell>Fecha</TableCell><TableCell>Estado</TableCell></TableRow></TableHead>
              <TableBody>
                {g.ncs.slice().reverse().slice(0, 15).map(n => (
                  <TableRow key={n.id} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell>{n.codigo ?? n.id}</TableCell><TableCell>{n.titulo}</TableCell><TableCell>{n.proceso ?? '—'}</TableCell><TableCell>{n.fecha}</TableCell><TableCell>{n.estado.toLowerCase().replace('_', ' ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {g.ncs.length > 15 && <Typography fontSize={11} color="text.secondary" mt={1}>Se muestran las 15 más recientes de {g.ncs.length}.</Typography>}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}

// ─── Proveedores ──────────────────────────────────────────────────────────────

const ESTADO_PROV = {
  BAJO_MINIMO: ['Bajo el mínimo', '#DC2626'], EN_CAIDA: ['En caída', '#D97706'], ESTABLE: ['Estable', '#64748B'],
  MEJORA: ['Mejora', '#16A34A'], POCOS_DATOS: ['Pocas evaluaciones', '#94A3B8'],
} as const

function Proveedores() {
  const { data, isLoading } = useQuery({ queryKey: ['qms-analitica-proveedores'], queryFn: () => api.get(`${R}/proveedores`).then(r => r.data as { minimo: number; proveedores: Proveedor[] }), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Pendiente del puntaje por mes con su intervalo del 90 %. Solo se dice «en caída», y solo se estima cuándo cruzará el mínimo de {num(data.minimo)} puntos (configurado en Parámetros), si todo el intervalo está por debajo de cero. Un proveedor irregular pero sin tendencia no se señala.
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Proveedor</TableCell><TableCell>Estado</TableCell><TableCell>Evolución</TableCell><TableCell align="right">Último</TableCell><TableCell align="right">Cambio por mes (90 %)</TableCell><TableCell align="right">Llega al mínimo en</TableCell></TableRow></TableHead>
          <TableBody>
            {data.proveedores.map(p => (
              <TableRow key={p.proveedor + (p.nit ?? '')} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell><b>{p.proveedor}</b><Typography fontSize={11} color="text.secondary">{p.evaluaciones} evaluaciones · hasta {p.ultimo_periodo}</Typography></TableCell>
                <TableCell><Etiqueta texto={ESTADO_PROV[p.estado][0]} color={ESTADO_PROV[p.estado][1]} /></TableCell>
                <TableCell><Mini serie={p.serie.map(s => s.puntaje)} color={ESTADO_PROV[p.estado][1]} /></TableCell>
                <TableCell align="right">{num(p.ultimo, 1)}</TableCell>
                <TableCell align="right">{p.suficiente ? <>{p.pendiente! > 0 ? '+' : ''}{num(p.pendiente, 2)} <Typography component="span" fontSize={10} color="text.secondary">({num(p.ic90![0], 2)} a {num(p.ic90![1], 2)})</Typography></> : '—'}</TableCell>
                <TableCell align="right">{p.meses_para_minimo != null ? <b style={{ color: '#D97706' }}>~{num(p.meses_para_minimo, 0)} meses</b> : p.estado === 'BAJO_MINIMO' ? 'Ya está debajo' : '—'}</TableCell>
              </TableRow>
            ))}
            {!data.proveedores.length && <TableRow><TableCell colSpan={6} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin evaluaciones de proveedores registradas.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

export default function QMSIA() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Insights sx={{ fontSize: 28 }} />} titulo="Analítica de calidad" subtitulo="QMS · Tendencias, problemas recurrentes con la eficacia de sus CAPA y proveedores en caída" color={C} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E2E8F0' }} variant="scrollable">
          <Tab label="Tendencias" />
          <Tab label="Problemas recurrentes" />
          <Tab label="Proveedores" />
        </Tabs>
        {tab === 0 && <Tendencias />}
        {tab === 1 && <Recurrentes />}
        {tab === 2 && <Proveedores />}
      </Box>
    </Layout>
  )
}
