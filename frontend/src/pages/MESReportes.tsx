import { useMemo, useState, type ReactNode } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Button, Stack, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Assessment, Download } from '@mui/icons-material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Legend, ReferenceLine, Cell,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Orden { id: number; numero: string; producto_id: number; estado: string; cantidad_planificada: number; cantidad_producida: number; cantidad_scrap: number; linea_id?: number | null }
interface ScrapItem { id: number; orden_id: number; tipo: string; causa: string; cantidad: number; costo_total?: number | null; es_reprocesable: boolean }
interface Parada { id: number; ejecucion_id: number; tipo: string; causa: string; duracion_min?: number | null }
interface OEE { id: number; linea_id: number; turno: string; fecha?: string | null; disponibilidad?: number | null; rendimiento?: number | null; calidad?: number | null; oee?: number | null }
interface Linea { id: number; codigo: string; nombre: string }
interface Producto { id: number; codigo: string; nombre: string }

const fmtNum = (n?: number | null) => n != null ? n.toLocaleString('es-CO') : '0'
const umbral = (v: number) => v >= 85 ? 'success' : v >= 60 ? 'warning' : 'error'

export default function MESReportes() {
  const [tab, setTab] = useState(0)

  const { data: ordenes = [] } = useQuery<Orden[]>({ queryKey: ['mes-ordenes'], queryFn: () => api.get('/mes/ordenes').then(r => r.data) })
  const { data: scrap = [] } = useQuery<ScrapItem[]>({ queryKey: ['mes-scrap'], queryFn: () => api.get('/mes/scrap').then(r => r.data) })
  const { data: paradas = [] } = useQuery<Parada[]>({ queryKey: ['mes-paradas-all'], queryFn: () => api.get('/mes/paradas').then(r => r.data) })
  const { data: oee = [] } = useQuery<OEE[]>({ queryKey: ['mes-oee'], queryFn: () => api.get('/mes/oee').then(r => r.data) })
  const { data: lineas = [] } = useQuery<Linea[]>({ queryKey: ['mes-lineas'], queryFn: () => api.get('/mes/lineas').then(r => r.data) })
  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data) })

  const prod = (id: number) => productos.find(p => p.id === id)
  const linea = (id?: number | null) => lineas.find(l => l.id === id)

  // ─── KPIs generales ───────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const cerradas = ordenes.filter(o => o.estado === 'CERRADA').length
    const producidas = ordenes.reduce((s, o) => s + (o.cantidad_producida || 0), 0)
    const scrapTot = ordenes.reduce((s, o) => s + (o.cantidad_scrap || 0), 0)
    const scrapRate = producidas + scrapTot > 0 ? (scrapTot / (producidas + scrapTot) * 100) : 0
    const oeeProm = oee.length ? oee.reduce((s, o) => s + (o.oee || 0), 0) / oee.length : 0
    return { cerradas, producidas, scrapRate, oeeProm }
  }, [ordenes, oee])

  // ─── Reporte 1: cumplimiento de órdenes ────────────────────────────────────
  const cumplimiento = useMemo(() => ordenes.map(o => ({
    numero: o.numero, producto: prod(o.producto_id)?.nombre ?? `#${o.producto_id}`,
    plan: o.cantidad_planificada, producido: o.cantidad_producida, scrap: o.cantidad_scrap, estado: o.estado,
    pct: o.cantidad_planificada > 0 ? Math.round(o.cantidad_producida / o.cantidad_planificada * 100) : 0,
  })), [ordenes, productos])

  // ─── Reporte 2: Pareto de scrap por causa ──────────────────────────────────
  const pareto = useMemo(() => {
    const map = new Map<string, { cantidad: number; costo: number }>()
    for (const s of scrap) {
      const k = s.causa || 'Sin causa'
      const cur = map.get(k) ?? { cantidad: 0, costo: 0 }
      cur.cantidad += s.cantidad || 0; cur.costo += s.costo_total || 0
      map.set(k, cur)
    }
    const arr = [...map.entries()].map(([causa, v]) => ({ causa, ...v })).sort((a, b) => b.cantidad - a.cantidad)
    const total = arr.reduce((s, x) => s + x.cantidad, 0)
    let acum = 0
    return arr.map(x => { acum += x.cantidad; return { ...x, pct: total > 0 ? x.cantidad / total * 100 : 0, acum: total > 0 ? acum / total * 100 : 0 } })
  }, [scrap])
  const costoScrapTotal = useMemo(() => scrap.reduce((s, x) => s + (x.costo_total || 0), 0), [scrap])

  // ─── Reporte 3: paradas por tipo ───────────────────────────────────────────
  const paradasPorTipo = useMemo(() => {
    const map = new Map<string, { conteo: number; minutos: number }>()
    for (const p of paradas) {
      const cur = map.get(p.tipo) ?? { conteo: 0, minutos: 0 }
      cur.conteo += 1; cur.minutos += p.duracion_min || 0
      map.set(p.tipo, cur)
    }
    return [...map.entries()].map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.minutos - a.minutos)
  }, [paradas])
  const minutosParada = paradasPorTipo.reduce((s, x) => s + x.minutos, 0)

  // ─── Reporte 4: OEE por línea ──────────────────────────────────────────────
  const oeePorLinea = useMemo(() => {
    const map = new Map<number, { d: number; r: number; c: number; o: number; n: number }>()
    for (const x of oee) {
      const cur = map.get(x.linea_id) ?? { d: 0, r: 0, c: 0, o: 0, n: 0 }
      cur.d += x.disponibilidad || 0; cur.r += x.rendimiento || 0; cur.c += x.calidad || 0; cur.o += x.oee || 0; cur.n += 1
      map.set(x.linea_id, cur)
    }
    return [...map.entries()].map(([lid, v]) => ({
      linea: linea(lid)?.codigo ?? `L${lid}`,
      disponibilidad: v.n ? +(v.d / v.n).toFixed(1) : 0, rendimiento: v.n ? +(v.r / v.n).toFixed(1) : 0,
      calidad: v.n ? +(v.c / v.n).toFixed(1) : 0, oee: v.n ? +(v.o / v.n).toFixed(1) : 0, registros: v.n,
    }))
  }, [oee, lineas])

  const PARADA_COLOR: Record<string, string> = {
    PLANEADA: '#94A3B8', NO_PLANEADA: '#DC2626', CALIDAD: '#7C3AED', MANTENIMIENTO: '#D97706', SETUP: '#2563EB', MATERIAL: '#0891B2',
  }

  const exportar = (tipo: 'pdf' | 'excel') => {
    let opts: any
    if (tab === 0) opts = { archivo: 'mes-cumplimiento', titulo: 'MES — Cumplimiento de órdenes', color: MES_COLOR,
      columnas: [{ key: 'numero', header: 'Orden' }, { key: 'producto', header: 'Producto' }, { key: 'plan', header: 'Plan' }, { key: 'producido', header: 'Producido' }, { key: 'pct', header: '% Cumpl.' }, { key: 'scrap', header: 'Scrap' }, { key: 'estado', header: 'Estado' }], filas: cumplimiento }
    else if (tab === 1) opts = { archivo: 'mes-pareto-scrap', titulo: 'MES — Pareto de scrap por causa', color: MES_COLOR,
      columnas: [{ key: 'causa', header: 'Causa' }, { key: 'cantidad', header: 'Cantidad' }, { key: 'costo', header: 'Costo' }, { key: 'pct', header: '%' }, { key: 'acum', header: '% acum.' }], filas: pareto.map(x => ({ ...x, costo: Math.round(x.costo), pct: x.pct.toFixed(1), acum: x.acum.toFixed(1) })) }
    else if (tab === 2) opts = { archivo: 'mes-paradas', titulo: 'MES — Paradas por tipo', color: MES_COLOR,
      columnas: [{ key: 'tipo', header: 'Tipo' }, { key: 'conteo', header: 'Eventos' }, { key: 'minutos', header: 'Minutos' }], filas: paradasPorTipo }
    else opts = { archivo: 'mes-oee-linea', titulo: 'MES — OEE por línea', color: MES_COLOR,
      columnas: [{ key: 'linea', header: 'Línea' }, { key: 'disponibilidad', header: 'D%' }, { key: 'rendimiento', header: 'R%' }, { key: 'calidad', header: 'C%' }, { key: 'oee', header: 'OEE%' }], filas: oeePorLinea }
    tipo === 'pdf' ? exportarPDF(opts) : exportarExcel(opts)
  }

  const TABS = ['Cumplimiento de órdenes', 'Pareto de scrap', 'Paradas por tipo', 'OEE por línea']

  return (
    <Layout title="MES · Reportes de Producción">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Assessment sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>Reportes de Producción</Typography>
              <Typography fontSize={12} color="text.secondary">Reportes sobre los registros reales de producción, calidad y eficiencia</Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('pdf')} sx={{ textTransform: 'none' }}>PDF</Button>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('excel')} sx={{ textTransform: 'none' }}>Excel</Button>
          </Stack>
        </Stack>

        {/* KPIs generales */}
        <Grid container spacing={1.5} mb={2.5} className="anim-stagger">
          {[
            { l: 'Órdenes cerradas', v: fmtNum(kpis.cerradas), c: '#0891B2' },
            { l: 'Unidades producidas', v: fmtNum(kpis.producidas), c: '#16A34A' },
            { l: 'Scrap global', v: `${kpis.scrapRate.toFixed(2)}%`, c: kpis.scrapRate > 5 ? '#DC2626' : kpis.scrapRate > 2.5 ? '#D97706' : '#16A34A' },
            { l: 'OEE promedio', v: `${kpis.oeeProm.toFixed(1)}%`, c: kpis.oeeProm >= 85 ? '#16A34A' : kpis.oeeProm >= 60 ? '#D97706' : '#DC2626' },
          ].map(k => (
            <Grid key={k.l} size={{ xs: 6, md: 3 }}>
              <Paper elevation={0} className="hover-lift" sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
                <Typography className="text-gradient" fontSize={26} fontWeight={800} color={k.c} sx={{ fontVariantNumeric: 'tabular-nums' }}>{k.v}</Typography>
                <Typography fontSize={12} fontWeight={600} color="text.secondary">{k.l}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Stack direction="row" gap={1} mb={2.5} flexWrap="wrap">
          {TABS.map((l, i) => (
            <Button key={l} onClick={() => setTab(i)} variant={tab === i ? 'contained' : 'text'} size="small"
              sx={{ textTransform: 'none', fontWeight: 700, ...(tab === i ? { bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } } : { color: 'text.secondary' }) }}>
              {l}
            </Button>
          ))}
        </Stack>

        {/* ── R1: Cumplimiento ── */}
        {tab === 0 && (
          cumplimiento.length === 0 ? <Empty t="órdenes" pagina="Órdenes" /> : (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
                <Typography fontWeight={700} fontSize={13.5} mb={1.5}>Producido vs planificado por orden</Typography>
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={cumplimiento} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                      <XAxis dataKey="numero" fontSize={10} /><YAxis fontSize={11} />
                      <RTooltip /><Legend />
                      <Bar dataKey="plan" name="Planificado" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="producido" name="Producido" fill={MES_COLOR} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
              <TablaWrap heads={['Orden', 'Producto', 'Plan', 'Producido', '% Cumpl.', 'Scrap', 'Estado']}>
                {cumplimiento.map(c => (
                  <TableRow key={c.numero} hover>
                    <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{c.numero}</TableCell>
                    <TableCell>{c.producto}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(c.plan)}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(c.producido)}</TableCell>
                    <TableCell><Chip size="small" label={`${c.pct}%`} color={c.pct >= 98 ? 'success' : c.pct >= 90 ? 'warning' : 'error'} /></TableCell>
                    <TableCell sx={{ color: c.scrap > 0 ? '#DC2626' : 'inherit' }}>{fmtNum(c.scrap)}</TableCell>
                    <TableCell>{c.estado.replace(/_/g, ' ')}</TableCell>
                  </TableRow>
                ))}
              </TablaWrap>
            </Stack>
          )
        )}

        {/* ── R2: Pareto scrap ── */}
        {tab === 1 && (
          pareto.length === 0 ? <Empty t="scrap" pagina="Scrap" /> : (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography fontWeight={700} fontSize={13.5}>Pareto de scrap por causa</Typography>
                  <Typography fontSize={13} fontWeight={700} color="#DC2626">Costo total: ${fmtNum(Math.round(costoScrapTotal))}</Typography>
                </Stack>
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={pareto} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                      <XAxis dataKey="causa" fontSize={10} /><YAxis fontSize={11} />
                      <RTooltip />
                      <Bar dataKey="cantidad" name="Cantidad" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
              <TablaWrap heads={['Causa', 'Cantidad', 'Costo', '% del total', '% acumulado']}>
                {pareto.map(x => (
                  <TableRow key={x.causa} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{x.causa}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(x.cantidad)}</TableCell>
                    <TableCell>${fmtNum(Math.round(x.costo))}</TableCell>
                    <TableCell>{x.pct.toFixed(1)}%</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{x.acum.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TablaWrap>
            </Stack>
          )
        )}

        {/* ── R3: Paradas ── */}
        {tab === 2 && (
          paradasPorTipo.length === 0 ? <Empty t="paradas" pagina="Ejecución" /> : (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography fontWeight={700} fontSize={13.5}>Minutos de parada por tipo</Typography>
                  <Typography fontSize={13} fontWeight={700} color={MES_DARK}>Total: {fmtNum(minutosParada)} min</Typography>
                </Stack>
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={paradasPorTipo} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                      <XAxis dataKey="tipo" fontSize={10} /><YAxis fontSize={11} />
                      <RTooltip />
                      <Bar dataKey="minutos" name="Minutos" radius={[4, 4, 0, 0]}>
                        {paradasPorTipo.map((p, i) => <Cell key={i} fill={PARADA_COLOR[p.tipo] ?? '#64748B'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
              <TablaWrap heads={['Tipo', 'Eventos', 'Minutos', '% del total']}>
                {paradasPorTipo.map(x => (
                  <TableRow key={x.tipo} hover>
                    <TableCell><Chip size="small" label={x.tipo.replace(/_/g, ' ')} sx={{ fontWeight: 700, fontSize: 10, color: PARADA_COLOR[x.tipo] ?? '#64748B', bgcolor: alpha(PARADA_COLOR[x.tipo] ?? '#64748B', 0.12) }} /></TableCell>
                    <TableCell>{x.conteo}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(x.minutos)}</TableCell>
                    <TableCell>{minutosParada > 0 ? (x.minutos / minutosParada * 100).toFixed(1) : '0'}%</TableCell>
                  </TableRow>
                ))}
              </TablaWrap>
            </Stack>
          )
        )}

        {/* ── R4: OEE por línea ── */}
        {tab === 3 && (
          oeePorLinea.length === 0 ? <Empty t="registros OEE" pagina="OEE" /> : (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
                <Typography fontWeight={700} fontSize={13.5} mb={1.5}>OEE promedio por línea</Typography>
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={oeePorLinea} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                      <XAxis dataKey="linea" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} />
                      <RTooltip /><Legend />
                      <ReferenceLine y={85} stroke="#16A34A" strokeDasharray="5 3" label={{ value: 'Clase mundial', fontSize: 10, fill: '#16A34A', position: 'right' }} />
                      <Bar dataKey="oee" name="OEE %" fill={MES_COLOR} radius={[4, 4, 0, 0]}>
                        {oeePorLinea.map((o, i) => <Cell key={i} fill={o.oee >= 85 ? '#16A34A' : o.oee >= 60 ? '#D97706' : '#DC2626'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
              <TablaWrap heads={['Línea', 'Registros', 'Disponibilidad', 'Rendimiento', 'Calidad', 'OEE']}>
                {oeePorLinea.map(x => (
                  <TableRow key={x.linea} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{x.linea}</TableCell>
                    <TableCell>{x.registros}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{x.disponibilidad}%</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{x.rendimiento}%</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{x.calidad}%</TableCell>
                    <TableCell><Chip size="small" label={`${x.oee}%`} color={umbral(x.oee)} /></TableCell>
                  </TableRow>
                ))}
              </TablaWrap>
            </Stack>
          )
        )}
      </Box>
    </Layout>
  )
}

// ─── Helpers de presentación ─────────────────────────────────────────────────
function TablaWrap({ heads, children }: { heads: string[]; children: ReactNode }) {
  return (
    <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
      <Table size="small">
        <TableHead><TableRow>{heads.map(h => <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </Paper>
  )
}

function Empty({ t, pagina }: { t: string; pagina: string }) {
  return (
    <Paper elevation={0} sx={{ p: 5, border: '1px dashed #D1D5DB', borderRadius: '14px', textAlign: 'center', bgcolor: '#FAFAFA' }}>
      <Typography color="text.secondary">Aún no hay registros de {t} — se generan desde <b>MES · {pagina}</b>.</Typography>
    </Paper>
  )
}
