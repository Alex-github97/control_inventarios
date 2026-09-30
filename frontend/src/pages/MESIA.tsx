/**
 * MES · Analítica de planta
 *
 * Era la pantalla «IA» con equipos a punto de fallar, una secuenciación
 * «óptima», un scrap «óptimo» por producto, anomalías y un asistente, todo
 * escrito a mano. Ahora sale de las corridas, paradas, registros de OEE e
 * inspecciones (ver `backend/app/api/v1/endpoints/mes_analitica.py`):
 *
 *  - Control estadístico: ¿el proceso cambió?
 *  - Pérdidas de OEE: dónde se van los minutos y qué explica la caída.
 *  - Paradas: Pareto, desgaste por equipo (Weibull) y predicción a 7 días.
 *  - Desperdicio: qué operario, turno, equipo o producto desperdicia más que
 *    el resto, más allá del azar.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, Alert, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody,
  ToggleButtonGroup, ToggleButton, Tooltip, Chip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Insights } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { Encabezado, Cifra, Etiqueta } from '@/components/comun/Registro'
import { CalificacionDelModelo, CartaControl, Probabilidad, num, type CalificacionModelo, type PuntoCarta } from '@/components/analitica/Analitica'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const R = '/mes/analitica'

interface Carta {
  nombre: string; suficiente: boolean; puntos?: number; minimo?: number; motivo?: string; tipo?: string
  centro?: number; lcs?: number; lci?: number; sobredispersion?: number; puntos_base?: number; serie?: PuntoCarta[]
}
interface Perdidas {
  registros: number; planificado_min: number; perdida_disponibilidad_min: number; perdida_rendimiento_min: number
  perdida_calidad_min: number; util_min: number; disponibilidad: number; rendimiento: number; calidad: number; oee: number
}
interface WeibullEquipo {
  equipo_id: number; equipo: string; paradas: number; horas_desde_ultima: number; suficiente: boolean; fallas: number; minimo: number
  beta?: number; eta?: number; ic90_beta?: [number, number] | null; patron?: string; prob_7d?: number
}
interface Comparacion {
  factor: string; nivel: string; corridas: number; corridas_resto: number; media: number; media_resto: number
  mediana: number; mediana_resto: number; p_ajustado: number; significativo: boolean
}

// ─── SPC ──────────────────────────────────────────────────────────────────────

function TarjetaCarta({ c, unidad }: { c: Carta; unidad: string }) {
  if (!c.suficiente) return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography fontWeight={700}>{c.nombre}</Typography>
      <Typography fontSize={12} color="text.secondary">{c.motivo ?? `Faltan datos: ${c.puntos} puntos de ${c.minimo} necesarios para fijar límites.`}</Typography>
    </Paper>
  )
  const serie = c.serie ?? []
  const alertas = serie.filter(p => p.alertas.length)
  const recientes = alertas.slice(-6).reverse()
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography fontWeight={800}>{c.nombre}</Typography>
          <Typography fontSize={12} color="text.secondary">
            Carta {c.tipo} · línea central {num(c.centro, 2)}{unidad} · límites fijados con los primeros {c.puntos_base} puntos
            {c.sobredispersion && c.sobredispersion > 1.3 ? ` · la variación real entre corridas es ${num(c.sobredispersion, 1)} veces la esperada` : ''}
          </Typography>
        </Box>
        <Etiqueta texto={alertas.length ? `${alertas.length} señales de ${serie.length}` : 'Bajo control'} color={alertas.length ? '#DC2626' : '#16A34A'} />
      </Box>
      <CartaControl serie={serie} centro={c.centro!} lcs={c.lcs} lci={c.lci} unidad={unidad} color={C} />
      {serie.length > 120 && <Typography fontSize={11} color="text.secondary">Se muestran los últimos 120 de {serie.length} puntos; las señales cuentan todos.</Typography>}
      {recientes.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography fontSize={12} fontWeight={700} color="text.secondary">Señales más recientes</Typography>
          {recientes.map((p, i) => <Typography key={i} fontSize={12}>• <b>{p.etiqueta}</b> ({num(p.valor, 2)}{unidad}): {p.alertas.join('; ')}</Typography>)}
        </Box>
      )}
    </Paper>
  )
}

function SPC() {
  const [vista, setVista] = useState<'desperdicio' | 'oee' | 'inspeccion'>('desperdicio')
  const { data, isLoading } = useQuery({ queryKey: ['mes-analitica-spc'], queryFn: () => api.get(`${R}/spc`).then(r => r.data as { desperdicio: Carta[]; oee: Carta[]; inspeccion: Carta }), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const cartas = vista === 'inspeccion' ? [data.inspeccion] : data[vista]
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Una carta de control no dice si el proceso es bueno: dice si <b>cambió</b>. Un punto rojo significa que ahí pasó algo distinto de la variación de siempre, y eso es lo que vale la pena investigar.
      </Typography>
      <ToggleButtonGroup size="small" exclusive value={vista} onChange={(_, v) => v && setVista(v)} sx={{ mb: 2 }}>
        <ToggleButton value="desperdicio">Desperdicio por corrida</ToggleButton>
        <ToggleButton value="oee">OEE por turno</ToggleButton>
        <ToggleButton value="inspeccion">Defectos en inspección</ToggleButton>
      </ToggleButtonGroup>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {cartas.length ? cartas.map(c => <TarjetaCarta key={c.nombre} c={c} unidad={vista === 'oee' ? '' : ' %'} />) : <Alert severity="info">Sin registros para esta carta.</Alert>}
      </Box>
    </Box>
  )
}

// ─── Pérdidas ─────────────────────────────────────────────────────────────────

const FACTOR = { disponibilidad: ['Disponibilidad', '#DC2626'], rendimiento: ['Rendimiento', '#D97706'], calidad: ['Calidad', '#7C3AED'] } as const

function BarraPerdidas({ p }: { p: Perdidas }) {
  const partes = [
    ['Tiempo útil', p.util_min, '#16A34A'], ['Paradas', p.perdida_disponibilidad_min, '#DC2626'],
    ['Velocidad', p.perdida_rendimiento_min, '#D97706'], ['Calidad', p.perdida_calidad_min, '#7C3AED'],
  ] as const
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 14, borderRadius: 1, overflow: 'hidden' }}>
        {partes.map(([t, v, col]) => <Tooltip key={t} title={`${t}: ${num(v)} min`}><Box sx={{ width: `${(v / p.planificado_min) * 100}%`, bgcolor: col }} /></Tooltip>)}
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
        {partes.map(([t, v, col]) => <Typography key={t} fontSize={11} color="text.secondary"><span style={{ color: col }}>■</span> {t} {num(v / 60)} h</Typography>)}
      </Box>
    </Box>
  )
}

function PerdidasOEE() {
  const [dias, setDias] = useState(30)
  const { data, isLoading } = useQuery({ queryKey: ['mes-analitica-perdidas', dias], queryFn: () => api.get(`${R}/perdidas`, { params: { dias } }).then(r => r.data as { lineas: { linea: string; actual: Perdidas | null; anterior: Perdidas | null; cambio_oee: number | null; explicacion: Record<string, number> | null }[]; equipos: (Perdidas & { nombre: string })[]; turnos: (Perdidas & { nombre: string })[] }), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const tabla = (filas: (Perdidas & { nombre: string })[], titulo: string) => (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
      <Table size="small">
        <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
          <TableCell>{titulo}</TableCell><TableCell align="right">OEE</TableCell><TableCell align="right">Disponibilidad</TableCell><TableCell align="right">Rendimiento</TableCell><TableCell align="right">Calidad</TableCell><TableCell align="right">Horas perdidas</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {filas.map(f => (
            <TableRow key={f.nombre} sx={{ '& td': { fontSize: 12 } }}>
              <TableCell><b>{f.nombre}</b></TableCell><TableCell align="right"><b>{num(f.oee, 1)} %</b></TableCell>
              <TableCell align="right">{num(f.disponibilidad, 1)} %</TableCell><TableCell align="right">{num(f.rendimiento, 1)} %</TableCell><TableCell align="right">{num(f.calidad, 1)} %</TableCell>
              <TableCell align="right">{num((f.planificado_min - f.util_min) / 60)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography fontSize={13} color="text.secondary">El tiempo planificado se reparte en lo que se aprovechó y lo que se perdió por paradas, por velocidad y por calidad. Se compara con el periodo anterior de igual duración.</Typography>
        <ToggleButtonGroup size="small" exclusive value={dias} onChange={(_, v) => v && setDias(v)}>
          {[7, 30, 90].map(d => <ToggleButton key={d} value={d}>{d} días</ToggleButton>)}
        </ToggleButtonGroup>
      </Box>
      {!data.lineas.length && <Alert severity="info">Sin registros de OEE en el periodo.</Alert>}
      <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
        {data.lineas.map(l => l.actual && (
          <Paper key={l.linea} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography fontWeight={800}>{l.linea}</Typography>
                <Typography fontSize={28} fontWeight={800} color={C}>{num(l.actual.oee, 1)} %</Typography>
                {l.cambio_oee != null && <Typography fontSize={12} color={l.cambio_oee < 0 ? '#DC2626' : '#16A34A'}>{l.cambio_oee > 0 ? '+' : ''}{num(l.cambio_oee, 1)} puntos frente al periodo anterior</Typography>}
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}><BarraPerdidas p={l.actual} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                {l.explicacion ? (
                  <Box>
                    <Typography fontSize={12} fontWeight={700} color="text.secondary">Qué explica el cambio</Typography>
                    {Object.entries(l.explicacion).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <Typography key={k} fontSize={12}><span style={{ color: FACTOR[k as keyof typeof FACTOR][1] }}>■</span> {FACTOR[k as keyof typeof FACTOR][0]}: <b>{v} %</b></Typography>
                    ))}
                  </Box>
                ) : <Typography fontSize={12} color="text.secondary">{l.anterior ? 'Sin cambio relevante (menos de 2 puntos).' : 'Sin periodo anterior para comparar.'}</Typography>}
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>{tabla(data.equipos, 'Equipo')}</Grid>
        <Grid size={{ xs: 12, md: 5 }}>{tabla(data.turnos, 'Turno')}</Grid>
      </Grid>
    </Box>
  )
}

// ─── Paradas ──────────────────────────────────────────────────────────────────

const PATRON: Record<string, [string, string]> = { DESGASTE: ['Se desgasta', '#DC2626'], ALEATORIA: ['Aleatoria', '#2563EB'], INFANTIL: ['Tras intervenir', '#D97706'] }

function Paradas() {
  const { data, isLoading } = useQuery({ queryKey: ['mes-analitica-paradas'], queryFn: () => api.get(`${R}/paradas`).then(r => r.data as { pareto: { causa: string; minutos: number; eventos: number; tipos: string[]; pct: number; acumulado: number }[]; minutos_totales: number; eventos: number; weibull: WeibullEquipo[]; prediccion: CalificacionModelo & { horizonte_dias: number; equipos: { equipo_id: number; equipo: string; prob_7d: number; paradas_30d: number; horas_desde_parada: number | null; fuera_de_experiencia?: string[] }[] } }), staleTime: 10 * 60_000 })
  if (isLoading) return <Box><Typography fontSize={12} color="text.secondary">Ajustando los modelos de paradas…</Typography><LinearProgress /></Box>
  if (!data) return null
  const m = data.prediccion
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography fontWeight={800} mb={1}>¿Qué causas pesan? <Typography component="span" fontSize={12} color="text.secondary">({num(data.eventos)} paradas, {num(data.minutos_totales / 60)} h en 180 días)</Typography></Typography>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Causa</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Eventos</TableCell><TableCell align="right">Horas</TableCell><TableCell sx={{ width: '35%' }}>Peso</TableCell><TableCell align="right">Acumulado</TableCell></TableRow></TableHead>
            <TableBody>
              {data.pareto.slice(0, 12).map(p => (
                <TableRow key={p.causa} sx={{ '& td': { fontSize: 12 } }}>
                  <TableCell><b>{p.causa}</b></TableCell>
                  <TableCell>{p.tipos.map(t => <Chip key={t} size="small" label={t.replace('_', ' ').toLowerCase()} sx={{ mr: 0.5, fontSize: 10 }} />)}</TableCell>
                  <TableCell align="right">{p.eventos}</TableCell><TableCell align="right">{num(p.minutos / 60, 1)}</TableCell>
                  <TableCell><Box sx={{ height: 8, borderRadius: 1, bgcolor: '#E2E8F0' }}><Box sx={{ height: 8, borderRadius: 1, bgcolor: p.acumulado - p.pct < 80 ? C : '#94A3B8', width: `${p.pct}%` }} /></Box></TableCell>
                  <TableCell align="right">{num(p.acumulado, 1)} %</TableCell>
                </TableRow>
              ))}
              {!data.pareto.length && <TableRow><TableCell colSpan={6} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin paradas registradas en el periodo.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box>
        <Typography fontWeight={800}>¿Qué equipo se desgasta?</Typography>
        <Typography fontSize={12} color="text.secondary" mb={1}>Weibull del tiempo entre paradas no planeadas de cada equipo. «Se desgasta» quiere decir que cuanto más tiempo lleva sin parar, más cerca está la próxima: ahí sirve el mantenimiento preventivo.</Typography>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Equipo</TableCell><TableCell align="right">Paradas no planeadas</TableCell><TableCell>Patrón</TableCell><TableCell align="right">β (90 %)</TableCell><TableCell align="right">Horas típicas entre paradas</TableCell><TableCell align="right">Horas desde la última</TableCell><TableCell align="right">Parada en 7 días</TableCell></TableRow></TableHead>
            <TableBody>
              {data.weibull.map(w => (
                <TableRow key={w.equipo_id} sx={{ '& td': { fontSize: 12 } }}>
                  <TableCell><b>{w.equipo}</b></TableCell><TableCell align="right">{w.paradas}</TableCell>
                  {w.suficiente ? (<>
                    <TableCell><Etiqueta texto={PATRON[w.patron!][0]} color={PATRON[w.patron!][1]} />{w.fallas < 10 && <Tooltip title="Con menos de 10 intervalos el patrón puede salir por azar"><Typography component="span" fontSize={10} color="text.secondary"> muestra pequeña</Typography></Tooltip>}</TableCell>
                    <TableCell align="right">{num(w.beta, 2)} <Typography component="span" fontSize={10} color="text.secondary">({w.ic90_beta ? `${num(w.ic90_beta[0], 1)}–${num(w.ic90_beta[1], 1)}` : '—'})</Typography></TableCell>
                    <TableCell align="right">{num(w.eta)}</TableCell><TableCell align="right">{num(w.horas_desde_ultima)}</TableCell>
                    <TableCell align="right"><Probabilidad p={w.prob_7d ?? 0} /></TableCell>
                  </>) : (
                    <TableCell colSpan={5} sx={{ color: 'text.secondary' }}>Faltan datos: {w.fallas} intervalos completos de {w.minimo} necesarios.</TableCell>
                  )}
                </TableRow>
              ))}
              {!data.weibull.length && <TableRow><TableCell colSpan={7} sx={{ fontSize: 12, color: 'text.secondary' }}>Ningún equipo tiene paradas no planeadas registradas.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box>
        <Typography fontWeight={800}>Predicción con aprendizaje automático</Typography>
        <Typography fontSize={12} color="text.secondary" mb={1}>Una foto diaria de cada equipo (paradas recientes, producción, desperdicio) y si tuvo una parada no planeada en los {m.horizonte_dias} días siguientes. Se califica con el periodo más reciente, que no vio al entrenar.</Typography>
        <CalificacionDelModelo m={m} horizonte={m.horizonte_dias} color={C} evento="parada" />
        {m.suficiente && (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', opacity: m.util ? 1 : 0.6 }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Equipo</TableCell><TableCell align="right">Parada en {m.horizonte_dias} días</TableCell><TableCell align="right">Paradas en 30 días</TableCell><TableCell align="right">Horas desde la última</TableCell></TableRow></TableHead>
              <TableBody>
                {m.equipos.map(e => (
                  <TableRow key={e.equipo_id} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell><b>{e.equipo}</b></TableCell><TableCell align="right"><Probabilidad p={e.prob_7d} fuera={e.fuera_de_experiencia} /></TableCell>
                    <TableCell align="right">{e.paradas_30d}</TableCell><TableCell align="right">{num(e.horas_desde_parada)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>
    </Box>
  )
}

// ─── Desperdicio ──────────────────────────────────────────────────────────────

function Desperdicio() {
  const { data, isLoading } = useQuery({ queryKey: ['mes-analitica-desperdicio'], queryFn: () => api.get(`${R}/desperdicio`).then(r => r.data as { corridas: number; tasa_global: number | null; comparaciones: Comparacion[]; pareto_causas: { causa: string; cantidad: number; costo: number; registros: number; pct_costo: number | null }[] }), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const hallazgos = data.comparaciones.filter(c => c.significativo)
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Cada operario, turno, equipo, producto y línea se compara contra el resto, corrida por corrida. Solo se señala una diferencia si es demasiado grande para ser azar, después de corregir por hacer muchas comparaciones a la vez.
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Corridas analizadas (180 días)" valor={num(data.corridas)} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Desperdicio global" valor={`${num(data.tasa_global, 2)} %`} color="#D97706" /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Cifra etiqueta="Diferencias que no son azar" valor={hallazgos.length} color={hallazgos.length ? '#DC2626' : '#16A34A'} sub={`de ${data.comparaciones.length} comparaciones`} /></Grid>
      </Grid>
      {hallazgos.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
          {hallazgos.map(h => (
            <Alert key={h.factor + h.nivel} severity={h.media > h.media_resto ? 'warning' : 'success'}>
              <b>{h.factor} {h.nivel}</b>: {num(h.media, 2)} % de desperdicio frente a {num(h.media_resto, 2)} % del resto, en {h.corridas} corridas{h.media > h.media_resto ? '' : ' (mejor que el resto: vale la pena ver qué hace distinto)'}.
            </Alert>
          ))}
          <Typography fontSize={11} color="text.secondary">Una diferencia no prueba la causa: si un operario trabaja siempre con el mismo producto o en el mismo turno, los dos aparecen juntos. Revisar ambos antes de concluir.</Typography>
        </Box>
      )}
      {!hallazgos.length && data.comparaciones.length > 0 && <Alert severity="success" sx={{ mb: 2 }}>Ninguna diferencia entre operarios, turnos, equipos o productos es mayor que lo que explica el azar.</Alert>}
      {!data.comparaciones.length && <Alert severity="info" sx={{ mb: 2 }}>Hacen falta al menos 8 corridas por grupo para comparar.</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Grupo</TableCell><TableCell align="right">Corridas</TableCell><TableCell align="right">Desperdicio</TableCell><TableCell align="right">Resto</TableCell><TableCell align="right">p ajustado</TableCell></TableRow></TableHead>
              <TableBody>
                {data.comparaciones.map(c => (
                  <TableRow key={c.factor + c.nivel} sx={{ '& td': { fontSize: 12 }, bgcolor: c.significativo ? (c.media > c.media_resto ? '#FEF3C7' : '#DCFCE7') : undefined }}>
                    <TableCell>{c.factor}: <b>{c.nivel}</b></TableCell><TableCell align="right">{c.corridas}</TableCell>
                    <TableCell align="right">{num(c.media, 2)} %</TableCell><TableCell align="right">{num(c.media_resto, 2)} %</TableCell>
                    <TableCell align="right">{c.p_ajustado < 0.001 ? '< 0,001' : num(c.p_ajustado, 3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Causa registrada</TableCell><TableCell align="right">Unidades</TableCell><TableCell align="right">Costo</TableCell><TableCell align="right">%</TableCell></TableRow></TableHead>
              <TableBody>
                {data.pareto_causas.map(p => (
                  <TableRow key={p.causa} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell>{p.causa}</TableCell><TableCell align="right">{num(p.cantidad)}</TableCell>
                    <TableCell align="right">${num(p.costo)}</TableCell><TableCell align="right">{num(p.pct_costo, 1)}</TableCell>
                  </TableRow>
                ))}
                {!data.pareto_causas.length && <TableRow><TableCell colSpan={4} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin desperdicio registrado con causa.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default function MESIA() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Insights sx={{ fontSize: 28 }} />} titulo="Analítica de planta" subtitulo="MES · Control estadístico, pérdidas de OEE, paradas y desperdicio, con los datos de la planta" color={C} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E2E8F0' }} variant="scrollable">
          <Tab label="Control estadístico" />
          <Tab label="Pérdidas de OEE" />
          <Tab label="Paradas" />
          <Tab label="Qué explica el desperdicio" />
        </Tabs>
        {tab === 0 && <SPC />}
        {tab === 1 && <PerdidasOEE />}
        {tab === 2 && <Paradas />}
        {tab === 3 && <Desperdicio />}
      </Box>
    </Layout>
  )
}
