/**
 * Confiabilidad del CMMS — indicadores, Pareto, criticidad, FMEA y calibraciones.
 *
 * Antes eran 1.471 líneas sobre datos escritos en el código. Ahora todo sale de
 * `/eam/confiabilidad`, y las fórmulas son las mismas que usa el tablero porque
 * viven en un solo módulo del servidor.
 *
 * Un indicador sin datos suficientes muestra «—» y dice sobre cuántos casos se
 * calculó. Un MTBF de tres órdenes no merece la misma confianza que uno de
 * trescientas, y esconderlo invita a decidir sobre un número que no aguanta.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Tabs, Tab,
  Divider, LinearProgress,
} from '@mui/material'
import {
  Add, Insights, WarningAmber, Download, Science, Verified, DeleteOutline,
  Edit, TrendingDown,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import { descargarExcel, descargarLibro, hoja } from '@/utils/excel'

const R = '/eam/confiabilidad'

const mensaje = (e: any) =>
  e?.response?.data?.detail ?? e?.message ?? 'No se pudo completar la operación'

const pesos = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const numero = (v?: number | null, d = 1) =>
  v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: d })

const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** Horas legibles: 36 h se entiende peor que «1 d 12 h». */
const duracion = (h?: number | null) => {
  if (h == null) return '—'
  if (h < 24) return `${numero(h)} h`
  const d = Math.floor(h / 24)
  const resto = Math.round(h % 24)
  return resto ? `${d} d ${resto} h` : `${d} d`
}

interface FilaGrupo {
  etiqueta: string; activos: number; ordenes: number; fallas: number
  costo: number; costo_fallas: number
  mttr_horas: number | null; mttr_casos: number
  mtbf_horas: number | null; mtbf_activos: number
  horas_fuera: number; disponibilidad: number | null
}

interface Indicadores {
  periodo_dias: number; activos: number; ordenes: number; fallas: number
  costo_total: number; costo_fallas: number
  mttr_horas: number | null; mttr_casos: number
  mtbf_horas: number | null; mtbf_activos: number
  disponibilidad: number | null
  por_marca: FilaGrupo[]; por_linea: FilaGrupo[]
  por_tipo: FilaGrupo[]; por_activo: FilaGrupo[]
}

const COLOR_CUADRANTE: Record<string, string> = {
  CRITICO: ESTADO.peligro, COSTOSO: ESTADO.alerta,
  REPETITIVO: COLOR_MODULO, CONTROLADO: ESTADO.exito,
}

const ETIQUETA_CUADRANTE: Record<string, string> = {
  CRITICO: 'Crítico', COSTOSO: 'Costoso', REPETITIVO: 'Repetitivo',
  CONTROLADO: 'Controlado',
}

export default function EAMConfiabilidad() {
  const [tab, setTab] = useState(0)
  const [dias, setDias] = useState(180)
  const [criterio, setCriterio] = useState('costo')

  const { data: ind, isLoading } = useQuery<Indicadores>({
    queryKey: ['conf-indicadores', dias],
    queryFn: () => api.get(`${R}/indicadores`, { params: { dias } }).then(r => r.data) })
  const { data: pareto } = useQuery<any>({
    queryKey: ['conf-pareto', dias, criterio],
    queryFn: () => api.get(`${R}/pareto`, { params: { dias, criterio } }).then(r => r.data) })
  const { data: criticidad = [] } = useQuery<any[]>({
    queryKey: ['conf-criticidad'],
    queryFn: () => api.get(`${R}/criticidad`).then(r => r.data) })

  const columnasGrupo = [
    { titulo: 'Etiqueta', valor: 'etiqueta' as const },
    { titulo: 'Activos', valor: 'activos' as const },
    { titulo: 'Órdenes', valor: 'ordenes' as const },
    { titulo: 'Fallas', valor: 'fallas' as const },
    { titulo: 'MTTR (h)', valor: 'mttr_horas' as const },
    { titulo: 'MTTR sobre', valor: 'mttr_casos' as const },
    { titulo: 'MTBF (h)', valor: 'mtbf_horas' as const },
    { titulo: 'MTBF sobre', valor: 'mtbf_activos' as const },
    { titulo: 'Disponibilidad %', valor: 'disponibilidad' as const },
    { titulo: 'Horas fuera', valor: 'horas_fuera' as const },
    { titulo: 'Costo', valor: 'costo' as const },
    { titulo: 'Costo de fallas', valor: 'costo_fallas' as const },
  ]

  const bajarIndicadores = () => {
    if (!ind) return
    descargarLibro('confiabilidad_indicadores', [
      { titulo: 'Por activo', ws: hoja<FilaGrupo>(ind.por_activo, columnasGrupo) },
      { titulo: 'Por marca', ws: hoja<FilaGrupo>(ind.por_marca, columnasGrupo) },
      { titulo: 'Por línea', ws: hoja<FilaGrupo>(ind.por_linea, columnasGrupo) },
      { titulo: 'Por tipo', ws: hoja<FilaGrupo>(ind.por_tipo, columnasGrupo) },
    ])
  }

  return (
    <Layout title="Confiabilidad">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-end" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="h6" fontWeight={800}>Confiabilidad</Typography>
            <Typography variant="caption" color="text.secondary">
              MTBF, MTTR y disponibilidad calculados de las órdenes, no estimados
            </Typography>
          </Box>
          <TextField select size="small" label="Periodo" value={dias} sx={{ width: 150 }}
            onChange={e => setDias(Number(e.target.value))}>
            <MenuItem value={90}>90 días</MenuItem>
            <MenuItem value={180}>6 meses</MenuItem>
            <MenuItem value={365}>1 año</MenuItem>
            <MenuItem value={730}>2 años</MenuItem>
          </TextField>
        </Stack>

        {isLoading || !ind ? <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3, mb: 2 }} /> : (
          <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
            <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap
              divider={<Divider orientation="vertical" flexItem />}>
              <Tooltip title="Tiempo medio entre fallas: por activo, el intervalo entre fallas consecutivas">
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">MTBF</Typography>
                  <Typography variant="h6" fontWeight={800}>{duracion(ind.mtbf_horas)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ind.mtbf_activos ? `sobre ${ind.mtbf_activos} activos con fallas repetidas`
                      : 'hace falta más de una falla por activo'}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Tiempo medio de reparación: entre el inicio y el cierre de las órdenes de falla">
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">MTTR</Typography>
                  <Typography variant="h6" fontWeight={800}>{duracion(ind.mttr_horas)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ind.mttr_casos ? `sobre ${ind.mttr_casos} órdenes`
                      : 'sin órdenes de falla cerradas'}
                  </Typography>
                </Box>
              </Tooltip>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">Disponibilidad</Typography>
                <Typography variant="h6" fontWeight={800} sx={{
                  color: ind.disponibilidad == null ? undefined
                    : ind.disponibilidad >= 95 ? ESTADO.exito
                    : ind.disponibilidad >= 85 ? ESTADO.alerta : ESTADO.peligro }}>
                  {ind.disponibilidad != null ? `${ind.disponibilidad}%` : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ind.activos} activos en el periodo
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">Fallas</Typography>
                <Typography variant="h6" fontWeight={800} sx={{
                  color: ind.fallas ? ESTADO.peligro : ESTADO.exito }}>{ind.fallas}</Typography>
                <Typography variant="caption" color="text.secondary">
                  de {ind.ordenes} órdenes · {pesos(ind.costo_fallas)}
                </Typography>
              </Box>
            </Stack>
          </Card>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          <Tab label="Indicadores" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Pareto" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Criticidad (${criticidad.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="FMEA" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Calibraciones" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {/* ── Indicadores ───────────────────────────────────────────────── */}
        {tab === 0 && ind && (
          <Box>
            <Stack direction="row" mb={2}>
              <Box sx={{ flex: 1 }} />
              <Button startIcon={<Download />} variant="outlined" onClick={bajarIndicadores}
                sx={{ textTransform: 'none' }}>Excel</Button>
            </Stack>
            {([['Por activo', ind.por_activo], ['Por marca', ind.por_marca],
               ['Por línea', ind.por_linea]] as [string, FilaGrupo[]][]).map(([titulo, filas]) => (
              <Card key={titulo} sx={{ borderRadius: 3, overflow: 'auto', mb: 2 }}>
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cada grupo con su propio MTBF y MTTR, no un prorrateo del total
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['', 'ACTIVOS', 'ÓRDENES', 'FALLAS', 'MTBF', 'MTTR',
                        'DISPONIBILIDAD', 'COSTO'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filas.slice(0, 12).map(f => (
                      <TableRow key={f.etiqueta} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{f.etiqueta}</TableCell>
                        <TableCell>{f.activos}</TableCell>
                        <TableCell>{f.ordenes}</TableCell>
                        <TableCell sx={{ color: f.fallas ? ESTADO.peligro : 'text.secondary' }}>
                          {f.fallas}
                        </TableCell>
                        <TableCell>
                          {duracion(f.mtbf_horas)}
                          {f.mtbf_activos > 0 && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {f.mtbf_activos} activos
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {duracion(f.mttr_horas)}
                          {f.mttr_casos > 0 && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {f.mttr_casos} órdenes
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {f.disponibilidad != null ? (
                            <Box sx={{ minWidth: 90 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                {f.disponibilidad}%
                              </Typography>
                              <LinearProgress variant="determinate" value={f.disponibilidad} sx={{
                                mt: 0.3, height: 5, borderRadius: 99, bgcolor: PALETA.niebla,
                                '& .MuiLinearProgress-bar': { borderRadius: 99,
                                  bgcolor: f.disponibilidad >= 95 ? ESTADO.exito
                                    : f.disponibilidad >= 85 ? ESTADO.alerta : ESTADO.peligro } }} />
                            </Box>
                          ) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {pesos(f.costo)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filas.length === 0 && (
                      <TableRow><TableCell colSpan={8} sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Sin órdenes cerradas en el periodo.
                        </Typography>
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </Box>
        )}

        {/* ── Pareto ────────────────────────────────────────────────────── */}
        {tab === 1 && pareto && (
          <Box>
            <Stack direction="row" spacing={1.5} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Ordenar por" value={criterio} sx={{ width: 180 }}
                onChange={e => setCriterio(e.target.value)}>
                <MenuItem value="costo">Costo</MenuItem>
                <MenuItem value="fallas">Número de fallas</MenuItem>
                <MenuItem value="horas">Horas fuera de servicio</MenuItem>
              </TextField>
              <Box sx={{ flex: 1 }} />
              <Button startIcon={<Download />} variant="outlined" sx={{ textTransform: 'none' }}
                onClick={() => descargarExcel('confiabilidad_pareto', pareto.filas, [
                  { titulo: 'Activo', valor: 'placa' }, { titulo: 'Nombre', valor: 'nombre' },
                  { titulo: 'Marca', valor: 'marca' }, { titulo: 'Línea', valor: 'linea' },
                  { titulo: 'Órdenes', valor: 'ordenes' }, { titulo: 'Fallas', valor: 'fallas' },
                  { titulo: 'Costo', valor: 'costo' },
                  { titulo: 'Horas fuera', valor: 'horas' },
                  { titulo: 'Acumulado', valor: 'acumulado' },
                  { titulo: 'Acumulado %', valor: 'acumulado_pct' },
                ], 'Pareto')}>Excel</Button>
            </Stack>

            {pareto.activos_80pct != null && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <b>{pareto.activos_80pct} de {pareto.activos} activos</b> concentran el 80% del{' '}
                {criterio === 'costo' ? 'costo' : criterio === 'fallas' ? 'número de fallas'
                  : 'tiempo fuera de servicio'}. Ese es el número que decide dónde poner el
                esfuerzo la semana entrante; la lista ordenada la da cualquier tabla.
              </Alert>
            )}

            <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['#', 'ACTIVO', 'MARCA / LÍNEA', 'ÓRDENES', 'FALLAS', 'COSTO',
                      'HORAS FUERA', 'ACUMULADO'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pareto.filas.map((f: any, i: number) => (
                    <TableRow key={f.activo_id} hover sx={{
                      bgcolor: pareto.activos_80pct && i < pareto.activos_80pct
                        ? `${ESTADO.alerta}0A` : undefined }}>
                      <TableCell sx={{ color: PALETA.acero }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {f.placa}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {f.nombre}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {[f.marca, f.linea].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell>{f.ordenes}</TableCell>
                      <TableCell sx={{ color: f.fallas ? ESTADO.peligro : 'text.secondary' }}>
                        {f.fallas}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{pesos(f.costo)}</TableCell>
                      <TableCell>{numero(f.horas)}</TableCell>
                      <TableCell>
                        <Box sx={{ minWidth: 100 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {f.acumulado_pct}%
                          </Typography>
                          <LinearProgress variant="determinate" value={f.acumulado_pct ?? 0} sx={{
                            mt: 0.3, height: 5, borderRadius: 99, bgcolor: PALETA.niebla,
                            '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: COLOR_MODULO } }} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pareto.filas.length === 0 && (
                    <TableRow><TableCell colSpan={8} sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Sin órdenes cerradas en el periodo.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Box>
        )}

        {/* ── Criticidad ────────────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Cruza <b>frecuencia de falla contra costo</b>. Separa «se daña seguido pero es
              barato» de «se daña poco y cuesta una fortuna»: dos problemas distintos que un
              solo ranking mezcla. Los cortes salen de la mediana de su propia flota, no de un
              número fijo.
            </Alert>
            <Stack direction="row" mb={2}>
              <Box sx={{ flex: 1 }} />
              <Button startIcon={<Download />} variant="outlined" sx={{ textTransform: 'none' }}
                disabled={criticidad.length === 0}
                onClick={() => descargarExcel('confiabilidad_criticidad', criticidad, [
                  { titulo: 'Activo', valor: 'placa' }, { titulo: 'Nombre', valor: 'nombre' },
                  { titulo: 'Marca', valor: 'marca' }, { titulo: 'Línea', valor: 'linea' },
                  { titulo: 'Criticidad declarada', valor: 'criticidad_declarada' },
                  { titulo: 'Fallas', valor: 'fallas' }, { titulo: 'Costo', valor: 'costo' },
                  { titulo: 'Costo por falla', valor: 'costo_por_falla' },
                  { titulo: 'Horas fuera', valor: 'horas_fuera' },
                  { titulo: 'Cuadrante', valor: (f: any) => ETIQUETA_CUADRANTE[f.cuadrante] },
                ], 'Criticidad')}>Excel</Button>
            </Stack>
            <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['ACTIVO', 'MARCA / LÍNEA', 'DECLARADA', 'FALLAS', 'COSTO',
                      'COSTO POR FALLA', 'HORAS FUERA', 'CUADRANTE'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {criticidad.map(f => (
                    <TableRow key={f.activo_id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {f.placa}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {f.nombre}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {[f.marca, f.linea].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: PALETA.grafito }}>
                        {f.criticidad_declarada ?? '—'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{f.fallas}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{pesos(f.costo)}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {pesos(f.costo_por_falla)}
                      </TableCell>
                      <TableCell>{numero(f.horas_fuera)}</TableCell>
                      <TableCell>
                        <Chip label={ETIQUETA_CUADRANTE[f.cuadrante]} size="small" sx={{
                          height: 21, fontSize: 10.5, fontWeight: 800,
                          bgcolor: `${COLOR_CUADRANTE[f.cuadrante]}1F`,
                          color: COLOR_CUADRANTE[f.cuadrante] }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {criticidad.length === 0 && (
                    <TableRow><TableCell colSpan={8} sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Todavía no hay activos con fallas registradas.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Box>
        )}

        {tab === 3 && <FMEA />}
        {tab === 4 && <Calibraciones />}
      </Box>
    </Layout>
  )
}

/* ═══ FMEA ════════════════════════════════════════════════════════════════ */
function FMEA() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<any>(null)
  const [f, setF] = useState<any>({})

  const { data = [] } = useQuery<any[]>({
    queryKey: ['conf-fmea'], queryFn: () => api.get(`${R}/fmea`).then(r => r.data) })
  const { data: activos = [] } = useQuery<any[]>({
    queryKey: ['eam-activos-conf'],
    queryFn: () => api.get('/eam/activos').then(r =>
      Array.isArray(r.data) ? r.data : (r.data?.items ?? [])) })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['conf-fmea'] })
  const guardar = useMutation({
    mutationFn: () => edicion
      ? api.put(`${R}/fmea/${edicion.id}`, f).then(r => r.data)
      : api.post(`${R}/fmea`, f).then(r => r.data),
    onSuccess: (r: any) => {
      invalidar(); setAbierto(false)
      toast.success(`NPR ${r.npn} · riesgo ${r.nivel.toLowerCase()}`)
    },
    onError: (e: any) => toast.error(mensaje(e), { duration: 6000 }),
  })

  const npr = (Number(f.severidad) || 0) * (Number(f.ocurrencia) || 0)
    * (Number(f.detectabilidad) || 0)
  const colorNivel = (n: string) =>
    n === 'ALTO' ? ESTADO.peligro : n === 'MEDIO' ? ESTADO.alerta : ESTADO.exito

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        El número de prioridad de riesgo es <b>severidad × ocurrencia × detectabilidad</b>, cada
        una de 1 a 10. Lo calcula el servidor: es un producto de tres números y dejarlo al
        navegador solo abre la puerta a que se guarde uno que no cuadra.
      </Alert>
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<Download />} variant="outlined" sx={{ mr: 1.5, textTransform: 'none' }}
          disabled={data.length === 0}
          onClick={() => descargarExcel('confiabilidad_fmea', data, [
            { titulo: 'Activo', valor: 'activo_codigo' },
            { titulo: 'Nombre', valor: 'activo_nombre' },
            { titulo: 'Componente', valor: 'componente' },
            { titulo: 'Función', valor: 'funcion' },
            { titulo: 'Modo de falla', valor: 'modo_falla' },
            { titulo: 'Efecto', valor: 'efecto_falla' },
            { titulo: 'Causa', valor: 'causa_falla' },
            { titulo: 'Severidad', valor: 'severidad' },
            { titulo: 'Ocurrencia', valor: 'ocurrencia' },
            { titulo: 'Detectabilidad', valor: 'detectabilidad' },
            { titulo: 'NPR', valor: 'npn' }, { titulo: 'Nivel', valor: 'nivel' },
            { titulo: 'Acción recomendada', valor: 'accion_recomendada' },
            { titulo: 'Responsable', valor: 'responsable' },
          ], 'FMEA')}>Excel</Button>
        <Button variant="contained" startIcon={<Add />} disabled={activos.length === 0}
          onClick={() => {
            setEdicion(null)
            setF({ severidad: 5, ocurrencia: 5, detectabilidad: 5, activo_id: activos[0]?.id })
            setAbierto(true)
          }} sx={{ textTransform: 'none', fontWeight: 700 }}>Nuevo análisis</Button>
      </Stack>
      <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['ACTIVO', 'FUNCIÓN', 'MODO DE FALLA', 'S', 'O', 'D', 'NPR',
                'ACCIÓN RECOMENDADA', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(x => (
              <TableRow key={x.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                  {x.activo_codigo}
                  {x.componente && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {x.componente}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{x.funcion}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {x.modo_falla}
                  {x.efecto_falla && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {x.efecto_falla}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{x.severidad}</TableCell>
                <TableCell>{x.ocurrencia}</TableCell>
                <TableCell>{x.detectabilidad}</TableCell>
                <TableCell>
                  <Chip label={x.npn} size="small" sx={{
                    height: 22, fontSize: 11, fontWeight: 800,
                    bgcolor: `${colorNivel(x.nivel)}1F`, color: colorNivel(x.nivel) }} />
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: PALETA.grafito }}>
                  {x.accion_recomendada ?? '—'}
                  {x.responsable && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {x.responsable}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  <IconButton size="small" onClick={() => { setEdicion(x); setF({ ...x }); setAbierto(true) }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() =>
                    api.delete(`${R}/fmea/${x.id}`).then(() => invalidar())}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={9} sx={{ py: 5, textAlign: 'center' }}>
                <Science sx={{ fontSize: 36, color: PALETA.acero, opacity: 0.4 }} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Sin análisis de modos de falla.
                </Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? 'Editar análisis' : 'Nuevo análisis de modo de falla'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select size="small" label="Activo" value={f.activo_id ?? ''}
              onChange={e => setF({ ...f, activo_id: Number(e.target.value) })}>
              {activos.map(a => (
                <MenuItem key={a.id} value={a.id}>{a.codigo} · {a.nombre}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="Función" value={f.funcion ?? ''}
              onChange={e => setF({ ...f, funcion: e.target.value })}
              helperText="Qué debe hacer el componente cuando está sano" />
            <TextField size="small" label="Modo de falla" value={f.modo_falla ?? ''}
              onChange={e => setF({ ...f, modo_falla: e.target.value })}
              helperText="Cómo deja de cumplir esa función" />
            <TextField size="small" label="Efecto de la falla" multiline rows={2}
              value={f.efecto_falla ?? ''}
              onChange={e => setF({ ...f, efecto_falla: e.target.value })} />
            <TextField size="small" label="Causa" multiline rows={2} value={f.causa_falla ?? ''}
              onChange={e => setF({ ...f, causa_falla: e.target.value })} />
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Severidad" type="number" fullWidth
                inputProps={{ min: 1, max: 10 }} value={f.severidad ?? 5}
                onChange={e => setF({ ...f, severidad: Number(e.target.value) })} />
              <TextField size="small" label="Ocurrencia" type="number" fullWidth
                inputProps={{ min: 1, max: 10 }} value={f.ocurrencia ?? 5}
                onChange={e => setF({ ...f, ocurrencia: Number(e.target.value) })} />
              <TextField size="small" label="Detectabilidad" type="number" fullWidth
                inputProps={{ min: 1, max: 10 }} value={f.detectabilidad ?? 5}
                onChange={e => setF({ ...f, detectabilidad: Number(e.target.value) })} />
            </Stack>
            <Alert severity={npr >= 200 ? 'error' : npr >= 100 ? 'warning' : 'success'}
              sx={{ py: 0.25 }}>
              NPR = <b>{npr}</b> · riesgo {npr >= 200 ? 'alto' : npr >= 100 ? 'medio' : 'bajo'}
            </Alert>
            <TextField size="small" label="Acción recomendada" multiline rows={2}
              value={f.accion_recomendada ?? ''}
              onChange={e => setF({ ...f, accion_recomendada: e.target.value })} />
            <TextField size="small" label="Responsable" value={f.responsable ?? ''}
              onChange={e => setF({ ...f, responsable: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.activo_id || !f.funcion || !f.modo_falla}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ═══ Calibraciones ═══════════════════════════════════════════════════════ */
function Calibraciones() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<any>(null)
  const [f, setF] = useState<any>({})

  const { data = [] } = useQuery<any[]>({
    queryKey: ['conf-calibraciones'],
    queryFn: () => api.get(`${R}/calibraciones`).then(r => r.data) })
  const { data: activos = [] } = useQuery<any[]>({
    queryKey: ['eam-activos-conf'],
    queryFn: () => api.get('/eam/activos').then(r =>
      Array.isArray(r.data) ? r.data : (r.data?.items ?? [])) })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['conf-calibraciones'] })
  const guardar = useMutation({
    mutationFn: () => edicion
      ? api.put(`${R}/calibraciones/${edicion.id}`, f).then(r => r.data)
      : api.post(`${R}/calibraciones`, f).then(r => r.data),
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Calibración guardada') },
    onError: (e: any) => toast.error(mensaje(e), { duration: 6000 }),
  })

  const color = (e: string) =>
    e === 'VENCIDA' ? ESTADO.peligro : e === 'POR_VENCER' ? ESTADO.alerta : ESTADO.exito
  const etiqueta: Record<string, string> = {
    VENCIDA: 'Vencida', POR_VENCER: 'Por vencer', VIGENTE: 'Vigente' }

  const vencidas = data.filter(c => c.estado === 'VENCIDA').length
  const porVencer = data.filter(c => c.estado === 'POR_VENCER').length

  return (
    <Box>
      {(vencidas > 0 || porVencer > 0) && (
        <Alert severity={vencidas ? 'error' : 'warning'} icon={<WarningAmber />} sx={{ mb: 2 }}>
          {vencidas > 0 && <>{vencidas} {vencidas === 1 ? 'calibración vencida' : 'calibraciones vencidas'}: esos
            instrumentos están midiendo fuera de su certificación. </>}
          {porVencer > 0 && <>{porVencer} vencen en menos de 30 días.</>}
        </Alert>
      )}
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<Download />} variant="outlined" sx={{ mr: 1.5, textTransform: 'none' }}
          disabled={data.length === 0}
          onClick={() => descargarExcel('confiabilidad_calibraciones', data, [
            { titulo: 'Activo', valor: 'activo_codigo' },
            { titulo: 'Nombre', valor: 'activo_nombre' },
            { titulo: 'Instrumento', valor: 'tipo_instrumento' },
            { titulo: 'Certificado', valor: 'numero_certificado' },
            { titulo: 'Laboratorio', valor: 'laboratorio' },
            { titulo: 'Acreditación', valor: 'acreditacion' },
            { titulo: 'Calibración', valor: 'fecha_calibracion' },
            { titulo: 'Vencimiento', valor: 'fecha_vencimiento' },
            { titulo: 'Días para vencer', valor: 'dias_para_vencer' },
            { titulo: 'Resultado', valor: 'resultado' },
            { titulo: 'Estado', valor: (c: any) => etiqueta[c.estado] ?? c.estado },
            { titulo: 'Incertidumbre', valor: 'incertidumbre' },
          ], 'Calibraciones')}>Excel</Button>
        <Button variant="contained" startIcon={<Add />} disabled={activos.length === 0}
          onClick={() => {
            setEdicion(null)
            setF({ activo_id: activos[0]?.id, resultado: 'CONFORME' })
            setAbierto(true)
          }} sx={{ textTransform: 'none', fontWeight: 700 }}>Nueva calibración</Button>
      </Stack>
      <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['ACTIVO', 'INSTRUMENTO', 'CERTIFICADO', 'LABORATORIO', 'CALIBRACIÓN',
                'VENCIMIENTO', 'RESULTADO', 'ESTADO', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(c => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                  {c.activo_codigo}
                </TableCell>
                <TableCell>{c.tipo_instrumento ?? '—'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{c.numero_certificado ?? '—'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {c.laboratorio ?? '—'}
                  {c.acreditacion && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {c.acreditacion}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{fecha(c.fecha_calibracion)}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {fecha(c.fecha_vencimiento)}
                  <Typography variant="caption" display="block" sx={{
                    color: c.dias_para_vencer < 0 ? ESTADO.peligro : 'text.secondary' }}>
                    {c.dias_para_vencer < 0
                      ? `hace ${Math.abs(c.dias_para_vencer)} días`
                      : `en ${c.dias_para_vencer} días`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={c.resultado} size="small" sx={{
                    height: 19, fontSize: 10, fontWeight: 700,
                    bgcolor: c.resultado === 'CONFORME' ? `${ESTADO.exito}1A` : `${ESTADO.peligro}1A`,
                    color: c.resultado === 'CONFORME' ? ESTADO.exito : ESTADO.peligro }} />
                </TableCell>
                <TableCell>
                  <Chip label={etiqueta[c.estado] ?? c.estado} size="small" sx={{
                    height: 21, fontSize: 10.5, fontWeight: 800,
                    bgcolor: `${color(c.estado)}1F`, color: color(c.estado) }} />
                </TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  <IconButton size="small" onClick={() => { setEdicion(c); setF({ ...c }); setAbierto(true) }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() =>
                    api.delete(`${R}/calibraciones/${c.id}`).then(() => invalidar())}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={9} sx={{ py: 5, textAlign: 'center' }}>
                <Verified sx={{ fontSize: 36, color: PALETA.acero, opacity: 0.4 }} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Sin calibraciones registradas.
                </Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? 'Editar calibración' : 'Nueva calibración'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select size="small" label="Activo / instrumento" value={f.activo_id ?? ''}
              onChange={e => setF({ ...f, activo_id: Number(e.target.value) })}>
              {activos.map(a => (
                <MenuItem key={a.id} value={a.id}>{a.codigo} · {a.nombre}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Tipo de instrumento" fullWidth
                value={f.tipo_instrumento ?? ''}
                onChange={e => setF({ ...f, tipo_instrumento: e.target.value })} />
              <TextField size="small" label="N.º de certificado" fullWidth
                value={f.numero_certificado ?? ''}
                onChange={e => setF({ ...f, numero_certificado: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Laboratorio" fullWidth value={f.laboratorio ?? ''}
                onChange={e => setF({ ...f, laboratorio: e.target.value })} />
              <TextField size="small" label="Acreditación" fullWidth value={f.acreditacion ?? ''}
                onChange={e => setF({ ...f, acreditacion: e.target.value })}
                helperText="ONAC, ILAC…" />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Fecha de calibración" type="date" fullWidth
                InputLabelProps={{ shrink: true }} value={f.fecha_calibracion ?? ''}
                onChange={e => setF({ ...f, fecha_calibracion: e.target.value })} />
              <TextField size="small" label="Vencimiento" type="date" fullWidth
                InputLabelProps={{ shrink: true }} value={f.fecha_vencimiento ?? ''}
                onChange={e => setF({ ...f, fecha_vencimiento: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField select size="small" label="Resultado" fullWidth
                value={f.resultado ?? 'CONFORME'}
                onChange={e => setF({ ...f, resultado: e.target.value })}>
                <MenuItem value="CONFORME">Conforme</MenuItem>
                <MenuItem value="NO_CONFORME">No conforme</MenuItem>
              </TextField>
              <TextField size="small" label="Incertidumbre" fullWidth value={f.incertidumbre ?? ''}
                onChange={e => setF({ ...f, incertidumbre: e.target.value })} />
            </Stack>
            <TextField size="small" label="Patrón utilizado" value={f.patron_utilizado ?? ''}
              onChange={e => setF({ ...f, patron_utilizado: e.target.value })} />
            <TextField size="small" label="Observaciones" multiline rows={2}
              value={f.observaciones ?? ''}
              onChange={e => setF({ ...f, observaciones: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained"
            disabled={!f.activo_id || !f.fecha_calibracion || !f.fecha_vencimiento}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
