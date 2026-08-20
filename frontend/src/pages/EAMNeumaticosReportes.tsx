import { useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Card, CardContent, Chip,
  Alert, Table, TableHead, TableBody, TableRow, TableCell, Divider, alpha, Paper,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  ArrowBack as BackIcon, PictureAsPdf, Download, Timeline, DirectionsCar,
  Straighten, PieChart as PieIcon,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarExcel } from '@/utils/exportar'
import { generarPDFEstadoFlota } from '@/utils/reporteFlotaPDF'
import type { VehiculoReporte } from '@/utils/reporteFlotaPDF'

const EAM_COLOR = '#32AC5C'
const EAM_DARK = '#27884A'

interface Vehiculo { id: number; codigo: string; placa?: string | null; nombre: string }
interface ComposicionItem { grupo: string; valor: string; cantidad: number; porcentaje: number }
interface ConfigNeu { profundidad_minima: number }
interface InspeccionHistorial {
  id: number; codigo: string; vehiculo?: string | null; posicion?: string | null
  vida?: string | null; fecha?: string | null; profundidad_min?: number | null
  presion_psi?: number | null; km_odometro?: number | null
  estado_visual?: string | null; observaciones?: string | null; tecnico?: string | null
}

type TipoInforme = 'ESTADO_FLOTA' | 'COMPOSICION' | 'HISTORIAL'

const INFORMES: { id: TipoInforme; titulo: string; descripcion: string; icono: JSX.Element }[] = [
  {
    id: 'ESTADO_FLOTA',
    titulo: 'Estado actual de la flota',
    descripcion: 'Una página por vehículo con su esquema de llantas, la profundidad mínima de cada posición y las observaciones del periodo.',
    icono: <DirectionsCar />,
  },
  {
    id: 'COMPOSICION',
    titulo: 'Composición de llantas a piso',
    descripcion: 'Cómo se reparte el parque montado por marca, medida, referencia, vida, estado y tipo de uso.',
    icono: <PieIcon />,
  },
  {
    id: 'HISTORIAL',
    titulo: 'Historial de inspecciones',
    descripcion: 'Todas las inspecciones del periodo con sus medidas, técnico y observaciones.',
    icono: <Straighten />,
  },
]

export default function EAMNeumaticosReportes() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState<TipoInforme>('ESTADO_FLOTA')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [vehId, setVehId] = useState('')
  const [generando, setGenerando] = useState(false)

  const params = {
    desde: desde ? new Date(`${desde}T00:00:00`).toISOString() : undefined,
    hasta: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : undefined,
  }

  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({
    queryKey: ['eam-activos'],
    queryFn: () => api.get('/eam/activos').then(r => r.data),
  })
  const { data: cfg } = useQuery<ConfigNeu>({
    queryKey: ['eam-cfg-neu'],
    queryFn: () => api.get('/eam/neumaticos/config').then(r => r.data),
  })
  const { data: flota = [], isFetching: cargandoFlota } = useQuery<VehiculoReporte[]>({
    queryKey: ['rep-estado-flota', desde, hasta, vehId],
    queryFn: () => api.get('/eam/neumaticos/reportes/estado-flota', {
      params: { ...params, activo_id: vehId || undefined },
    }).then(r => r.data),
    enabled: tipo === 'ESTADO_FLOTA',
  })
  const { data: composicion = [], isFetching: cargandoComp } = useQuery<ComposicionItem[]>({
    queryKey: ['rep-composicion'],
    queryFn: () => api.get('/eam/neumaticos/reportes/composicion', { params: { solo_montadas: true } }).then(r => r.data),
    enabled: tipo === 'COMPOSICION',
  })
  const { data: historial = [], isFetching: cargandoHist } = useQuery<InspeccionHistorial[]>({
    queryKey: ['rep-historial', desde, hasta, vehId],
    queryFn: () => api.get('/eam/neumaticos/inspecciones', {
      params: { ...params, activo_id: vehId || undefined },
    }).then(r => r.data),
    enabled: tipo === 'HISTORIAL',
  })

  const cargando = cargandoFlota || cargandoComp || cargandoHist
  const profMin = cfg?.profundidad_minima ?? 3

  const rangoRapido = (etiqueta: string, dias: number) => (
    <Button key={etiqueta} size="small" onClick={() => {
      const hoy = new Date()
      const ini = new Date(hoy.getTime() - dias * 86400000)
      setDesde(ini.toISOString().slice(0, 10))
      setHasta(hoy.toISOString().slice(0, 10))
    }} sx={{ textTransform: 'none', fontSize: 12, minWidth: 0, color: EAM_DARK }}>{etiqueta}</Button>
  )

  const generarPDF = () => {
    if (tipo !== 'ESTADO_FLOTA') {
      toast.error('El PDF con esquema de llantas aplica al informe de estado de la flota')
      return
    }
    if (!flota.length) { toast.error('No hay vehículos con esquema de llantas configurado'); return }
    setGenerando(true)
    try {
      generarPDFEstadoFlota({ vehiculos: flota, desde, hasta, profundidadMinima: profMin })
      toast.success(`PDF generado con ${flota.length} vehículo(s)`)
    } catch (e: any) {
      toast.error('No se pudo generar el PDF')
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      setGenerando(false)
    }
  }

  const generarExcel = () => {
    if (tipo === 'ESTADO_FLOTA') {
      const filas = flota.flatMap(v => v.posiciones.map(p => ({
        vehiculo: v.placa || v.codigo,
        posicion: p.numero != null ? `Pos. ${p.numero}` : 'Repuesto',
        posicion_codigo: p.posicion,
        llanta: p.codigo ?? '',
        marca: p.marca ?? '',
        referencia: p.referencia ?? '',
        medida: p.medida ?? '',
        vida: p.vida ?? '',
        profundidad_min: p.profundidad_min ?? '',
        presion: p.presion_psi ?? '',
        ultima_inspeccion: p.fecha_inspeccion ? new Date(p.fecha_inspeccion).toLocaleDateString('es-CO') : '',
        alerta: p.alerta ?? '',
        observaciones: p.observaciones ?? '',
      })))
      if (!filas.length) { toast.error('No hay datos para exportar'); return }
      exportarExcel({
        archivo: 'estado-flota-neumaticos', titulo: 'Estado actual de la flota · Neumáticos',
        columnas: [
          { key: 'vehiculo', header: 'Vehículo' }, { key: 'posicion', header: 'Posición' },
          { key: 'posicion_codigo', header: 'Código posición' }, { key: 'llanta', header: 'Llanta' },
          { key: 'marca', header: 'Marca' }, { key: 'referencia', header: 'Referencia' },
          { key: 'medida', header: 'Medida' }, { key: 'vida', header: 'Vida' },
          { key: 'profundidad_min', header: 'Prof. mín (mm)' }, { key: 'presion', header: 'Presión (psi)' },
          { key: 'ultima_inspeccion', header: 'Últ. inspección' }, { key: 'alerta', header: 'Alerta' },
          { key: 'observaciones', header: 'Observaciones' },
        ],
        filas, color: EAM_COLOR,
      })
      toast.success('Excel generado')
      return
    }
    if (tipo === 'COMPOSICION') {
      if (!composicion.length) { toast.error('No hay datos para exportar'); return }
      exportarExcel({
        archivo: 'composicion-llantas', titulo: 'Composición de llantas a piso',
        columnas: [
          { key: 'grupo', header: 'Agrupación' }, { key: 'valor', header: 'Valor' },
          { key: 'cantidad', header: 'Cantidad' }, { key: 'porcentaje', header: '% del total' },
        ],
        filas: composicion, color: EAM_COLOR,
      })
      toast.success('Excel generado')
      return
    }
    if (!historial.length) { toast.error('No hay inspecciones en el periodo'); return }
    exportarExcel({
      archivo: 'historial-inspecciones', titulo: 'Historial de inspecciones',
      columnas: [
        { key: 'fecha', header: 'Fecha' }, { key: 'codigo', header: 'Llanta' },
        { key: 'vehiculo', header: 'Vehículo' }, { key: 'posicion', header: 'Posición' },
        { key: 'vida', header: 'Vida' }, { key: 'profundidad_min', header: 'Prof. mín (mm)' },
        { key: 'presion_psi', header: 'Presión (psi)' }, { key: 'km_odometro', header: 'Odómetro' },
        { key: 'estado_visual', header: 'Estado visual' }, { key: 'tecnico', header: 'Técnico' },
        { key: 'observaciones', header: 'Observaciones' },
      ],
      filas: historial.map(r => ({ ...r, fecha: r.fecha ? new Date(r.fecha).toLocaleString('es-CO') : '' })),
      color: EAM_COLOR,
    })
    toast.success('Excel generado')
  }

  const criticasTotales = flota.reduce((s, v) => s + v.criticas, 0)

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          <Button onClick={() => navigate('/eam/neumaticos')} startIcon={<BackIcon />} size="small"
            sx={{ color: '#64748B', textTransform: 'none', minWidth: 0 }}>Neumáticos</Button>
          <Divider orientation="vertical" flexItem sx={{ borderColor: '#E5E7EB' }} />
          <Timeline sx={{ color: EAM_COLOR }} />
          <Box>
            <Typography variant="h5" fontWeight={800} color={EAM_DARK}>Reporte de inspecciones</Typography>
            <Typography fontSize={12.5} color="text.secondary">
              Elige el periodo y el tipo de informe, revisa la vista previa y descarga en PDF o Excel
            </Typography>
          </Box>
        </Stack>

        {/* Tipo de informe */}
        <Grid container spacing={2} mb={2}>
          {INFORMES.map(inf => {
            const activo = tipo === inf.id
            return (
              <Grid key={inf.id} size={{ xs: 12, md: 4 }}>
                <Card
                  onClick={() => setTipo(inf.id)}
                  sx={{
                    cursor: 'pointer', height: '100%', bgcolor: '#FFFFFF',
                    border: activo ? `2px solid ${EAM_COLOR}` : '1px solid #E5E7EB',
                    boxShadow: activo ? `0 6px 20px ${alpha(EAM_COLOR, 0.2)}` : undefined,
                    transition: 'border-color .15s, box-shadow .15s',
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" gap={1} mb={0.75}>
                      <Box sx={{ color: activo ? EAM_COLOR : '#94A3B8' }}>{inf.icono}</Box>
                      <Typography fontWeight={700} fontSize={14}>{inf.titulo}</Typography>
                    </Stack>
                    <Typography fontSize={12} color="text.secondary">{inf.descripcion}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {/* Periodo y filtros */}
        <Card sx={{ bgcolor: '#FFFFFF', mb: 2 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'center' }} flexWrap="wrap" useFlexGap>
              <TextField size="small" type="date" label="Desde" value={desde}
                onChange={e => setDesde(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 155 }} />
              <TextField size="small" type="date" label="Hasta" value={hasta}
                onChange={e => setHasta(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 155 }} />
              <Stack direction="row" alignItems="center">
                {rangoRapido('7 días', 7)}{rangoRapido('30 días', 30)}{rangoRapido('90 días', 90)}
              </Stack>
              {tipo !== 'COMPOSICION' && (
                <TextField select size="small" label="Vehículo" value={vehId}
                  onChange={e => setVehId(e.target.value)} sx={{ minWidth: 220 }}>
                  <MenuItem value="">Toda la flota</MenuItem>
                  {vehiculos.map(v => (
                    <MenuItem key={v.id} value={String(v.id)}>{v.placa || v.codigo} — {v.nombre}</MenuItem>
                  ))}
                </TextField>
              )}
              {(desde || hasta || vehId) && (
                <Button size="small" onClick={() => { setDesde(''); setHasta(''); setVehId('') }}
                  sx={{ textTransform: 'none', color: '#64748B' }}>Limpiar</Button>
              )}
              <Box flex={1} />
              {tipo === 'ESTADO_FLOTA' && (
                <Button variant="contained" startIcon={<PictureAsPdf />} disabled={generando || cargando || !flota.length}
                  onClick={generarPDF}
                  sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, textTransform: 'none', fontWeight: 700 }}>
                  {generando ? 'Generando…' : 'Descargar PDF'}
                </Button>
              )}
              <Button variant="contained" startIcon={<Download />} disabled={cargando}
                onClick={generarExcel}
                sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700 }}>
                Descargar Excel
              </Button>
            </Stack>
            {!desde && !hasta && (
              <Typography fontSize={11.5} color="text.secondary" mt={1.5}>
                Sin fechas se toma todo el histórico.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Vista previa */}
        {tipo === 'ESTADO_FLOTA' && (
          <Stack spacing={2}>
            {criticasTotales > 0 && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {criticasTotales} llanta(s) en o bajo la profundidad mínima ({profMin} mm) en el periodo seleccionado.
              </Alert>
            )}
            {flota.length === 0 && !cargando && (
              <Alert severity="info">
                No hay vehículos con esquema de ejes configurado. Asígnales una categoría en
                <b> Neumáticos → Configuración → Ejes y llantas por vehículo</b>.
              </Alert>
            )}
            {flota.map(v => (
              <Card key={v.activo_id} sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1.5}>
                    <Box>
                      <Typography fontWeight={800} fontSize={15}>{v.placa || v.codigo}</Typography>
                      <Typography fontSize={11.5} color="text.secondary">
                        {v.codigo}{v.nombre ? ` · ${v.nombre}` : ''}
                        {v.odometro != null ? ` · ${v.odometro.toLocaleString('es-CO')} km` : ''}
                      </Typography>
                    </Box>
                    <Stack direction="row" gap={0.75}>
                      <Chip size="small" label={`${v.posiciones_ocupadas}/${v.total_posiciones} posiciones`} sx={{ fontSize: 11 }} />
                      {v.criticas > 0 && <Chip size="small" color="error" label={`${v.criticas} crítica(s)`} sx={{ fontSize: 11 }} />}
                    </Stack>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                              {['Pos.', 'Llanta', 'Vida', 'Prof. mín.', 'Últ. inspección'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {v.posiciones.map(p => (
                              <TableRow key={p.posicion} hover>
                                <TableCell sx={{ fontSize: 12 }}>{p.numero != null ? `Pos. ${p.numero}` : 'Repuesto'}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>
                                  {p.codigo ?? <Typography component="span" fontSize={11.5} color="text.disabled">vacía</Typography>}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{p.vida ?? '—'}</TableCell>
                                <TableCell sx={{
                                  fontSize: 12, fontWeight: 700,
                                  color: p.profundidad_min == null ? 'inherit'
                                    : p.profundidad_min <= profMin ? '#DC2626'
                                    : p.profundidad_min <= profMin * 1.5 ? '#D97706' : '#16A34A',
                                }}>
                                  {p.profundidad_min != null ? `${p.profundidad_min} mm` : '—'}
                                </TableCell>
                                <TableCell sx={{ fontSize: 11.5 }}>
                                  {p.fecha_inspeccion ? new Date(p.fecha_inspeccion).toLocaleDateString('es-CO') : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Typography fontSize={12} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mb={0.75}>OBSERVACIONES</Typography>
                      {v.observaciones.length === 0 ? (
                        <Typography fontSize={12} color="text.secondary">Sin observaciones ni alertas en el periodo.</Typography>
                      ) : (
                        <Stack spacing={0.5}>
                          {v.observaciones.map((o, i) => (
                            <Paper key={i} elevation={0} sx={{ p: 1, bgcolor: /mínimo|minimo/i.test(o) ? '#FEF2F2' : '#F8FAFC', borderRadius: 1.5 }}>
                              <Typography fontSize={11.5} color={/mínimo|minimo/i.test(o) ? '#B91C1C' : '#475569'}>{o}</Typography>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {tipo === 'COMPOSICION' && (
          <Grid container spacing={2}>
            {Array.from(new Set(composicion.map(c => c.grupo))).map(grupo => (
              <Grid key={grupo} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
                  <CardContent>
                    <Typography fontWeight={700} mb={1}>{grupo}</Typography>
                    <Stack spacing={0.75}>
                      {composicion.filter(c => c.grupo === grupo).map(c => (
                        <Box key={`${grupo}-${c.valor}`}>
                          <Stack direction="row" justifyContent="space-between" mb={0.25}>
                            <Typography fontSize={12.5}>{c.valor}</Typography>
                            <Typography fontSize={12} fontWeight={700} color={EAM_DARK}>{c.cantidad} · {c.porcentaje}%</Typography>
                          </Stack>
                          <Box sx={{ height: 6, bgcolor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                            <Box sx={{ width: `${c.porcentaje}%`, height: '100%', bgcolor: EAM_COLOR }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {composicion.length === 0 && !cargando && (
              <Grid size={{ xs: 12 }}><Alert severity="info">No hay llantas montadas para calcular la composición.</Alert></Grid>
            )}
          </Grid>
        )}

        {tipo === 'HISTORIAL' && (
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                    {['Fecha', 'Llanta', 'Vehículo', 'Posición', 'Vida', 'Prof. mín.', 'Presión', 'Técnico', 'Observaciones'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historial.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.fecha ? new Date(r.fecha).toLocaleString('es-CO') : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{r.codigo}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.vehiculo ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.posicion ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.vida ?? '—'}</TableCell>
                      <TableCell sx={{
                        fontSize: 12, fontWeight: 700,
                        color: r.profundidad_min == null ? 'inherit' : r.profundidad_min <= profMin ? '#DC2626' : 'inherit',
                      }}>{r.profundidad_min != null ? `${r.profundidad_min} mm` : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.presion_psi != null ? `${r.presion_psi} psi` : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.tecnico ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.observaciones ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {historial.length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" py={3} fontSize={13}>
                        No hay inspecciones registradas en el periodo seleccionado.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        )}
      </Box>
    </Layout>
  )
}
