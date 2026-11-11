/**
 * Tablero de la pila de descarte: por qué se dan de baja las llantas (motivo de
 * daño, del catálogo de Configuración, y motivo de fin de vida), de qué marca y
 * referencia son las que más se dañan, el índice de reencauche (I.R.) de lo
 * descartado y la evolución mensual.
 *
 * Todo viene agregado del servidor (`/reportes/descarte`) con los filtros
 * comunes. Pulsar un motivo, una marca o una referencia filtra la lista de
 * descarte de abajo con los mismos filtros, así que el total cuadra.
 */
import { useMemo, useState } from 'react'
import {
  Alert, Box, Card, CardContent, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import type { FiltrosLlantas } from './FiltrosLlantas'

const ROJO = '#DC2626'
const n = (x: number) => x.toLocaleString('es-CO')

interface Reparto { id: number | null; nombre: string; cantidad: number; porcentaje: number }
interface FilaCruce { categoria: string; marca?: string | null; total: number; ir: number | null; por_dano: Record<string, number> }
interface Mes { mes: string; total: number; por_dano: Record<string, number> }
interface Tablero {
  total: number
  ir: { llantas: number; ir: number | null; distribucion: { reencauches: number; cantidad: number }[] }
  por_dano: Reparto[]
  por_motivo_fin: Reparto[]
  por_marca: FilaCruce[]
  por_referencia: FilaCruce[]
  mensual: Mes[]
  por_ubicacion?: Reparto[]
  por_categoria?: Reparto[]
  por_causa?: Reparto[]
  por_motivo_dano?: Reparto[]
  por_responsable?: Reparto[]
  por_medida?: FilaCruce[]
  disposicion?: {
    registradas: number; profundidad_remanente: number | null; mm_desperdiciados: number | null
    con_reparaciones: number; regrabadas: number; con_fotos: number
  } | null
}

/** Lo que se eligió en el tablero para filtrar la lista. 0 = «sin motivo». */
export interface SaltoDescarte {
  etiqueta: string
  dano_id?: number
  motivo_fin_vida_id?: number
  marca?: string
  referencia?: string
}

const vida = (r: number) => (r === 0 ? 'Nueva (VN)' : `R${r}`)

function Kpi({ titulo, valor, nota, color }: { titulo: string; valor: string; nota?: string; color?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography fontSize={11.5} color="text.secondary">{titulo}</Typography>
        <Typography fontSize={22} fontWeight={800} color={color ?? 'text.primary'} lineHeight={1.25}>{valor}</Typography>
        {nota && <Typography fontSize={11} color="text.secondary">{nota}</Typography>}
      </CardContent>
    </Card>
  )
}

function Barras({ titulo, filas, onClick, ayuda }: {
  titulo: string; filas: Reparto[]; onClick?: (r: Reparto) => void; ayuda?: string
}) {
  const max = Math.max(1, ...filas.map(f => f.cantidad))
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography fontWeight={700} fontSize={14}>{titulo}</Typography>
        {ayuda && <Typography fontSize={11.5} color="text.secondary" mb={1}>{ayuda}</Typography>}
        {filas.length === 0 && <Typography fontSize={12.5} color="text.secondary">Sin bajas en el periodo.</Typography>}
        <Stack spacing={0.75} mt={1}>
          {filas.map(f => (
            <Box key={`${f.id}-${f.nombre}`} onClick={onClick ? () => onClick(f) : undefined}
              role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
              aria-label={onClick ? `Ver las bajas por ${f.nombre}` : undefined}
              onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(f) } }}
              sx={{ cursor: onClick ? 'pointer' : 'default', borderRadius: 1, px: 0.5, py: 0.25,
                    '&:hover': onClick ? { bgcolor: alpha(ROJO, 0.05) } : undefined }}>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography fontSize={12.5} fontStyle={f.id === null ? 'italic' : undefined} noWrap>{f.nombre}</Typography>
                <Typography fontSize={12} color="text.secondary" whiteSpace="nowrap">{n(f.cantidad)} · {f.porcentaje} %</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={(100 * f.cantidad) / max}
                sx={{ height: 6, borderRadius: 3, bgcolor: alpha(ROJO, 0.08),
                      '& .MuiLinearProgress-bar': { bgcolor: f.id === null ? '#94A3B8' : ROJO, borderRadius: 3 } }} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function Cruce({ titulo, filas, danos, onFila }: {
  titulo: string; filas: FilaCruce[]; danos: Reparto[]; onFila: (f: FilaCruce) => void
}) {
  // Columnas: los daños más frecuentes; el resto se suma en «Otros».
  const cols = danos.slice(0, 6)
  const claves = new Set(cols.map(d => String(d.id ?? 'null')))
  const max = Math.max(1, ...filas.flatMap(f => cols.map(d => f.por_dano[String(d.id ?? 'null')] ?? 0)))
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={700} fontSize={14}>{titulo}</Typography>
        <Typography fontSize={11.5} color="text.secondary" mb={1}>
          Cuántas bajas tiene cada una por motivo de daño; el color marca dónde se concentran. Pulse una fila para ver sus llantas.
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{titulo.includes('referencia') ? 'Referencia' : 'Marca'}</TableCell>
                {cols.map(d => (
                  <TableCell key={String(d.id)} align="right" sx={{ fontWeight: 700, fontSize: 11.5, maxWidth: 110 }}>
                    <Tooltip title={d.nombre}><span>{d.nombre.length > 16 ? `${d.nombre.slice(0, 15)}…` : d.nombre}</span></Tooltip>
                  </TableCell>
                ))}
                {danos.length > cols.length && <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>Otros</TableCell>}
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  <Tooltip title="Índice de reencauche: promedio de reencauches al darse de baja"><span>I.R.</span></Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map(f => {
                const otros = Object.entries(f.por_dano).filter(([k]) => !claves.has(k)).reduce((s, [, v]) => s + v, 0)
                const clic = f.categoria !== 'Otras'
                return (
                  <TableRow key={f.categoria} hover={clic} onClick={clic ? () => onFila(f) : undefined}
                    sx={{ cursor: clic ? 'pointer' : 'default' }}>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{f.categoria}</TableCell>
                    {cols.map(d => {
                      const v = f.por_dano[String(d.id ?? 'null')] ?? 0
                      return (
                        <TableCell key={String(d.id)} align="right"
                          sx={{ bgcolor: v ? alpha(ROJO, 0.06 + 0.5 * (v / max)) : undefined, fontVariantNumeric: 'tabular-nums' }}>
                          {v ? n(v) : '·'}
                        </TableCell>
                      )
                    })}
                    {danos.length > cols.length && <TableCell align="right">{otros ? n(otros) : '·'}</TableCell>}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{n(f.total)}</TableCell>
                    <TableCell align="right">{f.ir?.toFixed(2) ?? '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  )
}

export function TableroDescarte({ filtros, desde, hasta, onSalto }: {
  filtros: FiltrosLlantas; desde: string; hasta: string; onSalto: (s: SaltoDescarte) => void
}) {
  const [danoSerie, setDanoSerie] = useState('')
  const { data, isLoading, isError } = useQuery<Tablero>({
    queryKey: ['eam-neu-tablero-descarte', filtros, desde, hasta],
    queryFn: () => api.get('/eam/neumaticos/reportes/descarte', {
      params: { ...filtros, desde: desde || undefined, hasta: hasta || undefined },
    }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const serie = useMemo(() => (data?.mensual ?? []).map(m => ({
    mes: m.mes, bajas: danoSerie ? (m.por_dano[danoSerie] ?? 0) : m.total,
  })), [data, danoSerie])

  if (isError) return <Alert severity="error">No se pudo cargar el tablero de descarte.</Alert>
  if (isLoading || !data) return <LinearProgress />

  const sinMotivo = data.por_dano.find(d => d.id === null)
  const principal = data.por_dano.find(d => d.id !== null)
  const marcaDe = (f: FilaCruce) => f.categoria
  const idSalto = (id: number | null) => (id === null ? 0 : id)

  return (
    <Stack spacing={2} aria-label="Tablero de la pila de descarte">
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}><Kpi titulo="Llantas dadas de baja" valor={n(data.total)} nota="en el periodo y los filtros" color={ROJO} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Kpi titulo="I.R. del descarte" valor={data.ir.ir != null ? data.ir.ir.toFixed(2) : '—'}
            nota="promedio de reencauches al darse de baja" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Kpi titulo="Motivo de daño principal" valor={principal ? `${principal.porcentaje} %` : '—'} nota={principal?.nombre ?? 'Sin daños registrados'} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Kpi titulo="Sin motivo registrado" valor={sinMotivo ? `${sinMotivo.porcentaje} %` : '0 %'}
            nota={sinMotivo ? `${n(sinMotivo.cantidad)} bajas sin daño del catálogo` : 'todas las bajas tienen daño'}
            color={sinMotivo && sinMotivo.porcentaje > 20 ? '#D97706' : undefined} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Barras titulo="Por motivo de daño" filas={data.por_dano}
            ayuda="Del catálogo de daños de Configuración. Pulse un motivo para ver sus llantas."
            onClick={r => onSalto({ etiqueta: `Daño: ${r.nombre}`, dano_id: idSalto(r.id) })} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Barras titulo="Por motivo de fin de vida" filas={data.por_motivo_fin}
            onClick={r => onSalto({ etiqueta: `Fin de vida: ${r.nombre}`, motivo_fin_vida_id: idSalto(r.id) })} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography fontWeight={700} fontSize={14}>Vidas al descartarse</Typography>
              <Typography fontSize={11.5} color="text.secondary" mb={1}>Cuántas llantas se botaron nuevas y con cada número de reencauches.</Typography>
              <Table size="small">
                <TableBody>
                  {data.ir.distribucion.map(d => (
                    <TableRow key={d.reencauches}>
                      <TableCell sx={{ border: 0, py: 0.4 }}>{vida(d.reencauches)}</TableCell>
                      <TableCell sx={{ border: 0, py: 0.4 }} align="right">{n(d.cantidad)}</TableCell>
                      <TableCell sx={{ border: 0, py: 0.4 }} align="right">
                        {data.ir.llantas ? `${((100 * d.cantidad) / data.ir.llantas).toFixed(1)} %` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {(data.por_ubicacion?.length ?? 0) > 0 && (
        <>
          <Box sx={{ pt: 1 }}>
            <Typography fontWeight={800} fontSize={15}>Pila de desechos: por qué se perdió cada carcasa</Typography>
            <Typography fontSize={11.5} color="text.secondary">
              Sobre las {n((data.por_ubicacion ?? []).reduce((t, r) => t + r.cantidad, 0))} bajas con código de daño
              clasificado; las que no lo tienen no entran en estos repartos.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Barras titulo="Dónde está el daño" filas={data.por_ubicacion ?? []}
                ayuda="Ubicación del daño en la llanta, según el catálogo." />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Barras titulo="Categoría de daño" filas={data.por_categoria ?? []}
                ayuda="La avería: separación, desgaste, corte…" />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Barras titulo="Motivo" filas={data.por_motivo_dano ?? []}
                ayuda="Mala reparación, daño accidental, operativo, calor…" />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Barras titulo="Responsable" filas={data.por_responsable ?? []}
                ayuda="A quién se atribuye: operador, tercero, mantenimiento, fortuito." />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Barras titulo="Daños más recurrentes (causa)" filas={(data.por_causa ?? []).slice(0, 12)}
                ayuda="La causa concreta de cada código de daño." />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Barras titulo="Por dimensión" filas={(data.por_medida ?? []).map(f => ({
                id: null, nombre: f.categoria, cantidad: f.total,
                porcentaje: data.total ? Math.round((1000 * f.total) / data.total) / 10 : 0,
              }))} ayuda="Medidas de las llantas desechadas." />
            </Grid>
          </Grid>
        </>
      )}
      {data.disposicion && data.disposicion.registradas > 0 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Kpi titulo="Con examen de disposición" valor={n(data.disposicion.registradas)}
              nota={`${data.disposicion.con_fotos} con fotos`} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Kpi titulo="Profundidad remanente promedio"
              valor={data.disposicion.profundidad_remanente != null ? `${data.disposicion.profundidad_remanente} mm` : '—'}
              nota="caucho que se botó con la carcasa" color={ROJO} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Kpi titulo="mm desperdiciados" valor={data.disposicion.mm_desperdiciados != null ? n(Math.round(data.disposicion.mm_desperdiciados)) : '—'}
              nota="sobre el mínimo legal, sumados" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Kpi titulo="Con reparaciones" valor={n(data.disposicion.con_reparaciones)}
              nota={`${n(data.disposicion.regrabadas)} regrabadas`} />
          </Grid>
        </Grid>
      )}

      <Cruce titulo="Daños por marca" filas={data.por_marca} danos={data.por_dano}
        onFila={f => onSalto({ etiqueta: `Marca: ${f.categoria}`, marca: marcaDe(f) })} />
      <Cruce titulo="Daños por referencia" filas={data.por_referencia} danos={data.por_dano}
        onFila={f => onSalto({ etiqueta: `Referencia: ${f.categoria}`, referencia: f.categoria })} />

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} gap={1} flexWrap="wrap">
            <Typography fontWeight={700} fontSize={14}>Bajas por mes</Typography>
            <TextField select size="small" label="Motivo de daño" value={danoSerie} onChange={e => setDanoSerie(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">Todos los motivos</MenuItem>
              {data.por_dano.map(d => <MenuItem key={String(d.id)} value={String(d.id ?? 'null')}>{d.nombre}</MenuItem>)}
            </TextField>
          </Stack>
          {serie.length === 0
            ? <Typography fontSize={12.5} color="text.secondary">Sin bajas con fecha en el periodo.</Typography>
            : (
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={serie} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={44} />
                    <RTooltip formatter={(v: number) => [n(v), 'Bajas']} cursor={{ fill: alpha(ROJO, 0.06) }} />
                    <Bar dataKey="bajas" fill={ROJO} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
        </CardContent>
      </Card>
    </Stack>
  )
}
