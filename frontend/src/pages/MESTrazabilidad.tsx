import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Button, Stack, Card, CardContent, InputAdornment, Divider, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Timeline as TimelineIcon, Search as SearchIcon, Download, VerifiedUser,
  Inventory2, Factory as FactoryIcon, PlaylistAddCheck, PauseCircleOutline,
  FactCheck, DeleteSweep, CallSplit,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarPDF } from '@/utils/exportar'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const ESTADO_LOTE_STYLE: Record<string, { color: string; bg: string }> = {
  ACTIVO:    { color: '#2563EB', bg: '#EFF6FF' },
  BLOQUEADO: { color: '#D97706', bg: '#FFFBEB' },
  LIBERADO:  { color: '#16A34A', bg: '#F0FDF4' },
  CONSUMIDO: { color: '#64748B', bg: '#F1F5F9' },
  VENCIDO:   { color: '#7F1D1D', bg: '#FEF2F2' },
  RECHAZADO: { color: '#DC2626', bg: '#FEF2F2' },
}

const RESULTADO_INSP_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  APROBADO: 'success', RECHAZADO: 'error', CONDICIONAL: 'warning',
}

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface Lote {
  id: number; numero_lote: string; producto_id: number; estado: string
  cantidad: number; unidad_medida: string
}
interface Producto { id: number; codigo: string; nombre: string }
interface Operario { id: number; codigo?: string; nombre: string }
interface Equipo { id: number; codigo?: string; nombre: string }
interface Linea { id: number; codigo?: string; nombre: string }

interface ExpLote {
  id: number; numero_lote: string; estado: string; cantidad: number; unidad_medida: string
  producto_id: number; fecha_fabricacion?: string | null; fecha_vencimiento?: string | null
  fecha_liberacion?: string | null; responsable_liberacion?: string | null
  producto?: { codigo: string; nombre: string } | null
}
interface ExpOrden {
  id: number; numero: string; estado: string
  cantidad_planificada: number; cantidad_producida: number; cantidad_scrap: number
  fecha_inicio_real?: string | null; fecha_fin_real?: string | null; linea_id?: number | null
}
interface ExpEjecucion {
  id: number; estado: string; turno: string; operario_id?: number | null; equipo_id?: number | null
  fecha_inicio?: string | null; fecha_fin?: string | null
  cantidad_producida: number; cantidad_scrap: number
}
interface ExpParada {
  id: number; ejecucion_id: number; tipo: string; causa: string
  fecha_inicio?: string | null; fecha_fin?: string | null; duracion_min?: number | null
}
interface ExpDefecto { codigo_defecto: string; descripcion: string; cantidad: number; causa_raiz?: string | null }
interface ExpInspeccion {
  id: number; tipo: string; resultado: string; operario_id: number
  fecha_inspeccion?: string | null; muestra_tam?: number | null; muestra_defectos: number
  observaciones?: string | null; defectos: ExpDefecto[]
}
interface ExpScrap {
  id: number; tipo: string; causa: string; cantidad: number
  costo_total?: number | null; es_reprocesable: boolean; fecha_registro?: string | null
}
interface ExpConsumo {
  id: number; producto_id: number; lote_id?: number | null
  cantidad_plan: number; cantidad_real: number; fecha_consumo?: string | null
}
interface Expediente {
  lote: ExpLote
  orden: ExpOrden | null
  ejecuciones: ExpEjecucion[]
  paradas: ExpParada[]
  inspecciones: ExpInspeccion[]
  scrap: ExpScrap[]
  consumos: ExpConsumo[]
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
const fmtFecha = (x?: string | null) => (x ? new Date(x).toLocaleString('es-CO') : '—')
const fmtNum = (n?: number | null) => (n === null || n === undefined ? '—' : n.toLocaleString('es-CO'))

function EstadoLoteChip({ estado, size = 'small' }: { estado: string; size?: 'small' | 'medium' }) {
  const st = ESTADO_LOTE_STYLE[estado] ?? { color: '#64748B', bg: '#F1F5F9' }
  return <Chip size={size} label={estado} sx={{ fontWeight: 700, fontSize: size === 'small' ? 10 : 12, color: st.color, bgcolor: st.bg }} />
}

function SeccionCard({ icon, titulo, children }: { icon: JSX.Element; titulo: string; children: React.ReactNode }) {
  return (
    <Card elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px' }}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
          {icon}
          <Typography fontWeight={700} fontSize={14} color={MES_DARK}>{titulo}</Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

const SinRegistros = ({ texto = 'Sin registros' }: { texto?: string }) => (
  <Typography fontSize={12.5} color="text.secondary" sx={{ fontStyle: 'italic', py: 0.5 }}>{texto}</Typography>
)

// ─── Componente principal ────────────────────────────────────────────────────
export default function MESTrazabilidad() {
  const [busca, setBusca] = useState('')
  const [loteSel, setLoteSel] = useState<Lote | null>(null)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: lotes = [], isLoading: cargandoLotes } = useQuery<Lote[]>({
    queryKey: ['mes-lotes'], queryFn: () => api.get('/mes/lotes').then(r => r.data),
  })
  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data),
  })
  const { data: operarios = [] } = useQuery<Operario[]>({
    queryKey: ['mes-operarios'], queryFn: () => api.get('/mes/operarios').then(r => r.data),
  })
  const { data: equipos = [] } = useQuery<Equipo[]>({
    queryKey: ['mes-equipos'], queryFn: () => api.get('/mes/equipos').then(r => r.data),
  })
  const { data: lineas = [] } = useQuery<Linea[]>({
    queryKey: ['mes-lineas'], queryFn: () => api.get('/mes/lineas').then(r => r.data),
  })
  const { data: exp, isLoading: cargandoExp } = useQuery<Expediente>({
    queryKey: ['mes-trazabilidad-lote', loteSel?.id],
    queryFn: () => api.get(`/mes/trazabilidad/lote/${loteSel!.id}`).then(r => r.data),
    enabled: !!loteSel,
  })

  // ─── Resolutores id → nombre ────────────────────────────────────────────────
  const producto = (id?: number | null) => productos.find(p => p.id === id)
  const operario = (id?: number | null) => {
    const o = operarios.find(x => x.id === id)
    return o ? o.nombre : id ? `#${id}` : '—'
  }
  const equipo = (id?: number | null) => {
    const e = equipos.find(x => x.id === id)
    return e ? e.nombre : id ? `#${id}` : '—'
  }
  const nombreLinea = (id?: number | null) => {
    const l = lineas.find(x => x.id === id)
    return l ? l.nombre : id ? `#${id}` : '—'
  }
  const nombreProducto = (id?: number | null) => {
    const p = producto(id)
    return p ? `${p.codigo} — ${p.nombre}` : id ? `#${id}` : '—'
  }

  // ─── Búsqueda ───────────────────────────────────────────────────────────────
  const lotesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lotes
    return lotes.filter(l => {
      const p = producto(l.producto_id)
      return l.numero_lote.toLowerCase().includes(q)
        || (p?.nombre ?? '').toLowerCase().includes(q)
        || (p?.codigo ?? '').toLowerCase().includes(q)
    })
  }, [lotes, busca, productos])

  // ─── Exportación del expediente ─────────────────────────────────────────────
  const exportarExpediente = () => {
    if (!exp || !loteSel) return
    const filas: { seccion: string; detalle: string; fecha: string; dato: string }[] = []
    const L = exp.lote
    const prodTxt = L.producto ? `${L.producto.codigo} — ${L.producto.nombre}` : nombreProducto(L.producto_id)

    filas.push({ seccion: 'Lote', detalle: `Lote ${L.numero_lote} · ${prodTxt}`, fecha: fmtFecha(L.fecha_fabricacion), dato: `Estado ${L.estado} · ${fmtNum(L.cantidad)} ${L.unidad_medida}` })
    if (L.fecha_vencimiento) filas.push({ seccion: 'Lote', detalle: 'Fecha de vencimiento', fecha: fmtFecha(L.fecha_vencimiento), dato: '' })
    if (L.estado === 'LIBERADO') filas.push({ seccion: 'Lote', detalle: `Liberación (ISO 9001 §8.6) — responsable: ${L.responsable_liberacion ?? '—'}`, fecha: fmtFecha(L.fecha_liberacion), dato: 'LIBERADO' })

    if (exp.orden) {
      const o = exp.orden
      filas.push({ seccion: 'Orden de origen', detalle: `Orden ${o.numero} · Línea ${nombreLinea(o.linea_id)}`, fecha: fmtFecha(o.fecha_inicio_real), dato: `Estado ${o.estado} · Plan ${fmtNum(o.cantidad_planificada)} / Prod ${fmtNum(o.cantidad_producida)} / Scrap ${fmtNum(o.cantidad_scrap)}` })
      if (o.fecha_fin_real) filas.push({ seccion: 'Orden de origen', detalle: 'Fin real de la orden', fecha: fmtFecha(o.fecha_fin_real), dato: '' })
    } else {
      filas.push({ seccion: 'Orden de origen', detalle: 'Sin orden asociada', fecha: '', dato: '' })
    }

    exp.ejecuciones.forEach(e => filas.push({
      seccion: 'Ejecuciones',
      detalle: `Ejecución #${e.id} · Turno ${e.turno} · Operario ${operario(e.operario_id)} · Equipo ${equipo(e.equipo_id)}`,
      fecha: `${fmtFecha(e.fecha_inicio)} → ${fmtFecha(e.fecha_fin)}`,
      dato: `Producido ${fmtNum(e.cantidad_producida)} · Scrap ${fmtNum(e.cantidad_scrap)} · ${e.estado}`,
    }))

    exp.paradas.forEach(p => filas.push({
      seccion: 'Paradas',
      detalle: `${p.tipo} — ${p.causa} (ejecución #${p.ejecucion_id})`,
      fecha: `${fmtFecha(p.fecha_inicio)} → ${fmtFecha(p.fecha_fin)}`,
      dato: p.duracion_min !== null && p.duracion_min !== undefined ? `${fmtNum(p.duracion_min)} min` : '',
    }))

    exp.inspecciones.forEach(i => {
      filas.push({
        seccion: 'Inspecciones',
        detalle: `${i.tipo.replace(/_/g, ' ')} · Inspector ${operario(i.operario_id)}${i.observaciones ? ` · ${i.observaciones}` : ''}`,
        fecha: fmtFecha(i.fecha_inspeccion),
        dato: `${i.resultado} · Muestra ${i.muestra_tam ?? '—'} / Defectos ${fmtNum(i.muestra_defectos)}`,
      })
      i.defectos.forEach(d => filas.push({
        seccion: 'Inspecciones · Defectos',
        detalle: `${d.codigo_defecto} — ${d.descripcion}${d.causa_raiz ? ` · Causa raíz: ${d.causa_raiz}` : ''}`,
        fecha: '',
        dato: `Cantidad ${fmtNum(d.cantidad)}`,
      }))
    })

    exp.scrap.forEach(s => filas.push({
      seccion: 'Scrap',
      detalle: `${s.tipo} — ${s.causa}${s.es_reprocesable ? ' · Reprocesable' : ''}`,
      fecha: fmtFecha(s.fecha_registro),
      dato: `Cantidad ${fmtNum(s.cantidad)}${s.costo_total ? ` · $${fmtNum(s.costo_total)}` : ''}`,
    }))

    exp.consumos.forEach(c => filas.push({
      seccion: 'Consumos de materiales',
      detalle: `${nombreProducto(c.producto_id)}${c.lote_id ? ` · Lote insumo #${c.lote_id}` : ''}`,
      fecha: fmtFecha(c.fecha_consumo),
      dato: `Plan ${fmtNum(c.cantidad_plan)} / Real ${fmtNum(c.cantidad_real)}`,
    }))

    exportarPDF({
      archivo: `expediente-lote-${L.numero_lote}`,
      titulo: `Expediente de trazabilidad — Lote ${L.numero_lote}`,
      subtitulo: `${prodTxt} · Estado: ${L.estado} · ISO 9001 §8.5.2 Identificación y trazabilidad`,
      color: MES_COLOR,
      columnas: [
        { key: 'seccion', header: 'Sección' },
        { key: 'detalle', header: 'Detalle' },
        { key: 'fecha', header: 'Fecha' },
        { key: 'dato', header: 'Dato' },
      ],
      filas,
    })
    toast.success(`Expediente del lote ${L.numero_lote} exportado`)
  }

  const L = exp?.lote

  return (
    <Layout title="MES · Trazabilidad de Lotes">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* ── Header ── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <TimelineIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>Trazabilidad de Lotes</Typography>
              <Typography fontSize={12} color="text.secondary">
                Expediente completo del lote: orden, ejecuciones, paradas, calidad y scrap · ISO 9001 §8.5.2
              </Typography>
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<Download />} disabled={!loteSel || !exp} onClick={exportarExpediente}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Exportar expediente (PDF)
          </Button>
        </Stack>

        <Grid container spacing={2.5}>
          {/* ── Panel izquierdo: lotes ── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField size="small" fullWidth placeholder="Buscar por número de lote o producto…"
              value={busca} onChange={e => setBusca(e.target.value)} sx={{ mb: 1.5, bgcolor: '#FFFFFF', borderRadius: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />

            <Stack spacing={1} sx={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', pr: 0.5 }}>
              {lotesFiltrados.map(l => {
                const sel = loteSel?.id === l.id
                const p = producto(l.producto_id)
                return (
                  <Card key={l.id} elevation={0} onClick={() => setLoteSel(l)}
                    sx={{
                      cursor: 'pointer', borderRadius: '12px',
                      border: `1.5px solid ${sel ? MES_COLOR : '#E5E7EB'}`,
                      bgcolor: sel ? alpha(MES_COLOR, 0.05) : '#FFFFFF',
                      transition: 'border-color .15s, background-color .15s',
                      '&:hover': { borderColor: MES_COLOR },
                    }}>
                    <CardContent sx={{ py: 1.25, px: 1.75, '&:last-child': { pb: 1.25 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontSize={13.5} fontWeight={700} color={MES_DARK} noWrap>{l.numero_lote}</Typography>
                          <Typography fontSize={11.5} color="text.secondary" noWrap>
                            {p ? `${p.codigo} — ${p.nombre}` : `Producto #${l.producto_id}`}
                          </Typography>
                          <Typography fontSize={11} color="text.secondary">
                            {fmtNum(l.cantidad)} {l.unidad_medida}
                          </Typography>
                        </Box>
                        <EstadoLoteChip estado={l.estado} />
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
              {lotesFiltrados.length === 0 && (
                <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
                  <Typography fontSize={13} color="text.secondary">
                    {cargandoLotes ? 'Cargando lotes…' : 'No hay lotes que coincidan con la búsqueda.'}
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Grid>

          {/* ── Panel derecho: expediente ── */}
          <Grid size={{ xs: 12, md: 8 }}>
            {!loteSel && (
              <Paper elevation={0} sx={{
                p: 6, textAlign: 'center', borderRadius: '14px', bgcolor: '#FFFFFF',
                border: '2px dashed #CBD5E1',
              }}>
                <TimelineIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                <Typography fontSize={15} fontWeight={600} color="text.secondary">
                  Seleccione un lote para ver su expediente completo
                </Typography>
                <Typography fontSize={12.5} color="text.secondary" mt={0.5}>
                  Identificación y trazabilidad del producto a lo largo de la producción — ISO 9001 §8.5.2
                </Typography>
              </Paper>
            )}

            {loteSel && cargandoExp && (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '14px', bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <Typography fontSize={13.5} color="text.secondary">Cargando expediente del lote {loteSel.numero_lote}…</Typography>
              </Paper>
            )}

            {loteSel && exp && L && (
              <Stack spacing={2}>
                {/* 1. Ficha del lote */}
                <Card elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.35)}`, borderRadius: '14px' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
                      <Stack direction="row" alignItems="center" gap={1.5}>
                        <Inventory2 sx={{ color: MES_COLOR, fontSize: 30 }} />
                        <Box>
                          <Typography fontSize={22} fontWeight={800} color={MES_DARK} sx={{ lineHeight: 1.2 }}>
                            {L.numero_lote}
                          </Typography>
                          <Typography fontSize={12.5} color="text.secondary">
                            {L.producto ? `${L.producto.codigo} — ${L.producto.nombre}` : nombreProducto(L.producto_id)}
                          </Typography>
                        </Box>
                      </Stack>
                      <EstadoLoteChip estado={L.estado} size="medium" />
                    </Stack>

                    <Divider sx={{ my: 1.75 }} />

                    <Grid container spacing={2}>
                      {[
                        ['Cantidad', `${fmtNum(L.cantidad)} ${L.unidad_medida}`],
                        ['Fabricación', fmtFecha(L.fecha_fabricacion)],
                        ['Vencimiento', fmtFecha(L.fecha_vencimiento)],
                      ].map(([lbl, v]) => (
                        <Grid key={lbl} size={{ xs: 6, sm: 4 }}>
                          <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase">{lbl}</Typography>
                          <Typography fontSize={13.5} fontWeight={600}>{v}</Typography>
                        </Grid>
                      ))}
                    </Grid>

                    {L.estado === 'LIBERADO' && (
                      <Paper elevation={0} sx={{ mt: 2, p: 1.5, borderRadius: '10px', bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                        <Stack direction="row" alignItems="center" gap={1.25}>
                          <VerifiedUser sx={{ color: '#16A34A', fontSize: 26 }} />
                          <Box>
                            <Typography fontSize={12.5} fontWeight={800} color="#166534">
                              LOTE LIBERADO — Sello de liberación (ISO 9001 §8.6)
                            </Typography>
                            <Typography fontSize={12} color="#166534">
                              {fmtFecha(L.fecha_liberacion)} · Responsable: <b>{L.responsable_liberacion ?? '—'}</b>
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Orden de origen */}
                <SeccionCard icon={<FactoryIcon sx={{ color: MES_COLOR, fontSize: 20 }} />} titulo="Orden de origen">
                  {exp.orden ? (
                    <Grid container spacing={2}>
                      {([
                        ['Número', <Typography key="n" fontSize={13.5} fontWeight={700} color={MES_DARK}>{exp.orden.numero}</Typography>],
                        ['Estado', <Chip key="e" size="small" label={exp.orden.estado.replace(/_/g, ' ')} sx={{ fontWeight: 700, fontSize: 10, color: MES_DARK, bgcolor: alpha(MES_COLOR, 0.12) }} />],
                        ['Línea', <Typography key="l" fontSize={13.5} fontWeight={600}>{nombreLinea(exp.orden.linea_id)}</Typography>],
                        ['Planificado', <Typography key="p" fontSize={13.5} fontWeight={600}>{fmtNum(exp.orden.cantidad_planificada)}</Typography>],
                        ['Producido', <Typography key="pr" fontSize={13.5} fontWeight={600}>{fmtNum(exp.orden.cantidad_producida)}</Typography>],
                        ['Scrap', <Typography key="s" fontSize={13.5} fontWeight={600} color={exp.orden.cantidad_scrap > 0 ? '#DC2626' : 'inherit'}>{fmtNum(exp.orden.cantidad_scrap)}</Typography>],
                        ['Inicio real', <Typography key="i" fontSize={13.5} fontWeight={600}>{fmtFecha(exp.orden.fecha_inicio_real)}</Typography>],
                        ['Fin real', <Typography key="f" fontSize={13.5} fontWeight={600}>{fmtFecha(exp.orden.fecha_fin_real)}</Typography>],
                      ] as [string, JSX.Element][]).map(([lbl, v]) => (
                        <Grid key={lbl} size={{ xs: 6, sm: 3 }}>
                          <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase">{lbl}</Typography>
                          {v}
                        </Grid>
                      ))}
                    </Grid>
                  ) : <SinRegistros texto="Sin orden asociada al lote" />}
                </SeccionCard>

                {/* 3. Línea de tiempo de ejecuciones */}
                <SeccionCard icon={<PlaylistAddCheck sx={{ color: MES_COLOR, fontSize: 20 }} />} titulo={`Línea de tiempo de ejecuciones (${exp.ejecuciones.length})`}>
                  {exp.ejecuciones.length > 0 ? (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['ID', 'Turno', 'Operario', 'Equipo', 'Inicio', 'Fin', 'Producido', 'Scrap'].map(h =>
                              <TableCell key={h} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{h}</TableCell>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {exp.ejecuciones.map(e => (
                            <TableRow key={e.id} hover>
                              <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>#{e.id}</TableCell>
                              <TableCell>{e.turno}</TableCell>
                              <TableCell>{operario(e.operario_id)}</TableCell>
                              <TableCell>{equipo(e.equipo_id)}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(e.fecha_inicio)}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(e.fecha_fin)}</TableCell>
                              <TableCell>{fmtNum(e.cantidad_producida)}</TableCell>
                              <TableCell sx={{ color: e.cantidad_scrap > 0 ? '#DC2626' : 'inherit', fontWeight: e.cantidad_scrap > 0 ? 700 : 400 }}>
                                {fmtNum(e.cantidad_scrap)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  ) : <SinRegistros />}
                </SeccionCard>

                {/* 4. Paradas */}
                <SeccionCard icon={<PauseCircleOutline sx={{ color: MES_COLOR, fontSize: 20 }} />} titulo={`Paradas (${exp.paradas.length})`}>
                  {exp.paradas.length > 0 ? (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Tipo', 'Causa', 'Ejecución', 'Inicio', 'Fin', 'Duración (min)'].map(h =>
                              <TableCell key={h} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{h}</TableCell>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {exp.paradas.map(p => (
                            <TableRow key={p.id} hover>
                              <TableCell>
                                <Chip size="small" label={p.tipo.replace(/_/g, ' ')}
                                  sx={{ fontWeight: 700, fontSize: 10, color: '#D97706', bgcolor: '#FFFBEB' }} />
                              </TableCell>
                              <TableCell>{p.causa}</TableCell>
                              <TableCell>#{p.ejecucion_id}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(p.fecha_inicio)}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(p.fecha_fin)}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{fmtNum(p.duracion_min)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  ) : <SinRegistros />}
                </SeccionCard>

                {/* 5. Inspecciones de calidad */}
                <SeccionCard icon={<FactCheck sx={{ color: MES_COLOR, fontSize: 20 }} />} titulo={`Inspecciones de calidad (${exp.inspecciones.length})`}>
                  {exp.inspecciones.length > 0 ? (
                    <Stack spacing={1.5}>
                      {exp.inspecciones.map(i => (
                        <Paper key={i.id} elevation={0} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#FAFBFC' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Typography fontSize={13} fontWeight={700}>{i.tipo.replace(/_/g, ' ')}</Typography>
                              <Chip size="small" label={i.resultado} color={RESULTADO_INSP_COLOR[i.resultado] ?? 'default'} sx={{ fontWeight: 700, fontSize: 10 }} />
                            </Stack>
                            <Typography fontSize={11.5} color="text.secondary">{fmtFecha(i.fecha_inspeccion)}</Typography>
                          </Stack>
                          <Typography fontSize={12} color="text.secondary" mt={0.5}>
                            Inspector: <b>{operario(i.operario_id)}</b> · Muestra: {i.muestra_tam ?? '—'} · Defectos:{' '}
                            <b style={{ color: i.muestra_defectos > 0 ? '#DC2626' : undefined }}>{fmtNum(i.muestra_defectos)}</b>
                          </Typography>
                          {i.observaciones && (
                            <Typography fontSize={12} color="text.secondary" mt={0.25} sx={{ fontStyle: 'italic' }}>
                              Obs.: {i.observaciones}
                            </Typography>
                          )}
                          {i.defectos.length > 0 && (
                            <Box mt={1}>
                              <Typography fontSize={11} fontWeight={700} color="#94A3B8" textTransform="uppercase">Defectos encontrados</Typography>
                              <Stack spacing={0.5} mt={0.5}>
                                {i.defectos.map((d, ix) => (
                                  <Stack key={ix} direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
                                    <Chip size="small" label={d.codigo_defecto} sx={{ fontWeight: 700, fontSize: 10, color: '#DC2626', bgcolor: '#FEF2F2' }} />
                                    <Typography fontSize={12}>{d.descripcion} · <b>{fmtNum(d.cantidad)}</b></Typography>
                                    {d.causa_raiz && <Typography fontSize={11.5} color="text.secondary">Causa raíz: {d.causa_raiz}</Typography>}
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  ) : <SinRegistros />}
                </SeccionCard>

                {/* 6. Scrap */}
                <SeccionCard icon={<DeleteSweep sx={{ color: MES_COLOR, fontSize: 20 }} />} titulo={`Scrap (${exp.scrap.length})`}>
                  {exp.scrap.length > 0 ? (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Tipo', 'Causa', 'Cantidad', 'Costo', 'Reprocesable', 'Fecha'].map(h =>
                              <TableCell key={h} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{h}</TableCell>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {exp.scrap.map(s => (
                            <TableRow key={s.id} hover>
                              <TableCell>
                                <Chip size="small" label={s.tipo.replace(/_/g, ' ')}
                                  sx={{ fontWeight: 700, fontSize: 10, color: '#DC2626', bgcolor: '#FEF2F2' }} />
                              </TableCell>
                              <TableCell>{s.causa}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{fmtNum(s.cantidad)}</TableCell>
                              <TableCell>{s.costo_total ? `$${fmtNum(s.costo_total)}` : '—'}</TableCell>
                              <TableCell>{s.es_reprocesable ? 'Sí' : 'No'}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(s.fecha_registro)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  ) : <SinRegistros />}
                </SeccionCard>

                {/* 7. Consumos de materiales (trazabilidad hacia atrás) */}
                <SeccionCard icon={<CallSplit sx={{ color: MES_COLOR, fontSize: 20 }} />} titulo={`Consumos de materiales (${exp.consumos.length})`}>
                  {exp.consumos.length > 0 ? (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Material', 'Lote insumo', 'Cant. plan', 'Cant. real', 'Fecha consumo'].map(h =>
                              <TableCell key={h} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{h}</TableCell>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {exp.consumos.map(c => (
                            <TableRow key={c.id} hover>
                              <TableCell>{nombreProducto(c.producto_id)}</TableCell>
                              <TableCell>{c.lote_id ? `#${c.lote_id}` : '—'}</TableCell>
                              <TableCell>{fmtNum(c.cantidad_plan)}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{fmtNum(c.cantidad_real)}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(c.fecha_consumo)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  ) : <SinRegistros />}
                </SeccionCard>
              </Stack>
            )}
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
