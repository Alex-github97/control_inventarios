/**
 * Tablero del CMMS.
 *
 * Antes eran 1.058 líneas sobre constantes escritas en el código: 127 activos
 * que no existían, una tabla de confiabilidad inventada y alertas que no
 * apuntaban a nada. Ahora todo sale de `/eam/dashboard/completo`.
 *
 * Dos decisiones que se notan al usarlo:
 *
 * Un indicador sin datos suficientes muestra «—» y no un cero. Un MTBF en cero
 * se lee como «se daña todo el tiempo», que es justo lo contrario de lo que
 * significa no tener datos.
 *
 * Cada promedio dice sobre cuántos casos se calculó. Un MTTR de tres órdenes no
 * merece la misma confianza que uno de trescientas, y esconderlo invita a tomar
 * decisiones sobre un número que no aguanta.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Stack, Chip, Skeleton, Alert, TextField, MenuItem,
  Divider, Tooltip, LinearProgress, Button, Table, TableBody, TableCell,
  TableHead, TableRow,
} from '@mui/material'
import {
  Insights, WarningAmber, ChevronRight, CheckCircleOutline,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'

interface FilaTipo {
  etiqueta: string; total: number; operativos: number; disponibilidad: number | null
}
interface FilaGrupo {
  etiqueta: string; ordenes: number; fallas: number; costo: number
}
interface AlertaTablero {
  tipo: string; referencia?: string | null; titulo: string; detalle?: string
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA'; enlace?: string
}
interface Tablero {
  periodo_dias: number
  activos: {
    total: number; operativos: number; en_mantenimiento: number
    fuera_servicio: number; disponibilidad_pct: number | null
    por_estado: Record<string, number>; por_tipo: FilaTipo[]
  }
  ordenes: {
    abiertas: number; vencidas: number; cerradas_periodo: number
    por_estado: Record<string, number>; por_prioridad: Record<string, number>
    costo_periodo: number; costo_fallas: number
  }
  confiabilidad: {
    mttr_horas: number | null; mttr_casos: number
    mtbf_horas: number | null; mtbf_activos: number
    cumplimiento_pm_pct: number | null
    rutinas_totales: number; rutinas_vencidas: number
  }
  tendencia: { mes: string; ordenes: number; fallas: number; costo: number }[]
  por_marca: FilaGrupo[]
  por_linea: FilaGrupo[]
  alertas: AlertaTablero[]
}

const pesos = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const numero = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('es-CO')

/** Horas legibles: 36 h se entiende peor que «1 d 12 h». */
const duracion = (h?: number | null) => {
  if (h == null) return '—'
  if (h < 24) return `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`
  const d = Math.floor(h / 24)
  const resto = Math.round(h % 24)
  return resto ? `${d} d ${resto} h` : `${d} d`
}

const colorAlerta = (s: string) =>
  s === 'CRITICA' ? ESTADO.peligro : s === 'ALTA' ? ESTADO.alerta : COLOR_MODULO

function Indicador({ titulo, valor, pie, color, alerta }: {
  titulo: string; valor: string; pie?: string; color?: string; alerta?: boolean
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary">{titulo}</Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color: color ?? 'text.primary' }}>
        {valor}
      </Typography>
      {pie && (
        <Typography variant="caption" sx={{ color: alerta ? ESTADO.alerta : 'text.secondary' }}>
          {pie}
        </Typography>
      )}
    </Box>
  )
}

/** Ranking horizontal: con pocas categorías se lee mejor que una torta. */
function Ranking({ titulo, ayuda, filas, campo, color, formato }: {
  titulo: string; ayuda: string; filas: any[]; campo: string; color: string
  formato?: (f: any) => string
}) {
  const tope = Math.max(1, ...filas.map(f => f[campo] ?? 0))
  return (
    <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
      <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
      <Typography variant="caption" color="text.secondary">{ayuda}</Typography>
      {filas.length === 0 ? (
        <Typography variant="body2" sx={{ py: 3, textAlign: 'center', color: PALETA.acero }}>
          Sin datos en el periodo
        </Typography>
      ) : (
        <Stack spacing={1.25} mt={2}>
          {filas.map(f => (
            <Box key={f.etiqueta}>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>
                  {f.etiqueta}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {formato ? formato(f) : f[campo]}
                </Typography>
              </Stack>
              <Box sx={{
                mt: 0.4, height: 7, borderRadius: 99, bgcolor: color,
                width: `${((f[campo] ?? 0) / tope) * 100}%`, minWidth: 4,
              }} />
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  )
}

export default function EAMDashboard() {
  const navigate = useNavigate()
  const [dias, setDias] = useState(90)
  const [tipo, setTipo] = useState('')
  const [marca, setMarca] = useState('')

  const { data: filtros } = useQuery<{ tipos: string[]; marcas: string[] }>({
    queryKey: ['eam-dash-filtros'],
    queryFn: () => api.get('/eam/dashboard/filtros').then(r => r.data),
  })

  const { data, isLoading } = useQuery<Tablero>({
    queryKey: ['eam-dashboard', dias, tipo, marca],
    queryFn: () => api.get('/eam/dashboard/completo', {
      params: { dias, tipo_activo: tipo || undefined, marca: marca || undefined },
    }).then(r => r.data),
  })

  if (isLoading || !data) {
    return <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3 }} />
  }

  const { activos, ordenes, confiabilidad, alertas, tendencia } = data
  const sinDatos = activos.total === 0

  const topeTendencia = Math.max(1, ...tendencia.map(t => t.ordenes))

  return (
    <Box className="anim-page-in">
      <Stack direction="row" alignItems="flex-end" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography variant="h6" fontWeight={800}>Tablero de mantenimiento</Typography>
          <Typography variant="caption" color="text.secondary">
            Activos, órdenes y confiabilidad de los últimos {dias} días
          </Typography>
        </Box>
        <TextField select size="small" label="Periodo" value={dias} sx={{ minWidth: 140 }}
          onChange={e => setDias(Number(e.target.value))}>
          <MenuItem value={30}>30 días</MenuItem>
          <MenuItem value={90}>90 días</MenuItem>
          <MenuItem value={180}>6 meses</MenuItem>
          <MenuItem value={365}>1 año</MenuItem>
        </TextField>
        <TextField select size="small" label="Tipo de activo" value={tipo} sx={{ minWidth: 170 }}
          onChange={e => setTipo(e.target.value)}>
          <MenuItem value="">Todos</MenuItem>
          {(filtros?.tipos ?? []).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Marca" value={marca} sx={{ minWidth: 160 }}
          onChange={e => setMarca(e.target.value)}>
          <MenuItem value="">Todas</MenuItem>
          {(filtros?.marcas ?? []).map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
      </Stack>

      {sinDatos && (
        <Alert severity="info" sx={{ mb: 2 }}
          action={<Button size="small" onClick={() => navigate('/eam/activos')}>Ir a activos</Button>}>
          No hay activos registrados todavía. El tablero se llena solo a medida que se
          cargan activos y se cierran órdenes de trabajo.
        </Alert>
      )}

      {/* ── Indicadores ─────────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap
          divider={<Divider orientation="vertical" flexItem />}>
          <Indicador titulo="Activos" valor={numero(activos.total)}
            pie={`${activos.operativos} operativos · ${activos.en_mantenimiento} en mantenimiento`} />
          <Indicador titulo="Disponibilidad"
            valor={activos.disponibilidad_pct != null ? `${activos.disponibilidad_pct}%` : '—'}
            color={activos.disponibilidad_pct == null ? undefined
              : activos.disponibilidad_pct >= 90 ? ESTADO.exito
              : activos.disponibilidad_pct >= 75 ? ESTADO.alerta : ESTADO.peligro} />
          <Indicador titulo="Órdenes abiertas" valor={numero(ordenes.abiertas)}
            pie={ordenes.vencidas ? `${ordenes.vencidas} vencidas` : 'ninguna vencida'}
            alerta={ordenes.vencidas > 0}
            color={ordenes.vencidas ? ESTADO.alerta : undefined} />
          <Indicador titulo="Costo del periodo" valor={pesos(ordenes.costo_periodo)}
            pie={ordenes.costo_fallas ? `${pesos(ordenes.costo_fallas)} en fallas` : undefined} />
        </Stack>
      </Card>

      {/* ── Confiabilidad ───────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <Insights sx={{ fontSize: 18, color: COLOR_MODULO }} />
          <Typography variant="subtitle2" fontWeight={800}>Confiabilidad</Typography>
          <Typography variant="caption" color="text.secondary">
            calculada de las órdenes marcadas como falla, no estimada
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap
          divider={<Divider orientation="vertical" flexItem />}>
          <Tooltip title="Tiempo medio de reparación: promedio entre el inicio y el cierre de las órdenes de falla">
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="caption" color="text.secondary">MTTR</Typography>
              <Typography variant="h6" fontWeight={800}>
                {duracion(confiabilidad.mttr_horas)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {confiabilidad.mttr_casos
                  ? `sobre ${confiabilidad.mttr_casos} ${confiabilidad.mttr_casos === 1 ? 'orden' : 'órdenes'}`
                  : 'sin órdenes de falla cerradas'}
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Tiempo medio entre fallas: por activo, el intervalo entre fallas consecutivas">
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="caption" color="text.secondary">MTBF</Typography>
              <Typography variant="h6" fontWeight={800}>
                {duracion(confiabilidad.mtbf_horas)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {confiabilidad.mtbf_activos
                  ? `sobre ${confiabilidad.mtbf_activos} ${confiabilidad.mtbf_activos === 1 ? 'activo' : 'activos'} con fallas repetidas`
                  : 'hace falta más de una falla por activo'}
              </Typography>
            </Box>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography variant="caption" color="text.secondary">Cumplimiento del plan</Typography>
            <Typography variant="h6" fontWeight={800} sx={{
              color: confiabilidad.cumplimiento_pm_pct == null ? undefined
                : confiabilidad.cumplimiento_pm_pct >= 90 ? ESTADO.exito
                : confiabilidad.cumplimiento_pm_pct >= 70 ? ESTADO.alerta : ESTADO.peligro }}>
              {confiabilidad.cumplimiento_pm_pct != null
                ? `${confiabilidad.cumplimiento_pm_pct}%` : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {confiabilidad.rutinas_totales
                ? `${confiabilidad.rutinas_vencidas} de ${confiabilidad.rutinas_totales} rutinas vencidas`
                : 'sin rutinas asignadas a activos'}
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* ── Alertas ─────────────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <WarningAmber sx={{ fontSize: 18, color: alertas.length ? ESTADO.alerta : ESTADO.exito }} />
          <Typography variant="subtitle2" fontWeight={800}>Requiere atención</Typography>
        </Stack>
        {alertas.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
            <CheckCircleOutline sx={{ color: ESTADO.exito }} />
            <Typography variant="body2" color="text.secondary">
              Nada vencido ni en estado crítico.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>
            {alertas.map((a, i) => (
              <Box key={i}
                onClick={() => a.enlace && navigate(a.enlace)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25,
                  borderRadius: 2, border: `1px solid ${PALETA.niebla}`,
                  borderLeft: `3px solid ${colorAlerta(a.severidad)}`,
                  cursor: a.enlace ? 'pointer' : 'default',
                  transition: 'background .18s ease',
                  '&:hover': a.enlace ? { bgcolor: PALETA.bruma } : {},
                }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.titulo}</Typography>
                  {a.detalle && (
                    <Typography variant="caption" color="text.secondary">{a.detalle}</Typography>
                  )}
                </Box>
                <Chip label={a.severidad === 'CRITICA' ? 'Crítica'
                  : a.severidad === 'ALTA' ? 'Alta' : 'Media'} size="small" sx={{
                    height: 20, fontSize: 10, fontWeight: 800,
                    bgcolor: `${colorAlerta(a.severidad)}1A`, color: colorAlerta(a.severidad) }} />
                {a.enlace && <ChevronRight sx={{ fontSize: 18, color: PALETA.acero }} />}
              </Box>
            ))}
          </Stack>
        )}
      </Card>

      {/* ── Rankings ────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gap: 2, mb: 2,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Card sx={{ borderRadius: 3, p: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={800}>Disponibilidad por tipo</Typography>
          <Typography variant="caption" color="text.secondary">
            Qué familia de activos está más detenida
          </Typography>
          {activos.por_tipo.length === 0 ? (
            <Typography variant="body2" sx={{ py: 3, textAlign: 'center', color: PALETA.acero }}>
              Sin activos
            </Typography>
          ) : (
            <Stack spacing={1.5} mt={2}>
              {activos.por_tipo.map(t => (
                <Box key={t.etiqueta}>
                  <Stack direction="row" alignItems="baseline" spacing={1}>
                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>
                      {t.etiqueta}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.operativos} de {t.total}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      {t.disponibilidad != null ? `${t.disponibilidad}%` : '—'}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={t.disponibilidad ?? 0} sx={{
                    mt: 0.4, height: 6, borderRadius: 99, bgcolor: PALETA.niebla,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 99,
                      bgcolor: (t.disponibilidad ?? 0) >= 90 ? ESTADO.exito
                        : (t.disponibilidad ?? 0) >= 75 ? ESTADO.alerta : ESTADO.peligro,
                    },
                  }} />
                </Box>
              ))}
            </Stack>
          )}
        </Card>

        <Ranking titulo="Órdenes por marca"
          ayuda="Dónde se concentra la carga de mantenimiento"
          filas={data.por_marca} campo="ordenes" color={PALETA.grafito}
          formato={f => `${f.ordenes}${f.fallas ? ` · ${f.fallas} fallas` : ''}`} />

        <Ranking titulo="Costo por marca"
          ayuda="Dónde se va la plata del periodo"
          filas={data.por_marca} campo="costo" color={COLOR_MODULO}
          formato={f => pesos(f.costo)} />

        <Ranking titulo="Órdenes por línea"
          ayuda="El detalle dentro de cada marca"
          filas={data.por_linea} campo="ordenes" color={PALETA.acero}
          formato={f => `${f.ordenes}${f.fallas ? ` · ${f.fallas} fallas` : ''}`} />
      </Box>

      {/* ── Tendencia ───────────────────────────────────────────────────────── */}
      {tendencia.length > 0 && (
        <Card sx={{ borderRadius: 3, mb: 2 }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800}>Mes a mes</Typography>
            <Typography variant="caption" color="text.secondary">
              Órdenes cerradas, cuántas fueron por falla y cuánto costaron
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['MES', 'ÓRDENES', 'FALLAS', 'COSTO', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tendencia.map(t => (
                <TableRow key={t.mes} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{t.mes}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t.ordenes}</TableCell>
                  <TableCell sx={{ color: t.fallas ? ESTADO.peligro : 'text.secondary' }}>
                    {t.fallas}
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{pesos(t.costo)}</TableCell>
                  <TableCell sx={{ width: '40%' }}>
                    <Box sx={{
                      height: 6, borderRadius: 99, bgcolor: COLOR_MODULO,
                      width: `${(t.ordenes / topeTendencia) * 100}%`, minWidth: 4,
                    }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  )
}
