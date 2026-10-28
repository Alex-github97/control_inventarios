/**
 * Informes de rendimiento de llantas: costo por kilómetro (CPK), km recorridos
 * y km por milímetro de labrado, por categoría.
 *
 * Todas las cifras vienen calculadas del servidor (`/eam/neumaticos/reportes/
 * rendimiento`): una categoría se mide con el cociente de sus sumas, no con el
 * promedio de cada vida, y eso no se puede rehacer aquí a partir de los grupos.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Card, CardContent, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination, Tooltip, alpha,
  ToggleButton, ToggleButtonGroup, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Download, InfoOutlined } from '@mui/icons-material'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { exportarExcel } from '@/utils/exportar'
import { COLOR_MODULO } from '@/config/marca'

const COLOR = COLOR_MODULO

export interface Metricas {
  vidas: number; llantas: number; terminadas: number
  costo_total: number | null; km_total: number | null
  cpk: number | null; cpk_min: number | null; cpk_max: number | null; n_cpk: number
  km_promedio: number | null; km_mediana: number | null; km_max: number | null; n_km: number
  km_mm: number | null; mm_promedio: number | null; n_km_mm: number
}
export interface Grupo extends Metricas { categoria: string }
export interface Dimension { clave: string; nombre: string; grupos: Grupo[] }
export interface Rendimiento { resumen: Metricas; dimensiones: Dimension[] }
interface VidaFila {
  neumatico_id: number; codigo: string; vida: string; terminada: boolean
  fecha_inicio: string | null; fecha_fin: string | null
  km: number | null; mm: number | null; costo: number | null
  cpk: number | null; km_mm: number | null
  categorias: Record<string, string>
}

export type Alcance = 'TODAS' | 'TERMINADAS' | 'EN_SERVICIO'
export type Metrica = 'cpk' | 'km' | 'km_mm'

const METRICAS: Record<Metrica, {
  titulo: string; corto: string; unidad: string; campo: keyof Metricas; n: keyof Metricas
  menorEsMejor: boolean; ayuda: string
}> = {
  cpk: {
    titulo: 'Costo por kilómetro', corto: 'CPK', unidad: '$/km', campo: 'cpk', n: 'n_cpk', menorEsMejor: true,
    ayuda: 'Costo de las vidas (compra o reencauche, más reesculturados y reparaciones, menos ajustes) dividido por los km que recorrieron. Menor es mejor.',
  },
  km: {
    titulo: 'Rendimiento en kilómetros', corto: 'Km por vida', unidad: 'km', campo: 'km_promedio', n: 'n_km', menorEsMejor: false,
    ayuda: 'Kilómetros recorridos en promedio por vida. En las vidas en servicio es lo que llevan hasta hoy. Mayor es mejor.',
  },
  km_mm: {
    titulo: 'Kilómetros por milímetro', corto: 'km/mm', unidad: 'km/mm', campo: 'km_mm', n: 'n_km_mm', menorEsMejor: false,
    ayuda: 'Kilómetros recorridos por cada milímetro de labrado gastado. Mide el desgaste sin depender del precio. Mayor es mejor.',
  },
}

const fmt = (v: number | null | undefined, dec = 0) =>
  v == null ? '—' : v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const fmtMetrica = (m: Metrica, v: number | null | undefined) =>
  m === 'cpk' ? (v == null ? '—' : `$${fmt(v, 2)}`) : m === 'km_mm' ? fmt(v, 0) : fmt(v, 0)
const valor = (g: Metricas, m: Metrica) => g[METRICAS[m].campo] as number | null

function useRendimiento(params: Record<string, unknown>) {
  return useQuery<Rendimiento>({
    queryKey: ['neu-rendimiento', params],
    queryFn: () => api.get('/eam/neumaticos/reportes/rendimiento', { params }).then(r => r.data),
  })
}

/** Grupos que se pueden graficar: con muestra suficiente y con la métrica calculada. */
function gruposComparables(d: Dimension | undefined, m: Metrica, muestra: number) {
  if (!d) return []
  return d.grupos.filter(g => (g[METRICAS[m].n] as number) >= muestra && valor(g, m) != null)
}

function ordenar(gs: Grupo[], m: Metrica) {
  const signo = METRICAS[m].menorEsMejor ? 1 : -1
  return [...gs].sort((a, b) => signo * ((valor(a, m) ?? 0) - (valor(b, m) ?? 0)))
}

// ─── Controles comunes ──────────────────────────────────────────────────────

export interface FiltrosRendimiento {
  alcance: Alcance; kmMinimo: number; muestra: number
}

function Controles({ f, onChange, dimensiones, dimension, onDimension, extra }: {
  f: FiltrosRendimiento; onChange: (f: FiltrosRendimiento) => void
  dimensiones: Dimension[]; dimension: string; onDimension: (d: string) => void
  extra?: React.ReactNode
}) {
  return (
    <Card sx={{ bgcolor: '#FFFFFF', mb: 2 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Categoría" value={dimension}
            onChange={e => onDimension(e.target.value)} sx={{ minWidth: 200 }}>
            {dimensiones.map(d => <MenuItem key={d.clave} value={d.clave}>{d.nombre}</MenuItem>)}
          </TextField>
          <ToggleButtonGroup size="small" exclusive value={f.alcance}
            onChange={(_, v) => v && onChange({ ...f, alcance: v })}>
            <ToggleButton value="TODAS" sx={{ textTransform: 'none', px: 1.5 }}>Todas las vidas</ToggleButton>
            <ToggleButton value="TERMINADAS" sx={{ textTransform: 'none', px: 1.5 }}>Terminadas</ToggleButton>
            <ToggleButton value="EN_SERVICIO" sx={{ textTransform: 'none', px: 1.5 }}>En servicio</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Las vidas con menos kilómetros no entran al CPK ni al km/mm: una llanta recién montada tiene un CPK altísimo que no dice nada de su rendimiento.">
            <TextField size="small" type="number" label="Km mínimos por vida" value={f.kmMinimo}
              onChange={e => onChange({ ...f, kmMinimo: Math.max(0, Number(e.target.value) || 0) })}
              sx={{ width: 170 }} />
          </Tooltip>
          <Tooltip title="Una categoría con una o dos vidas no permite sacar conclusiones. Las que tienen menos no se grafican, pero siguen en la tabla.">
            <TextField size="small" type="number" label="Vidas mínimas para graficar" value={f.muestra}
              onChange={e => onChange({ ...f, muestra: Math.max(1, Number(e.target.value) || 1) })}
              sx={{ width: 200 }} />
          </Tooltip>
          <Box flex={1} />
          {extra}
        </Stack>
      </CardContent>
    </Card>
  )
}

function Indicador({ titulo, valor: v, detalle, ayuda }: { titulo: string; valor: string; detalle?: string; ayuda?: string }) {
  return (
    <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
      <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Typography fontSize={11.5} fontWeight={700} color="#64748B" letterSpacing="0.04em">{titulo.toUpperCase()}</Typography>
          {ayuda && <Tooltip title={ayuda}><InfoOutlined sx={{ fontSize: 14, color: '#94A3B8' }} /></Tooltip>}
        </Stack>
        <Typography fontSize={26} fontWeight={800} color="#0F172A" lineHeight={1.25} mt={0.5}>{v}</Typography>
        {detalle && <Typography fontSize={11.5} color="text.secondary">{detalle}</Typography>}
      </CardContent>
    </Card>
  )
}

function TooltipGrupo({ active, payload, metrica }: any) {
  if (!active || !payload?.length) return null
  const g: Grupo = payload[0].payload
  const m = METRICAS[metrica as Metrica]
  return (
    <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 1.5, p: 1.25, boxShadow: 2, minWidth: 190 }}>
      <Typography fontSize={12.5} fontWeight={700} mb={0.5}>{g.categoria}</Typography>
      <Typography fontSize={12}>{m.corto}: <b>{fmtMetrica(metrica, valor(g, metrica))}</b> {metrica !== 'cpk' ? m.unidad : ''}</Typography>
      {metrica === 'cpk' && g.cpk_min != null && (
        <Typography fontSize={11.5} color="text.secondary">Rango por vida: ${fmt(g.cpk_min, 2)} – ${fmt(g.cpk_max, 2)}</Typography>
      )}
      {metrica === 'km' && <Typography fontSize={11.5} color="text.secondary">Mediana {fmt(g.km_mediana)} km · máx. {fmt(g.km_max)} km</Typography>}
      {metrica === 'km_mm' && <Typography fontSize={11.5} color="text.secondary">{fmt(g.mm_promedio, 1)} mm gastados por vida</Typography>}
      <Typography fontSize={11.5} color="text.secondary">{fmt(g[m.n] as number)} vidas medidas · {fmt(g.llantas)} llantas</Typography>
    </Box>
  )
}

/** Barras horizontales de una métrica, ya ordenadas de mejor a peor. */
function GraficoMetrica({ grupos, metrica, limite = 12 }: { grupos: Grupo[]; metrica: Metrica; limite?: number }) {
  // Se toman las categorías con más vidas y luego se ordenan por la métrica:
  // ordenar primero dejaría arriba una categoría de tres vidas con suerte.
  const datos = ordenar([...grupos].sort((a, b) => b.vidas - a.vidas).slice(0, limite), metrica)
  const m = METRICAS[metrica]
  if (!datos.length) {
    return <Typography fontSize={12.5} color="text.secondary" py={4} textAlign="center">Sin categorías con muestra suficiente.</Typography>
  }
  return (
    <Box sx={{ width: '100%', height: 36 + datos.length * 30 }}>
      <ResponsiveContainer>
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="#F1F5F9" />
          <XAxis type="number" dataKey={m.campo} tick={{ fontSize: 10.5, fill: '#64748B' }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => metrica === 'cpk' ? `$${fmt(v)}` : fmt(v)} />
          <YAxis type="category" dataKey="categoria" width={130} tick={{ fontSize: 11, fill: '#334155' }}
            axisLine={false} tickLine={false}
            tickFormatter={(v: string) => v.length > 20 ? `${v.slice(0, 19)}…` : v} />
          <RTooltip content={<TooltipGrupo metrica={metrica} />} cursor={{ fill: alpha(COLOR, 0.06) }} />
          <Bar dataKey={m.campo} fill={COLOR} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}

function TablaGrupos({ grupos, resaltar }: { grupos: Grupo[]; resaltar?: Metrica }) {
  const encabezados: [string, string, Metrica | null][] = [
    ['Categoría', 'left', null], ['Vidas', 'right', null], ['Llantas', 'right', null],
    ['CPK ($/km)', 'right', 'cpk'], ['Km promedio', 'right', 'km'], ['Km mediana', 'right', null],
    ['km/mm', 'right', 'km_mm'], ['mm gastados', 'right', null], ['Km totales', 'right', null], ['Costo total', 'right', null],
  ]
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(COLOR, 0.08) }}>
            {encabezados.map(([h, al, m]) => (
              <TableCell key={h} align={al as 'left' | 'right'}
                sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', color: m && m === resaltar ? COLOR : undefined }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {grupos.map(g => (
            <TableRow key={g.categoria} hover>
              <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{g.categoria}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(g.vidas)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(g.llantas)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12, fontWeight: resaltar === 'cpk' ? 700 : 400 }}>{fmtMetrica('cpk', g.cpk)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12, fontWeight: resaltar === 'km' ? 700 : 400 }}>{fmt(g.km_promedio)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(g.km_mediana)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12, fontWeight: resaltar === 'km_mm' ? 700 : 400 }}>{fmt(g.km_mm)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(g.mm_promedio, 1)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(g.km_total)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12 }}>${fmt(g.costo_total)}</TableCell>
            </TableRow>
          ))}
          {grupos.length === 0 && (
            <TableRow><TableCell colSpan={encabezados.length} align="center">
              <Typography color="text.secondary" py={3} fontSize={13}>No hay vidas de llanta en el periodo.</Typography>
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  )
}

const COLUMNAS_EXCEL = [
  { key: 'dimension', header: 'Categoría' }, { key: 'categoria', header: 'Valor' },
  { key: 'vidas', header: 'Vidas' }, { key: 'llantas', header: 'Llantas' }, { key: 'terminadas', header: 'Vidas terminadas' },
  { key: 'cpk', header: 'CPK ($/km)' }, { key: 'cpk_min', header: 'CPK mín.' }, { key: 'cpk_max', header: 'CPK máx.' },
  { key: 'km_promedio', header: 'Km promedio' }, { key: 'km_mediana', header: 'Km mediana' }, { key: 'km_max', header: 'Km máx.' },
  { key: 'km_mm', header: 'km/mm' }, { key: 'mm_promedio', header: 'mm gastados prom.' },
  { key: 'km_total', header: 'Km totales' }, { key: 'costo_total', header: 'Costo total' },
]

function exportarGrupos(datos: Rendimiento | undefined, soloClave: string | null, titulo: string, archivo: string, subtitulo: string) {
  const dims = (datos?.dimensiones ?? []).filter(d => !soloClave || d.clave === soloClave)
  const filas = dims.flatMap(d => d.grupos.map(g => ({ dimension: d.nombre, ...g })))
  if (!filas.length) { toast.error('No hay datos para exportar'); return }
  exportarExcel({ archivo, titulo, subtitulo, columnas: COLUMNAS_EXCEL, filas, color: COLOR })
  toast.success('Excel generado')
}

function descripcionFiltros(f: FiltrosRendimiento, desde: string, hasta: string) {
  const alc = { TODAS: 'todas las vidas', TERMINADAS: 'vidas terminadas', EN_SERVICIO: 'vidas en servicio' }[f.alcance]
  const per = desde || hasta ? `del ${desde || 'inicio'} al ${hasta || 'hoy'}` : 'todo el histórico'
  return `${alc[0].toUpperCase()}${alc.slice(1)}, ${per}, mínimo ${fmt(f.kmMinimo)} km por vida`
}

function useEstado(desde: string, hasta: string) {
  const [f, setF] = useState<FiltrosRendimiento>({ alcance: 'TODAS', kmMinimo: 1000, muestra: 5 })
  const [dimension, setDimension] = useState('marca')
  const q = useRendimiento({
    alcance: f.alcance, km_minimo: f.kmMinimo, desde: desde || undefined, hasta: hasta || undefined,
  })
  const dim = q.data?.dimensiones.find(d => d.clave === dimension)
  return { f, setF, dimension, setDimension, q, dim }
}

// ─── Tablero ────────────────────────────────────────────────────────────────

export function TableroRendimiento({ desde, hasta }: { desde: string; hasta: string }) {
  const { f, setF, dimension, setDimension, q, dim } = useEstado(desde, hasta)
  const r = q.data?.resumen
  const titulo = dim?.nombre ?? ''

  return (
    <>
      <Controles f={f} onChange={setF} dimensiones={q.data?.dimensiones ?? []} dimension={dimension} onDimension={setDimension}
        extra={
          <Button variant="contained" startIcon={<Download />} disabled={!q.data}
            onClick={() => exportarGrupos(q.data, null, 'Rendimiento de llantas por categoría', 'rendimiento-llantas', descripcionFiltros(f, desde, hasta))}
            sx={{ bgcolor: COLOR, textTransform: 'none', fontWeight: 700 }}>Descargar Excel</Button>
        } />
      {q.isFetching && <LinearProgress sx={{ mb: 1 }} />}
      {q.isError && <Alert severity="error" sx={{ mb: 2 }}>No se pudo calcular el rendimiento.</Alert>}

      {r && (
        <Grid container spacing={2} mb={2}>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Indicador titulo="CPK" valor={fmtMetrica('cpk', r.cpk)} detalle={`$/km · ${fmt(r.n_cpk)} vidas medidas`} ayuda={METRICAS.cpk.ayuda} />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Indicador titulo="Km por vida" valor={fmt(r.km_promedio)} detalle={`Mediana ${fmt(r.km_mediana)} km`} ayuda={METRICAS.km.ayuda} />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Indicador titulo="km/mm" valor={fmt(r.km_mm)} detalle={`${fmt(r.mm_promedio, 1)} mm gastados por vida`} ayuda={METRICAS.km_mm.ayuda} />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Indicador titulo="Vidas analizadas" valor={fmt(r.vidas)} detalle={`${fmt(r.llantas)} llantas · ${fmt(r.terminadas)} terminadas`} />
          </Grid>
          <Grid size={{ xs: 12, md: 2.4 }}>
            <Indicador titulo="Inversión" valor={`$${fmt(r.costo_total)}`} detalle={`${fmt(r.km_total)} km recorridos`} />
          </Grid>
        </Grid>
      )}

      {r && r.vidas === 0 && !q.isFetching && (
        <Alert severity="info" sx={{ mb: 2 }}>No hay vidas de llanta en el periodo y alcance elegidos.</Alert>
      )}

      {dim && r && r.vidas > 0 && (
        <>
          <Grid container spacing={2} mb={2}>
            {(['cpk', 'km', 'km_mm'] as Metrica[]).map(m => (
              <Grid key={m} size={{ xs: 12, lg: 4 }}>
                <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Typography fontWeight={700} fontSize={14}>{METRICAS[m].titulo}</Typography>
                      <Tooltip title={METRICAS[m].ayuda}><InfoOutlined sx={{ fontSize: 15, color: '#94A3B8' }} /></Tooltip>
                    </Stack>
                    <Typography fontSize={11.5} color="text.secondary" mb={1}>
                      Por {titulo.toLowerCase()} · {METRICAS[m].unidad} · {METRICAS[m].menorEsMejor ? 'menor es mejor' : 'mayor es mejor'}
                    </Typography>
                    <GraficoMetrica grupos={gruposComparables(dim, m, f.muestra)} metrica={m} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography fontWeight={700} fontSize={14}>Detalle por {titulo.toLowerCase()}</Typography>
              <Typography fontSize={11.5} color="text.secondary">
                Los gráficos muestran hasta 12 valores, los que tienen más vidas y al menos {f.muestra}. Aquí están todos.
              </Typography>
            </CardContent>
            <TablaGrupos grupos={dim.grupos} />
          </Card>
        </>
      )}
    </>
  )
}

// ─── Informe de una métrica ─────────────────────────────────────────────────

export function InformeMetrica({ metrica, desde, hasta }: { metrica: Metrica; desde: string; hasta: string }) {
  const { f, setF, dimension, setDimension, q, dim } = useEstado(desde, hasta)
  const m = METRICAS[metrica]
  const comparables = useMemo(() => ordenar(gruposComparables(dim, metrica, f.muestra), metrica), [dim, metrica, f.muestra])
  const pocos = (dim?.grupos ?? []).filter(g => !comparables.includes(g))
  const global = q.data ? valor(q.data.resumen, metrica) : null

  return (
    <>
      <Controles f={f} onChange={setF} dimensiones={q.data?.dimensiones ?? []} dimension={dimension} onDimension={setDimension}
        extra={
          <Button variant="contained" startIcon={<Download />} disabled={!q.data}
            onClick={() => exportarGrupos(q.data, null, `${m.titulo} por categoría`, `llantas-${metrica.replace('_', '-')}`, descripcionFiltros(f, desde, hasta))}
            sx={{ bgcolor: COLOR, textTransform: 'none', fontWeight: 700 }}>Descargar Excel</Button>
        } />
      {q.isFetching && <LinearProgress sx={{ mb: 1 }} />}
      <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2, py: 0.25 }}>{m.ayuda}</Alert>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
            <CardContent>
              <Typography fontWeight={700} fontSize={14}>{m.titulo} por {dim?.nombre.toLowerCase()}</Typography>
              <Typography fontSize={11.5} color="text.secondary" mb={1}>
                Flota completa: <b>{fmtMetrica(metrica, global)}</b> {metrica !== 'cpk' ? m.unidad : '$/km'}
              </Typography>
              <GraficoMetrica grupos={comparables} metrica={metrica} limite={20} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography fontWeight={700} fontSize={14}>Clasificación</Typography>
              <Typography fontSize={11.5} color="text.secondary">
                De mejor a peor. Al final, los valores con menos de {f.muestra} vidas medidas.
              </Typography>
            </CardContent>
            <TablaGrupos grupos={[...comparables, ...pocos]} resaltar={metrica} />
          </Card>
        </Grid>
      </Grid>
    </>
  )
}

// ─── Detalle por vida ───────────────────────────────────────────────────────

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  marca: 'Marca', referencia: 'Referencia', medida: 'Medida', vida: 'Vida', tipo_uso: 'Tipo de uso',
  tipo_vehiculo: 'Tipo de vehículo', vehiculo: 'Vehículo', banda: 'Banda', proveedor: 'Proveedor',
  zona: 'Zona', motivo_fin: 'Motivo de fin', tipo_rin: 'Rin',
}

export function DetalleVidas({ desde, hasta }: { desde: string; hasta: string }) {
  const [alcance, setAlcance] = useState<Alcance>('TODAS')
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(0)
  const [porPagina, setPorPagina] = useState(50)
  const q = useQuery<VidaFila[]>({
    queryKey: ['neu-rendimiento-vidas', alcance, desde, hasta],
    queryFn: () => api.get('/eam/neumaticos/reportes/rendimiento/vidas', {
      params: { alcance, desde: desde || undefined, hasta: hasta || undefined },
    }).then(r => r.data),
  })
  const filas = useMemo(() => {
    const t = buscar.trim().toLowerCase()
    const todas = q.data ?? []
    if (!t) return todas
    return todas.filter(v => v.codigo.toLowerCase().includes(t)
      || Object.values(v.categorias).some(x => x.toLowerCase().includes(t)))
  }, [q.data, buscar])

  const exportar = () => {
    if (!filas.length) { toast.error('No hay datos para exportar'); return }
    exportarExcel({
      archivo: 'vidas-llantas', titulo: 'Rendimiento por vida de llanta',
      columnas: [
        { key: 'codigo', header: 'Llanta' }, { key: 'vida', header: 'Vida' }, { key: 'estado', header: 'Estado' },
        { key: 'inicio', header: 'Inicio' }, { key: 'fin', header: 'Fin' },
        { key: 'km', header: 'Km' }, { key: 'mm', header: 'mm gastados' }, { key: 'costo', header: 'Costo' },
        { key: 'cpk', header: 'CPK ($/km)' }, { key: 'km_mm', header: 'km/mm' },
        ...Object.entries(ETIQUETAS_CATEGORIA).filter(([k]) => k !== 'vida').map(([key, header]) => ({ key, header })),
      ],
      filas: filas.map(v => ({
        ...v.categorias, codigo: v.codigo, vida: v.vida, estado: v.terminada ? 'Terminada' : 'En servicio',
        inicio: v.fecha_inicio ? new Date(v.fecha_inicio).toLocaleDateString('es-CO') : '',
        fin: v.fecha_fin ? new Date(v.fecha_fin).toLocaleDateString('es-CO') : '',
        km: v.km, mm: v.mm, costo: v.costo, cpk: v.cpk, km_mm: v.km_mm,
      })),
      color: COLOR,
    })
    toast.success('Excel generado')
  }

  return (
    <>
      <Card sx={{ bgcolor: '#FFFFFF', mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <ToggleButtonGroup size="small" exclusive value={alcance} onChange={(_, v) => { if (v) { setAlcance(v); setPagina(0) } }}>
              <ToggleButton value="TODAS" sx={{ textTransform: 'none', px: 1.5 }}>Todas las vidas</ToggleButton>
              <ToggleButton value="TERMINADAS" sx={{ textTransform: 'none', px: 1.5 }}>Terminadas</ToggleButton>
              <ToggleButton value="EN_SERVICIO" sx={{ textTransform: 'none', px: 1.5 }}>En servicio</ToggleButton>
            </ToggleButtonGroup>
            <TextField size="small" label="Buscar llanta, marca, vehículo…" value={buscar}
              onChange={e => { setBuscar(e.target.value); setPagina(0) }} sx={{ minWidth: 260 }} />
            <Box flex={1} />
            <Button variant="contained" startIcon={<Download />} disabled={!filas.length} onClick={exportar}
              sx={{ bgcolor: COLOR, textTransform: 'none', fontWeight: 700 }}>Descargar Excel</Button>
          </Stack>
        </CardContent>
      </Card>
      {q.isFetching && <LinearProgress sx={{ mb: 1 }} />}
      <Card sx={{ bgcolor: '#FFFFFF' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(COLOR, 0.08) }}>
                {['Llanta', 'Vida', 'Estado', 'Marca', 'Medida', 'Vehículo', 'Inicio', 'Fin', 'Km', 'mm', 'Costo', 'CPK', 'km/mm', 'Motivo de fin'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}
                    align={['Km', 'mm', 'Costo', 'CPK', 'km/mm'].includes(h) ? 'right' : 'left'}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.slice(pagina * porPagina, (pagina + 1) * porPagina).map(v => (
                <TableRow key={`${v.neumatico_id}-${v.vida}-${v.fecha_inicio}`} hover>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{v.codigo}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.vida}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.terminada ? 'Terminada' : 'En servicio'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.categorias.marca}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.categorias.medida}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.categorias.vehiculo}</TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{v.fecha_inicio ? new Date(v.fecha_inicio).toLocaleDateString('es-CO') : '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{v.fecha_fin ? new Date(v.fecha_fin).toLocaleDateString('es-CO') : '—'}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(v.km)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(v.mm, 1)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>{v.costo != null ? `$${fmt(v.costo)}` : '—'}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>{fmtMetrica('cpk', v.cpk)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(v.km_mm)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.categorias.motivo_fin}</TableCell>
                </TableRow>
              ))}
              {!filas.length && !q.isFetching && (
                <TableRow><TableCell colSpan={14} align="center">
                  <Typography color="text.secondary" py={3} fontSize={13}>No hay vidas de llanta con estos filtros.</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination component="div" count={filas.length} page={pagina} onPageChange={(_, p) => setPagina(p)}
          rowsPerPage={porPagina} onRowsPerPageChange={e => { setPorPagina(Number(e.target.value)); setPagina(0) }}
          rowsPerPageOptions={[25, 50, 100]} labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count.toLocaleString('es-CO')}`} />
      </Card>
    </>
  )
}
