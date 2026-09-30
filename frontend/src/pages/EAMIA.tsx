/**
 * EAM · Analítica de confiabilidad
 *
 * Era la pantalla «IA» con probabilidades de falla, sensores, ventanas de
 * mantenimiento, repuestos críticos y un asistente, todo escrito a mano. Ahora
 * cada cifra sale de un modelo ajustado con las órdenes, los tanqueos y los
 * odómetros de la empresa (ver `backend/app/api/v1/endpoints/eam_analitica.py`):
 *
 *  - Weibull por modo de falla: cuánto dura cada pieza, si se desgasta, y la
 *    edad a la que conviene cambiarla.
 *  - Crow-AMSAA por equipo: si el equipo se está deteriorando.
 *  - Aprendizaje automático: probabilidad de falla en 30 días, con su
 *    calificación contra meses que el modelo no vio.
 *  - Anomalías: costos, duraciones y rendimientos fuera de lo normal.
 *
 * Donde los datos no alcanzan, la pantalla lo dice en vez de estimar.
 */
import { useState } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, Chip, Alert, LinearProgress, Table, TableHead, TableRow,
  TableCell, TableBody, TextField, Button, Tooltip, ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Insights } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { Encabezado, Cifra, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const R = '/eam/analitica'
const num = (v?: number | null, d = 0) => v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: d })
const pesos = (v?: number | null) => v == null ? '—' : `$${num(v)}`

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Riesgo { activo_id: number; codigo: string; nombre: string; edad: number; edad_minima: boolean; prob_30d: number; confiabilidad_actual: number }
interface Reemplazo { edad: number; ahorro_pct: number; prob_fallar_antes: number; costo_por_unidad: number; costo_por_unidad_correctivo: number }
interface GrupoWeibull {
  grupo: string; es_modo: boolean; unidad: 'km' | 'días'; equipos: number; fallas: number; censurados: number; fallas_registradas: number
  suficiente: boolean; minimo: number; motivo?: string
  beta?: number; eta?: number; ic90_beta?: [number, number] | null; ic90_eta?: [number, number] | null
  vida_media?: number; b10?: number; p_valor_vs_exponencial?: number; patron?: 'DESGASTE' | 'ALEATORIA' | 'INFANTIL'
  costo_falla_mediano?: number | null; costo_preventivo_mediano?: number | null
  reemplazo?: Reemplazo | null; riesgo: Riesgo[]
}
interface Equipo { activo_id: number; codigo: string; nombre: string; marca?: string; fallas: number; beta: number; tendencia: 'DETERIORO' | 'ESTABLE' | 'MEJORA'; p_valor_tendencia: number; mtbf_actual: number | null; mtbf_promedio: number; fallas_esperadas_90d: number | null; dias_observados: number }
interface Prediccion {
  horizonte_dias: number; filas: number; positivos: number; suficiente: boolean; util?: boolean; motivo?: string
  modelo?: string; auc?: number; habilidad?: number; brier?: number; brier_referencia?: number; tasa_historica?: number
  corte_validacion?: string; filas_prueba?: number; positivos_prueba?: number
  comparacion?: Record<string, { auc: number; habilidad: number }>
  calibracion?: { desde: number; hasta: number; observaciones: number; predicho: number; real: number }[]
  importancia?: { variable: string; etiqueta: string; aporte: number }[]
  equipos: { activo_id: number; codigo: string; nombre: string; prob_30d: number; dias_desde_falla: number | null; fallas_365d: number; km_30d: number | null }[]
}
interface Anomalia { clase: 'COSTO' | 'DURACION' | 'RENDIMIENTO'; referencia: string; activo: string; fecha: string; detalle: string; valor: number; normal: number; z: number }

const PATRON: Record<string, { texto: string; color: string; lectura: string }> = {
  DESGASTE: { texto: 'Desgaste', color: '#DC2626', lectura: 'El riesgo crece con el uso. El mantenimiento preventivo por edad sí sirve aquí.' },
  ALEATORIA: { texto: 'Aleatoria', color: '#2563EB', lectura: 'El riesgo no depende de la edad. Cambiar la pieza antes no evita fallas: sirve la inspección o el monitoreo de condición.' },
  INFANTIL: { texto: 'Mortalidad infantil', color: '#D97706', lectura: 'Falla más cuando es nueva: revisar instalación, calidad del repuesto o del montaje.' },
}
const riesgoColor = (p: number) => p >= 50 ? '#DC2626' : p >= 25 ? '#D97706' : '#16A34A'

// ─── Curva de confiabilidad ───────────────────────────────────────────────────

function Curva({ beta, eta, b10, reemplazo, unidad }: { beta: number; eta: number; b10?: number; reemplazo?: number; unidad: string }) {
  const w = 320, h = 120, max = eta * 2.2
  const x = (t: number) => 28 + (t / max) * (w - 36)
  const y = (r: number) => 8 + (1 - r) * (h - 28)
  const puntos = Array.from({ length: 60 }, (_, i) => { const t = (i / 59) * max; return `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(Math.exp(-((t / eta) ** beta))).toFixed(1)}` }).join(' ')
  const marca = (t: number | undefined, color: string, txt: string) => t && t < max ? (
    <g><line x1={x(t)} x2={x(t)} y1={8} y2={h - 20} stroke={color} strokeDasharray="3 3" /><text x={x(t) + 3} y={18} fontSize={9} fill={color}>{txt}</text></g>) : null
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Curva de confiabilidad">
      <line x1={28} x2={w - 8} y1={h - 20} y2={h - 20} stroke="#CBD5E1" />
      <line x1={28} x2={28} y1={8} y2={h - 20} stroke="#CBD5E1" />
      <text x={2} y={12} fontSize={8} fill="#64748B">100%</text><text x={8} y={h - 20} fontSize={8} fill="#64748B">0%</text>
      <text x={w - 8} y={h - 6} fontSize={8} fill="#64748B" textAnchor="end">{num(max)} {unidad}</text>
      <path d={puntos} fill="none" stroke={C} strokeWidth={2} />
      {marca(b10, '#D97706', 'B10')}
      {marca(reemplazo, '#16A34A', 'Cambio')}
    </svg>
  )
}

// ─── Weibull ───────────────────────────────────────────────────────────────────

function TarjetaWeibull({ g }: { g: GrupoWeibull }) {
  const [cp, setCp] = useState(String(g.costo_preventivo_mediano ?? ''))
  const [cf, setCf] = useState(String(g.costo_falla_mediano ?? ''))
  const [propio, setPropio] = useState<{ recomendado: boolean; motivo?: string } & Partial<Reemplazo> | null>(null)
  const [error, setError] = useState('')
  const u = g.unidad
  const reemplazo = propio ? (propio.recomendado ? propio as Reemplazo : null) : g.reemplazo

  if (!g.suficiente) return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography fontWeight={700}>{g.grupo}</Typography>
      <Typography fontSize={12} color="text.secondary">
        {g.motivo ?? `Faltan datos: ${g.fallas_registradas} falla${g.fallas_registradas === 1 ? '' : 's'} registrada${g.fallas_registradas === 1 ? '' : 's'}, que dejan ${g.fallas} vida${g.fallas === 1 ? '' : 's'} completa${g.fallas === 1 ? '' : 's'} medible${g.fallas === 1 ? '' : 's'}; hacen falta ${g.minimo}. La primera falla de cada equipo no cuenta como vida completa: no se sabe desde cuándo tenía la pieza.`}
      </Typography>
    </Paper>
  )
  const p = PATRON[g.patron!]
  const recalcular = async () => {
    setError('')
    try {
      const r = await api.get(`${R}/reemplazo`, { params: { beta: g.beta, eta: g.eta, costo_preventivo: Number(cp), costo_falla: Number(cf) } })
      setPropio(r.data)
    } catch (e) { setError(errorApi(e, 'Revisa los costos')) }
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography fontWeight={800}>{g.grupo}</Typography>
          <Typography fontSize={12} color="text.secondary">
            {g.fallas} fallas y {g.censurados} vidas sin fallar todavía, en {g.equipos} equipos · vida medida en {u}
          </Typography>
        </Box>
        <Etiqueta texto={p.texto} color={p.color} />
      </Box>
      {!g.es_modo && <Alert severity="warning" sx={{ mt: 1, py: 0 }}>Estas fallas no tienen modo registrado y mezclan piezas distintas: el ajuste es orientativo. Registrar el modo en la orden lo corrige.</Alert>}
      <Typography fontSize={13} sx={{ mt: 1 }}>{p.lectura}</Typography>
      <Grid container spacing={1.5} sx={{ mt: 1 }}>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title={`Intervalo del 90 %: ${g.ic90_beta?.join(' a ') ?? '—'}`}><Box><Cifra etiqueta="Forma β" valor={num(g.beta, 2)} color={p.color} sub={g.ic90_beta ? `${num(g.ic90_beta[0], 2)} – ${num(g.ic90_beta[1], 2)}` : undefined} /></Box></Tooltip></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Vida media (${u})`} valor={num(g.vida_media)} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title="A esta vida ya ha fallado el 10 % de las piezas"><Box><Cifra etiqueta={`B10 (${u})`} valor={num(g.b10)} color="#D97706" /></Box></Tooltip></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title="Probabilidad de que una tasa constante explique igual de bien los datos"><Box><Cifra etiqueta="p vs. exponencial" valor={g.p_valor_vs_exponencial != null && g.p_valor_vs_exponencial < 0.001 ? '< 0,001' : num(g.p_valor_vs_exponencial, 3)} color="#64748B" /></Box></Tooltip></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography fontSize={12} fontWeight={700} color="text.secondary">Probabilidad de seguir funcionando según la vida</Typography>
          <Curva beta={g.beta!} eta={g.eta!} b10={g.b10} reemplazo={reemplazo?.edad} unidad={u} />
          <Typography fontSize={12} fontWeight={700} color="text.secondary" sx={{ mt: 1 }}>Reemplazo preventivo</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField size="small" type="number" label="Costo de cambiarla antes" value={cp} onChange={e => setCp(e.target.value)} helperText="Por defecto: un preventivo típico" />
            <TextField size="small" type="number" label="Costo de la falla" value={cf} onChange={e => setCf(e.target.value)} helperText="Mediana de estas fallas" />
          </Box>
          <Button size="small" onClick={recalcular} disabled={!Number(cp) || !Number(cf)}>Recalcular con estos costos</Button>
          {error && <Typography fontSize={12} color="error">{error}</Typography>}
          {reemplazo ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Cambiar a los <b>{num(reemplazo.edad)} {u}</b> cuesta {num(reemplazo.ahorro_pct, 1)} % menos por {u === 'km' ? 'km' : 'día'} que esperar la falla.
              Con esa regla, el {num(reemplazo.prob_fallar_antes, 1)} % de las piezas fallaría antes del cambio.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>{propio?.motivo ?? (g.beta! <= 1 ? 'Sin desgaste, cambiar la pieza antes no reduce fallas.' : 'Con estos costos sale más barato usar la pieza hasta que falle.')}</Alert>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography fontSize={12} fontWeight={700} color="text.secondary">Equipos con mayor probabilidad de esta falla en 30 días</Typography>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
              <TableCell>Equipo</TableCell><TableCell align="right">Vida actual ({u})</TableCell><TableCell align="right">Sigue funcionando</TableCell><TableCell align="right">Falla en 30 días</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {g.riesgo.slice(0, 8).map(r => (
                <TableRow key={r.activo_id} sx={{ '& td': { fontSize: 12 } }}>
                  <TableCell><b>{r.codigo}</b> <Typography component="span" fontSize={11} color="text.secondary">{r.nombre}</Typography></TableCell>
                  <TableCell align="right">{num(r.edad)}{r.edad_minima && <Tooltip title="Sin falla registrada de este modo: la pieza tiene al menos esta vida"><span> +</span></Tooltip>}</TableCell>
                  <TableCell align="right">{num(r.confiabilidad_actual, 1)} %</TableCell>
                  <TableCell align="right"><b style={{ color: riesgoColor(r.prob_30d) }}>{num(r.prob_30d, 1)} %</b></TableCell>
                </TableRow>
              ))}
              {!g.riesgo.length && <TableRow><TableCell colSpan={4} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin equipos con ritmo de uso conocido.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Grid>
      </Grid>
    </Paper>
  )
}

function Weibull() {
  const { data, isLoading } = useQuery({ queryKey: ['eam-analitica-weibull'], queryFn: () => api.get(`${R}/weibull`).then(r => r.data as { grupos: GrupoWeibull[]; fallas_totales: number; fallas_con_modo: number }), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const sinModo = data.fallas_totales - data.fallas_con_modo
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography fontSize={13} color="text.secondary">
        Un ajuste de Weibull por cada modo de falla. Los equipos que todavía no han fallado también cuentan: dicen que la pieza dura al menos lo que llevan.
      </Typography>
      {sinModo > 0 && <Alert severity="info">{sinModo} de {data.fallas_totales} fallas no tienen modo registrado en la orden. Registrarlo es lo que permite separar un alternador de unas pastillas de freno.</Alert>}
      {!data.grupos.length && <Alert severity="info">Aún no hay órdenes marcadas como falla.</Alert>}
      {data.grupos.map(g => <TarjetaWeibull key={g.grupo} g={g} />)}
    </Box>
  )
}

// ─── Tendencia ─────────────────────────────────────────────────────────────────

const TENDENCIA = { DETERIORO: ['Se deteriora', '#DC2626'], ESTABLE: ['Estable', '#64748B'], MEJORA: ['Mejora', '#16A34A'] } as const

function Tendencia() {
  const { data, isLoading } = useQuery({ queryKey: ['eam-analitica-tendencia'], queryFn: () => api.get(`${R}/tendencia`).then(r => r.data as { equipos: Equipo[]; sin_datos_suficientes: number; minimo_fallas: number }), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const det = data.equipos.filter(e => e.tendencia === 'DETERIORO').length
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Modelo Crow-AMSAA sobre todas las fallas de cada equipo. «Se deteriora» significa que sus fallas se están acercando entre sí con significancia estadística (p &lt; 0,10); no basta con una mala racha.
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Equipos analizados" valor={data.equipos.length} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Se deterioran" valor={det} color="#DC2626" /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Cifra etiqueta="Sin fallas suficientes" valor={data.sin_datos_suficientes} color="#64748B" sub={`Hacen falta al menos ${data.minimo_fallas} fallas por equipo`} /></Grid>
      </Grid>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
            <TableCell>Equipo</TableCell><TableCell align="right">Fallas</TableCell><TableCell>Tendencia</TableCell><TableCell align="right">β</TableCell><TableCell align="right">p</TableCell>
            <TableCell align="right">Días entre fallas hoy</TableCell><TableCell align="right">Promedio histórico</TableCell><TableCell align="right">Fallas esperadas 90 días</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.equipos.map(e => (
              <TableRow key={e.activo_id} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell><b>{e.codigo}</b> <Typography component="span" fontSize={11} color="text.secondary">{e.nombre}</Typography></TableCell>
                <TableCell align="right">{e.fallas}</TableCell>
                <TableCell><Etiqueta texto={TENDENCIA[e.tendencia][0]} color={TENDENCIA[e.tendencia][1]} /></TableCell>
                <TableCell align="right">{num(e.beta, 2)}</TableCell>
                <TableCell align="right">{num(e.p_valor_tendencia, 3)}</TableCell>
                <TableCell align="right">{num(e.mtbf_actual, 1)}</TableCell>
                <TableCell align="right">{num(e.mtbf_promedio, 1)}</TableCell>
                <TableCell align="right">{num(e.fallas_esperadas_90d, 1)}</TableCell>
              </TableRow>
            ))}
            {!data.equipos.length && <TableRow><TableCell colSpan={8} sx={{ fontSize: 12, color: 'text.secondary' }}>Ningún equipo tiene aún {data.minimo_fallas} fallas registradas.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

// ─── Predicción ────────────────────────────────────────────────────────────────

function Prediccion() {
  const { data, isLoading } = useQuery({ queryKey: ['eam-analitica-prediccion'], queryFn: () => api.get(`${R}/prediccion`).then(r => r.data as Prediccion), staleTime: 10 * 60_000 })
  if (isLoading) return <Box><Typography fontSize={12} color="text.secondary">Entrenando y validando el modelo con la historia de la flota…</Typography><LinearProgress /></Box>
  if (!data) return null
  if (!data.suficiente) return (
    <Alert severity="info">
      Todavía no hay historia suficiente para entrenar un modelo confiable. {data.motivo} Con {data.filas} observaciones y {data.positivos} fallas, cualquier probabilidad sería inventada.
    </Alert>
  )
  const maxImp = Math.max(...(data.importancia ?? []).map(i => i.aporte), 1e-9)
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Se toma una foto de cada equipo cada 14 días y se registra si falló en los {data.horizonte_dias} días siguientes. El modelo aprende de las fotos anteriores al {data.corte_validacion} y se califica con las posteriores, que no vio al entrenar.
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Modelo elegido" valor={<span style={{ fontSize: 16 }}>{data.modelo}</span>} color={C} sub={Object.entries(data.comparacion ?? {}).map(([k, v]) => `${k}: AUC ${num(v.auc, 2)}`).join(' · ')} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title="0,5 es adivinar; 1 es perfecto. Mide si ordena bien a los equipos por riesgo."><Box><Cifra etiqueta="AUC en meses no vistos" valor={num(data.auc, 2)} color={C} /></Box></Tooltip></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title="Cuánto mejora el error frente a decirle a todos la tasa histórica de falla."><Box><Cifra etiqueta="Mejora sobre la tasa histórica" valor={`${num((data.habilidad ?? 0) * 100, 1)} %`} color={data.util ? '#16A34A' : '#DC2626'} sub={`Tasa histórica: ${num(data.tasa_historica, 1)} % en ${data.horizonte_dias} días`} /></Box></Tooltip></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Observaciones" valor={num(data.filas)} color="#64748B" sub={`${num(data.positivos)} con falla · ${num(data.filas_prueba)} de prueba`} /></Grid>
      </Grid>
      {!data.util && <Alert severity="warning" sx={{ mb: 2 }}>El modelo no le gana con claridad a la tasa histórica. Sus probabilidades no deben usarse para decidir; se muestran solo como referencia. Con más historia o registrando el modo de falla puede mejorar.</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1}>Qué pesa en la predicción</Typography>
            {(data.importancia ?? []).map(i => (
              <Box key={i.variable} sx={{ mb: 0.75 }}>
                <Typography fontSize={12}>{i.etiqueta}</Typography>
                <Box sx={{ height: 6, borderRadius: 1, bgcolor: '#E2E8F0' }}><Box sx={{ height: 6, borderRadius: 1, bgcolor: C, width: `${(i.aporte / maxImp) * 100}%` }} /></Box>
              </Box>
            ))}
            <Typography fontSize={11} color="text.secondary" mt={1}>Cuánto empeora el modelo en los meses de prueba si se desordena cada variable.</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1}>¿Se cumple lo que predice?</Typography>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Tramo</TableCell><TableCell align="right">Casos</TableCell><TableCell align="right">Predijo</TableCell><TableCell align="right">Fallaron</TableCell></TableRow></TableHead>
              <TableBody>
                {(data.calibracion ?? []).map(c => (
                  <TableRow key={c.desde} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell>{num(c.desde, 0)}–{num(c.hasta, 0)} %</TableCell><TableCell align="right">{c.observaciones}</TableCell>
                    <TableCell align="right">{num(c.predicho, 1)} %</TableCell><TableCell align="right">{num(c.real, 1)} %</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', opacity: data.util ? 1 : 0.6 }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
                <TableCell>Equipo</TableCell><TableCell align="right">Falla en {data.horizonte_dias} días</TableCell><TableCell align="right">Días desde la última falla</TableCell><TableCell align="right">Fallas en el año</TableCell><TableCell align="right">Km en 30 días</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {data.equipos.slice(0, 25).map(e => (
                  <TableRow key={e.activo_id} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell><b>{e.codigo}</b> <Typography component="span" fontSize={11} color="text.secondary">{e.nombre}</Typography></TableCell>
                    <TableCell align="right"><b style={{ color: riesgoColor(e.prob_30d) }}>{num(e.prob_30d, 1)} %</b></TableCell>
                    <TableCell align="right">{num(e.dias_desde_falla)}</TableCell>
                    <TableCell align="right">{e.fallas_365d}</TableCell>
                    <TableCell align="right">{num(e.km_30d)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── Anomalías ─────────────────────────────────────────────────────────────────

const CLASE = { COSTO: 'Costo', DURACION: 'Duración', RENDIMIENTO: 'Rendimiento' } as const

function Anomalias() {
  const [clase, setClase] = useState<string>('TODAS')
  const { data, isLoading } = useQuery({ queryKey: ['eam-analitica-anomalias'], queryFn: () => api.get(`${R}/anomalias`).then(r => r.data as { anomalias: Anomalia[]; ordenes_revisadas: number; tanqueos_revisados: number; umbral_z: number }), staleTime: 5 * 60_000 })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  const filas = data.anomalias.filter(a => clase === 'TODAS' || a.clase === clase)
  return (
    <Box>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Se revisaron {num(data.ordenes_revisadas)} órdenes y {num(data.tanqueos_revisados)} tanqueos del último año. Cada valor se compara con la mediana de su grupo (mismo tipo de orden y equipo; el rendimiento, contra el del mismo vehículo) y se marca si se aleja más de {data.umbral_z} desviaciones robustas.
      </Typography>
      <ToggleButtonGroup size="small" exclusive value={clase} onChange={(_, v) => v && setClase(v)} sx={{ mb: 2 }}>
        <ToggleButton value="TODAS">Todas ({data.anomalias.length})</ToggleButton>
        {Object.entries(CLASE).map(([k, l]) => <ToggleButton key={k} value={k}>{l} ({data.anomalias.filter(a => a.clase === k).length})</ToggleButton>)}
      </ToggleButtonGroup>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
            <TableCell>Tipo</TableCell><TableCell>Registro</TableCell><TableCell>Equipo</TableCell><TableCell>Qué se compara</TableCell><TableCell align="right">Valor</TableCell><TableCell align="right">Lo normal</TableCell><TableCell align="right">Desvío</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {filas.slice(0, 100).map((a, i) => (
              <TableRow key={i} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell><Chip size="small" label={CLASE[a.clase]} /></TableCell>
                <TableCell>{a.referencia}</TableCell>
                <TableCell><b>{a.activo}</b></TableCell>
                <TableCell>{a.detalle}</TableCell>
                <TableCell align="right">{a.clase === 'COSTO' ? pesos(a.valor) : num(a.valor, 2)}</TableCell>
                <TableCell align="right">{a.clase === 'COSTO' ? pesos(a.normal) : num(a.normal, 2)}</TableCell>
                <TableCell align="right" sx={{ color: a.z > 0 ? '#DC2626' : '#D97706', fontWeight: 700 }}>{a.z > 0 ? '+' : ''}{num(a.z, 1)}</TableCell>
              </TableRow>
            ))}
            {!filas.length && <TableRow><TableCell colSpan={7} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin valores fuera de lo normal.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

export default function EAMIA() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Insights sx={{ fontSize: 28 }} />} titulo="Analítica de confiabilidad" subtitulo="EAM · Weibull, tendencia por equipo, predicción de fallas y anomalías, con los datos de la flota" color={C} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E2E8F0' }} variant="scrollable">
          <Tab label="Vida por modo de falla" />
          <Tab label="Tendencia por equipo" />
          <Tab label="Predicción de fallas" />
          <Tab label="Anomalías" />
        </Tabs>
        {tab === 0 && <Weibull />}
        {tab === 1 && <Tendencia />}
        {tab === 2 && <Prediccion />}
        {tab === 3 && <Anomalias />}
      </Box>
    </Layout>
  )
}
