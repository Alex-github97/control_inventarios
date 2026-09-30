/**
 * Piezas compartidas por las pantallas de analítica (EAM, MES, QMS, GRC, APS).
 *
 * La calificación de un modelo se muestra igual en todas: qué modelo ganó, qué
 * tan bien ordena en meses que no vio, cuánto mejora sobre la tasa histórica y
 * si sus porcentajes se cumplen. Una pantalla que muestra probabilidades sin
 * esto le pide al usuario un acto de fe.
 */
import { Box, Paper, Typography, Tooltip, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Cifra } from '@/components/comun/Registro'

export const num = (v?: number | null, d = 0) => v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: d })
export const riesgoColor = (p: number) => p >= 50 ? '#DC2626' : p >= 25 ? '#D97706' : '#16A34A'

export interface CalificacionModelo {
  suficiente: boolean; util?: boolean; motivo?: string; filas: number; positivos: number
  modelo?: string; auc?: number; habilidad?: number; tasa_historica?: number; corte_validacion?: string
  filas_prueba?: number; comparacion?: Record<string, { auc: number; habilidad: number }>
  calibracion?: { desde: number; hasta: number; observaciones: number; predicho: number; real: number }[]
  importancia?: { variable: string; etiqueta: string; aporte: number }[]
}

/** Cifras de calidad del modelo, qué pesa y si se cumple lo que predice. */
export function CalificacionDelModelo({ m, horizonte, color, evento }: { m: CalificacionModelo; horizonte: number; color: string; evento: string }) {
  if (!m.suficiente) return (
    <Alert severity="info">
      Todavía no hay historia suficiente para entrenar un modelo confiable. {m.motivo} Con {num(m.filas)} observaciones y {num(m.positivos)} casos de {evento}, cualquier probabilidad sería inventada.
    </Alert>
  )
  const maxImp = Math.max(...(m.importancia ?? []).map(i => i.aporte), 1e-9)
  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Modelo elegido" valor={<span style={{ fontSize: 16 }}>{m.modelo}</span>} color={color} sub={Object.entries(m.comparacion ?? {}).map(([k, v]) => `${k}: AUC ${num(v.auc, 2)}`).join(' · ')} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title="0,5 es adivinar; 1 es perfecto. Mide si ordena bien por riesgo en meses que el modelo no vio."><Box><Cifra etiqueta="AUC en periodo no visto" valor={num(m.auc, 2)} color={color} /></Box></Tooltip></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Tooltip title="Cuánto mejora el error frente a decirle a todos la tasa histórica."><Box><Cifra etiqueta="Mejora sobre la tasa histórica" valor={`${num((m.habilidad ?? 0) * 100, 1)} %`} color={m.util ? '#16A34A' : '#DC2626'} sub={`Tasa histórica: ${num(m.tasa_historica, 1)} % en ${horizonte} días`} /></Box></Tooltip></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Observaciones" valor={num(m.filas)} color="#64748B" sub={`${num(m.positivos)} con ${evento} · ${num(m.filas_prueba)} de prueba desde ${m.corte_validacion}`} /></Grid>
      </Grid>
      {!m.util && <Alert severity="warning" sx={{ mb: 2 }}>El modelo no le gana con claridad a la tasa histórica. Sus probabilidades no deben usarse para decidir; se muestran solo como referencia.</Alert>}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1}>Qué pesa en la predicción</Typography>
            {(m.importancia ?? []).map(i => (
              <Box key={i.variable} sx={{ mb: 0.75 }}>
                <Typography fontSize={12}>{i.etiqueta}</Typography>
                <Box sx={{ height: 6, borderRadius: 1, bgcolor: '#E2E8F0' }}><Box sx={{ height: 6, borderRadius: 1, bgcolor: color, width: `${(i.aporte / maxImp) * 100}%` }} /></Box>
              </Box>
            ))}
            <Typography fontSize={11} color="text.secondary" mt={1}>Cuánto empeora el modelo en el periodo de prueba si se desordena cada variable.</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1}>¿Se cumple lo que predice?</Typography>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Tramo</TableCell><TableCell align="right">Casos</TableCell><TableCell align="right">Predijo</TableCell><TableCell align="right">Ocurrió</TableCell></TableRow></TableHead>
              <TableBody>
                {(m.calibracion ?? []).map(c => (
                  <TableRow key={c.desde} sx={{ '& td': { fontSize: 12 } }}>
                    <TableCell>{num(c.desde, 0)}–{num(c.hasta, 0)} %</TableCell><TableCell align="right">{c.observaciones}</TableCell>
                    <TableCell align="right">{num(c.predicho, 1)} %</TableCell><TableCell align="right">{num(c.real, 1)} %</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography fontSize={11} color="text.secondary" mt={1}>Si «predijo» y «ocurrió» se parecen, los porcentajes se pueden leer al pie de la letra.</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

/** Probabilidad con la advertencia de fuera de experiencia, si la hay. */
export function Probabilidad({ p, fuera }: { p: number; fuera?: string[] }) {
  if (fuera?.length) return (
    <Tooltip title={`El modelo casi no vio casos así (${fuera.join(', ')}): esta cifra no está respaldada.`}>
      <span style={{ color: '#94A3B8', fontWeight: 700 }}>{num(p, 1)} % ⚠</span>
    </Tooltip>
  )
  return <b style={{ color: riesgoColor(p) }}>{num(p, 1)} %</b>
}

export interface PuntoCarta { etiqueta: string; valor: number; lcs?: number; lci?: number; alertas: string[] }

/** Carta de control: línea central, límites (fijos o por punto) y puntos con alerta en rojo. */
export function CartaControl({ serie, centro, lcs, lci, unidad, color, ultimos = 120 }: {
  serie: PuntoCarta[]; centro: number; lcs?: number; lci?: number; unidad: string; color: string; ultimos?: number
}) {
  const s = serie.slice(-ultimos)
  const w = 900, h = 220, pl = 44, pr = 10, pt = 10, pb = 22
  const sup = s.map(p => p.lcs ?? lcs ?? p.valor), inf = s.map(p => p.lci ?? lci ?? p.valor)
  const vals = s.map(p => p.valor).concat(sup, inf, [centro])
  const max = Math.max(...vals), min = Math.min(...vals), rango = max - min || 1
  const x = (i: number) => pl + (i / Math.max(s.length - 1, 1)) * (w - pl - pr)
  const y = (v: number) => pt + (1 - (v - min) / rango) * (h - pt - pb)
  const linea = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Carta de control">
      {[max, centro, min].map((v, i) => <text key={i} x={2} y={y(v) + 3} fontSize={10} fill="#64748B">{num(v, 1)}{unidad}</text>)}
      <path d={linea(sup)} fill="none" stroke="#DC2626" strokeDasharray="4 3" strokeWidth={1} />
      <path d={linea(inf)} fill="none" stroke="#DC2626" strokeDasharray="4 3" strokeWidth={1} />
      <line x1={pl} x2={w - pr} y1={y(centro)} y2={y(centro)} stroke="#16A34A" strokeWidth={1} />
      <path d={linea(s.map(p => p.valor))} fill="none" stroke={color} strokeWidth={1.2} />
      {s.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.valor)} r={p.alertas.length ? 3.5 : 1.8} fill={p.alertas.length ? '#DC2626' : color}>
          <title>{`${p.etiqueta}: ${num(p.valor, 2)}${unidad}${p.alertas.length ? ' — ' + p.alertas.join('; ') : ''}`}</title>
        </circle>
      ))}
      <text x={pl} y={h - 6} fontSize={10} fill="#64748B">{s[0]?.etiqueta}</text>
      <text x={w - pr} y={h - 6} fontSize={10} fill="#64748B" textAnchor="end">{s[s.length - 1]?.etiqueta}</text>
    </svg>
  )
}
