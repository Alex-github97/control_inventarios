import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Card, Button, TextField, alpha, MenuItem, Stack, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip, LinearProgress, Tooltip,
} from '@mui/material'
import {
  Warehouse as WarehouseIcon, Add, DeleteOutline, Save, Download, Inventory2, Bolt,
  Groups, Construction, Devices, RestartAlt,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'

const TX_COLOR = '#369E4D'
const TX_DARK = '#1f6130'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Plataforma {
  id?: number; nombre: string; pais: string; ciudad: string; direccion: string; posicion: string
  m2_totales: number | string; valor_arriendo: number | string; capacidad_pallets: number | string; notas?: string
}
interface CargoRow { cargo: string; cantidad: number | string; salario: number | string; dotacion: number | string; carga_prestacional: number | string }
interface AreaRow { area: string; m2: number | string }
interface ServRow { servicio: string; gasto_total: number | string }
interface EquipoRow { item: string; cantidad: number | string; valor: number | string }
interface Config {
  nomina: { cargos: CargoRow[] }
  arriendo: { areas: AreaRow[] }
  servicios_publicos: { items: ServRow[] }
  maquinaria: { incremento_pct: number | string; items: EquipoRow[] }
  equipos_tecnologicos: { incremento_pct: number | string; items: EquipoRow[] }
  margen_utilidad_pct: number | string
}

const PLATAFORMA_VACIA: Plataforma = {
  nombre: '', pais: 'Colombia', ciudad: '', direccion: '', posicion: '',
  m2_totales: '', valor_arriendo: '', capacidad_pallets: '', notas: '',
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const fmt = (v: number, dec = 0) => v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const money = (v: number) => `$ ${fmt(v)}`

// ─── Cálculo (mismo modelo que el backend) ─────────────────────────────────────
function calcular(p: Plataforma, c: Config) {
  const m2Tot = num(p.m2_totales), arr = num(p.valor_arriendo), pallets = num(p.capacidad_pallets)

  const nomina = c.nomina.cargos.map(x => {
    const base = num(x.salario) + num(x.dotacion) + num(x.carga_prestacional)
    return { ...x, base, total: num(x.cantidad) * base }
  })
  const totalNomina = sum(nomina.map(x => x.total))

  const m2Util = sum(c.arriendo.areas.map(a => num(a.m2)))
  const valorM2 = m2Tot ? arr / m2Tot : 0
  const pctUtil = m2Tot ? m2Util / m2Tot : 0
  const totalArriendo = m2Util * valorM2

  const serv = c.servicios_publicos.items.map(s => ({ ...s, asignado: num(s.gasto_total) * pctUtil }))
  const totalServ = sum(serv.map(s => s.asignado))

  const incMaq = num(c.maquinaria.incremento_pct) / 100
  const maq = c.maquinaria.items.map(m => { const t = num(m.cantidad) * num(m.valor); return { ...m, total: t, totalInc: t * (1 + incMaq) } })
  const totalMaq = sum(maq.map(m => m.totalInc))

  const incEq = num(c.equipos_tecnologicos.incremento_pct) / 100
  const eq = c.equipos_tecnologicos.items.map(e => { const t = num(e.cantidad) * num(e.valor); return { ...e, total: t, totalInc: t * (1 + incEq) } })
  const totalEq = sum(eq.map(e => e.totalInc))

  const totalMensual = totalNomina + totalArriendo + totalServ + totalMaq + totalEq
  const margen = num(c.margen_utilidad_pct) / 100
  const costoPallet = pallets ? totalMensual / pallets : 0
  const cobroPallet = costoPallet * (1 + margen)
  const part = (x: number) => (totalMensual ? x / totalMensual : 0)

  return {
    nomina, totalNomina, m2Util, valorM2, pctUtil, totalArriendo, serv, totalServ,
    maq, totalMaq, eq, totalEq, totalMensual, costoPallet, cobroPallet,
    part: { nomina: part(totalNomina), arriendo: part(totalArriendo), serv: part(totalServ), maq: part(totalMaq), eq: part(totalEq) },
  }
}

// ─── Celda numérica editable compacta ─────────────────────────────────────────
function NumCell({ value, onChange, width = 96, money: isMoney }: { value: number | string; onChange: (v: string) => void; width?: number; money?: boolean }) {
  return (
    <TextField
      value={value === 0 ? '0' : (value ?? '')}
      onChange={e => onChange(e.target.value)}
      variant="standard" size="small"
      InputProps={{ disableUnderline: false, startAdornment: isMoney ? <span style={{ color: '#94A3B8', fontSize: 12, marginRight: 2 }}>$</span> : undefined }}
      sx={{ width, '& input': { textAlign: 'right', fontSize: 12.5, py: 0.3, fontVariantNumeric: 'tabular-nums' } }}
    />
  )
}
function TxtCell({ value, onChange, width = 200 }: { value: string; onChange: (v: string) => void; width?: number }) {
  return (
    <TextField value={value} onChange={e => onChange(e.target.value)} variant="standard" size="small"
      sx={{ width, '& input': { fontSize: 12.5, py: 0.3 } }} />
  )
}

const HEAD_SX = { fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', py: 0.6, borderBottom: `2px solid ${alpha(TX_COLOR, 0.25)}` } as const
const CELL_SX = { py: 0.4, borderBottom: '1px solid #F1F5F9' } as const

function RubroHeader({ icon, titulo, total, part }: { icon: React.ReactNode; titulo: string; total: number; part?: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: alpha(TX_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: TX_DARK }}>{icon}</Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#1E293B', flex: 1 }}>{titulo}</Typography>
      {part !== undefined && <Chip size="small" label={`${fmt(part * 100, 1)}%`} sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha('#64748B', 0.1), color: '#475569' }} />}
      <Typography sx={{ fontSize: 14, fontWeight: 800, color: TX_DARK, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</Typography>
    </Stack>
  )
}

export default function TarifaxAlmacenamiento() {
  const [plataformas, setPlataformas] = useState<Plataforma[]>([])
  const [selId, setSelId] = useState<number | 'nueva'>('nueva')
  const [plat, setPlat] = useState<Plataforma>({ ...PLATAFORMA_VACIA })
  const [config, setConfig] = useState<Config | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    Promise.all([
      apiClient.get<Plataforma[]>('/tarifax/plataformas'),
      apiClient.get<Config>('/tarifax/cotizacion-config'),
    ]).then(([pl, cf]) => {
      setPlataformas(pl.data || [])
      setConfig(cf.data)
      if (pl.data?.length) { setSelId(pl.data[0].id!); setPlat(pl.data[0]) }
    }).catch(() => toast.error('No se pudo cargar la cotización'))
      .finally(() => setCargando(false))
  }, [])

  const seleccionar = (v: number | 'nueva') => {
    setSelId(v)
    if (v === 'nueva') setPlat({ ...PLATAFORMA_VACIA })
    else { const f = plataformas.find(p => p.id === v); if (f) setPlat({ ...f }) }
  }

  const r = useMemo(() => (config ? calcular(plat, config) : null), [plat, config])

  const guardarPlataforma = async () => {
    if (!plat.nombre.trim()) { toast.error('Ponle un nombre a la plataforma'); return }
    setGuardando(true)
    try {
      const payload = {
        ...plat,
        m2_totales: num(plat.m2_totales), valor_arriendo: num(plat.valor_arriendo), capacidad_pallets: num(plat.capacidad_pallets),
      }
      let saved: Plataforma
      if (plat.id) saved = (await apiClient.put<Plataforma>(`/tarifax/plataformas/${plat.id}`, payload)).data
      else saved = (await apiClient.post<Plataforma>('/tarifax/plataformas', payload)).data
      const lista = (await apiClient.get<Plataforma[]>('/tarifax/plataformas')).data || []
      setPlataformas(lista); setSelId(saved.id!); setPlat(saved)
      toast.success('Plataforma guardada')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo guardar') }
    finally { setGuardando(false) }
  }

  const eliminarPlataforma = async () => {
    if (!plat.id) return
    if (!window.confirm(`¿Eliminar la plataforma "${plat.nombre}"?`)) return
    try {
      await apiClient.delete(`/tarifax/plataformas/${plat.id}`)
      const lista = (await apiClient.get<Plataforma[]>('/tarifax/plataformas')).data || []
      setPlataformas(lista)
      if (lista.length) { setSelId(lista[0].id!); setPlat(lista[0]) } else seleccionar('nueva')
      toast.success('Plataforma eliminada')
    } catch { toast.error('No se pudo eliminar') }
  }

  const guardarConfig = async () => {
    if (!config) return
    setGuardando(true)
    try {
      await apiClient.put('/tarifax/cotizacion-config', config)
      toast.success('Configuración de rubros guardada')
    } catch { toast.error('No se pudo guardar la configuración') }
    finally { setGuardando(false) }
  }

  const restaurarConfig = async () => {
    if (!window.confirm('¿Restaurar los rubros a los valores por defecto? (No borra lo guardado hasta que guardes)')) return
    try {
      const def = (await apiClient.post<Config>('/tarifax/cotizacion-config/reset')).data
      setConfig(def); toast.success('Rubros restaurados (recuerda Guardar)')
    } catch { toast.error('No se pudo restaurar') }
  }

  const exportar = async () => {
    if (!config) return
    if (!plat.nombre.trim()) { toast.error('Selecciona o crea una plataforma primero'); return }
    setExportando(true)
    try {
      const res = await apiClient.post<{ filename: string; file_base64: string }>('/tarifax/cotizacion/exportar', { plataforma: plat, config })
      const bytes = atob(res.data.file_base64)
      const arrBuf = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arrBuf[i] = bytes.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([arrBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a'); a.href = url; a.download = res.data.filename; a.click(); URL.revokeObjectURL(url)
    } catch { toast.error('No se pudo exportar') }
    finally { setExportando(false) }
  }

  // Helpers de edición de config
  const setC = (patch: Partial<Config>) => setConfig(c => (c ? { ...c, ...patch } : c))
  const updRow = <T,>(arr: T[], i: number, patch: Partial<T>): T[] => arr.map((x, k) => (k === i ? { ...x, ...patch } : x))

  if (cargando || !config || !r) {
    return <Layout title="TarifaX · Almacenamiento"><LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: TX_COLOR } }} /></Layout>
  }

  return (
    <Layout title="TarifaX · Cotización de Almacenamiento">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${alpha(TX_COLOR, 0.4)}` }}>
          <WarehouseIcon sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Cotización de Almacenamiento</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>Plataformas, rubros configurables y costo/cobro por pallet</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download />} onClick={exportar} disabled={exportando}
          sx={{ color: TX_DARK, borderColor: alpha(TX_COLOR, 0.5), textTransform: 'none', fontWeight: 700, borderRadius: '9px', '&:hover': { borderColor: TX_COLOR, bgcolor: alpha(TX_COLOR, 0.06) } }}>
          {exportando ? 'Generando…' : 'Exportar a Excel'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>
        {/* ── Columna izquierda: plataforma + resumen (sticky) ── */}
        <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Card sx={{ p: 2.5, mb: 2, border: `1px solid ${alpha(TX_COLOR, 0.2)}`, borderRadius: '14px' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>Plataforma</Typography>
            <TextField select fullWidth size="small" label="Plataforma" value={selId}
              onChange={e => seleccionar(e.target.value === 'nueva' ? 'nueva' : Number(e.target.value))} sx={{ mb: 1.5 }}>
              <MenuItem value="nueva">➕ Nueva plataforma…</MenuItem>
              {plataformas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
            </TextField>
            <Stack spacing={1.25}>
              <TextField size="small" label="Nombre" value={plat.nombre} onChange={e => setPlat({ ...plat, nombre: e.target.value })} fullWidth />
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="País" value={plat.pais} onChange={e => setPlat({ ...plat, pais: e.target.value })} sx={{ flex: 1 }} />
                <TextField size="small" label="Ciudad" value={plat.ciudad} onChange={e => setPlat({ ...plat, ciudad: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
              <TextField size="small" label="Dirección" value={plat.direccion} onChange={e => setPlat({ ...plat, direccion: e.target.value })} fullWidth />
              <TextField size="small" label="Posición / Ubicación" placeholder="Zona franca, bodega 4, muelle 2…" value={plat.posicion} onChange={e => setPlat({ ...plat, posicion: e.target.value })} fullWidth />
              <Divider sx={{ my: 0.5 }} />
              <TextField size="small" label="M² totales de la bodega" type="number" value={plat.m2_totales} onChange={e => setPlat({ ...plat, m2_totales: e.target.value })} fullWidth />
              <TextField size="small" label="Valor arriendo mensual" type="number" value={plat.valor_arriendo} onChange={e => setPlat({ ...plat, valor_arriendo: e.target.value })} fullWidth
                InputProps={{ startAdornment: <span style={{ color: '#94A3B8', marginRight: 4 }}>$</span> }} />
              <TextField size="small" label="Capacidad (pallets)" type="number" value={plat.capacidad_pallets} onChange={e => setPlat({ ...plat, capacidad_pallets: e.target.value })} fullWidth />
            </Stack>
            <Box sx={{ mt: 1.5, p: 1.25, borderRadius: '10px', bgcolor: alpha(TX_COLOR, 0.06), display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Valor / m²</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: TX_DARK }}>{money(r.valorM2)}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>% m² utilizado</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{fmt(r.pctUtil * 100, 1)}%</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button fullWidth variant="contained" startIcon={<Save />} onClick={guardarPlataforma} disabled={guardando}
                sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}>Guardar</Button>
              {plat.id && <Tooltip title="Eliminar"><IconButton onClick={eliminarPlataforma} sx={{ color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '9px' }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>}
            </Stack>
          </Card>

          {/* Resumen final */}
          <Card sx={{ p: 2.5, border: `1px solid ${alpha(TX_COLOR, 0.25)}`, borderRadius: '14px', background: `linear-gradient(160deg, ${alpha(TX_COLOR, 0.06)}, #fff)` }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>Resumen</Typography>
            {[
              { l: 'Nómina', v: r.totalNomina, p: r.part.nomina },
              { l: 'Arriendo', v: r.totalArriendo, p: r.part.arriendo },
              { l: 'Servicios públicos', v: r.totalServ, p: r.part.serv },
              { l: 'Maquinaria y equipo', v: r.totalMaq, p: r.part.maq },
              { l: 'Equipos tecnológicos', v: r.totalEq, p: r.part.eq },
            ].map(x => (
              <Stack key={x.l} direction="row" alignItems="center" sx={{ py: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, color: '#475569', flex: 1 }}>{x.l}</Typography>
                <Typography sx={{ fontSize: 10.5, color: '#94A3B8', width: 44, textAlign: 'right', mr: 1 }}>{fmt(x.p * 100, 1)}%</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B', width: 96, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(x.v)}</Typography>
              </Stack>
            ))}
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" alignItems="center" sx={{ py: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', flex: 1 }}>Total mensual</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>{money(r.totalMensual)}</Typography>
            </Stack>
            <Box sx={{ mt: 1, p: 1.5, borderRadius: '12px', bgcolor: alpha(TX_COLOR, 0.1), textAlign: 'center' }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costo por pallet</Typography>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: TX_DARK, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{money(r.costoPallet)}</Typography>
              <Typography sx={{ fontSize: 11, color: '#475569', mt: 0.25 }}>
                {num(plat.capacidad_pallets) > 0 ? `${fmt(num(plat.capacidad_pallets))} pallets` : 'Define la capacidad en pallets ↑'}
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: '#475569', flex: 1 }}>Margen de utilidad</Typography>
              <TextField value={config.margen_utilidad_pct} onChange={e => setC({ margen_utilidad_pct: e.target.value })}
                variant="standard" size="small" sx={{ width: 60, '& input': { textAlign: 'right', fontSize: 13, fontWeight: 700 } }}
                InputProps={{ endAdornment: <span style={{ color: '#94A3B8', fontSize: 12 }}>%</span> }} />
            </Stack>
            <Box sx={{ mt: 1, p: 1.5, borderRadius: '12px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: alpha('#fff', 0.85), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobro sugerido por pallet</Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{money(r.cobroPallet)}</Typography>
            </Box>
          </Card>
        </Box>

        {/* ── Columna derecha: rubros configurables ── */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Card sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12.5, color: '#64748B', flex: 1 }}>
              Edita los rubros y sus valores. Los cambios se reflejan en el resumen al instante. Guarda para conservarlos.
            </Typography>
            <Button size="small" variant="text" startIcon={<RestartAlt />} onClick={restaurarConfig} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 700 }}>Restaurar</Button>
            <Button size="small" variant="contained" startIcon={<Save />} onClick={guardarConfig} disabled={guardando}
              sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}>Guardar rubros</Button>
          </Card>

          {/* NÓMINA */}
          <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
            <RubroHeader icon={<Groups fontSize="small" />} titulo="Nómina" total={r.totalNomina} part={r.part.nomina} />
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead><TableRow>
                  {['Cargo', 'Cant.', 'Salario', 'Dotación', 'Carga prest.', 'Subtotal', ''].map((h, i) =>
                    <TableCell key={h + i} sx={{ ...HEAD_SX, textAlign: i === 0 ? 'left' : 'right' }}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {config.nomina.cargos.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell sx={CELL_SX}><TxtCell value={c.cargo} width={180} onChange={v => setC({ nomina: { cargos: updRow(config.nomina.cargos, i, { cargo: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.cantidad} width={58} onChange={v => setC({ nomina: { cargos: updRow(config.nomina.cargos, i, { cantidad: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.salario} money onChange={v => setC({ nomina: { cargos: updRow(config.nomina.cargos, i, { salario: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.dotacion} money width={82} onChange={v => setC({ nomina: { cargos: updRow(config.nomina.cargos, i, { dotacion: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.carga_prestacional} money onChange={v => setC({ nomina: { cargos: updRow(config.nomina.cargos, i, { carga_prestacional: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{money(r.nomina[i].total)}</TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', px: 0 }}><IconButton size="small" onClick={() => setC({ nomina: { cargos: config.nomina.cargos.filter((_, k) => k !== i) } })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Button size="small" startIcon={<Add />} onClick={() => setC({ nomina: { cargos: [...config.nomina.cargos, { cargo: '', cantidad: 1, salario: 0, dotacion: 0, carga_prestacional: 0 }] } })}
              sx={{ mt: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar cargo</Button>
          </Card>

          {/* ARRIENDO */}
          <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
            <RubroHeader icon={<WarehouseIcon fontSize="small" />} titulo="Arriendo de bodega" total={r.totalArriendo} part={r.part.arriendo} />
            <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 1 }}>
              Distribuye los m² por área. La suma son los <b>m² utilizados</b> ({fmt(r.m2Util)} m²), y el costo = m² utilizados × valor/m² ({money(r.valorM2)}).
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 420 }}>
                <TableHead><TableRow>
                  <TableCell sx={HEAD_SX}>Área</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>M²</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>Costo asignado</TableCell>
                  <TableCell sx={HEAD_SX} />
                </TableRow></TableHead>
                <TableBody>
                  {config.arriendo.areas.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell sx={CELL_SX}><TxtCell value={a.area} width={240} onChange={v => setC({ arriendo: { areas: updRow(config.arriendo.areas, i, { area: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={a.m2} width={80} onChange={v => setC({ arriendo: { areas: updRow(config.arriendo.areas, i, { m2: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>{money(num(a.m2) * r.valorM2)}</TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', px: 0 }}><IconButton size="small" onClick={() => setC({ arriendo: { areas: config.arriendo.areas.filter((_, k) => k !== i) } })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Button size="small" startIcon={<Add />} onClick={() => setC({ arriendo: { areas: [...config.arriendo.areas, { area: '', m2: 0 }] } })}
              sx={{ mt: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar área</Button>
          </Card>

          {/* SERVICIOS PÚBLICOS */}
          <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
            <RubroHeader icon={<Bolt fontSize="small" />} titulo="Servicios públicos" total={r.totalServ} part={r.part.serv} />
            <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 1 }}>Cada servicio se asigna por el % de m² utilizado (<b>{fmt(r.pctUtil * 100, 1)}%</b>).</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 480 }}>
                <TableHead><TableRow>
                  <TableCell sx={HEAD_SX}>Servicio</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>Gasto total</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>Asignado</TableCell>
                  <TableCell sx={HEAD_SX} />
                </TableRow></TableHead>
                <TableBody>
                  {config.servicios_publicos.items.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell sx={CELL_SX}><TxtCell value={s.servicio} width={200} onChange={v => setC({ servicios_publicos: { items: updRow(config.servicios_publicos.items, i, { servicio: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={s.gasto_total} money width={110} onChange={v => setC({ servicios_publicos: { items: updRow(config.servicios_publicos.items, i, { gasto_total: v }) } })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>{money(r.serv[i].asignado)}</TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', px: 0 }}><IconButton size="small" onClick={() => setC({ servicios_publicos: { items: config.servicios_publicos.items.filter((_, k) => k !== i) } })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Button size="small" startIcon={<Add />} onClick={() => setC({ servicios_publicos: { items: [...config.servicios_publicos.items, { servicio: '', gasto_total: 0 }] } })}
              sx={{ mt: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar servicio</Button>
          </Card>

          {/* MAQUINARIA */}
          <EquipoCard
            titulo="Maquinaria y equipo" icon={<Construction fontSize="small" />} total={r.totalMaq} part={r.part.maq}
            incremento={config.maquinaria.incremento_pct} onIncremento={v => setC({ maquinaria: { ...config.maquinaria, incremento_pct: v } })}
            items={config.maquinaria.items} calc={r.maq}
            onItem={(i, patch) => setC({ maquinaria: { ...config.maquinaria, items: updRow(config.maquinaria.items, i, patch) } })}
            onDel={i => setC({ maquinaria: { ...config.maquinaria, items: config.maquinaria.items.filter((_, k) => k !== i) } })}
            onAdd={() => setC({ maquinaria: { ...config.maquinaria, items: [...config.maquinaria.items, { item: '', cantidad: 1, valor: 0 }] } })}
          />

          {/* EQUIPOS TECNOLÓGICOS */}
          <EquipoCard
            titulo="Equipos tecnológicos" icon={<Devices fontSize="small" />} total={r.totalEq} part={r.part.eq}
            incremento={config.equipos_tecnologicos.incremento_pct} onIncremento={v => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, incremento_pct: v } })}
            items={config.equipos_tecnologicos.items} calc={r.eq}
            onItem={(i, patch) => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, items: updRow(config.equipos_tecnologicos.items, i, patch) } })}
            onDel={i => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, items: config.equipos_tecnologicos.items.filter((_, k) => k !== i) } })}
            onAdd={() => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, items: [...config.equipos_tecnologicos.items, { item: '', cantidad: 1, valor: 0 }] } })}
          />
        </Box>
      </Box>
    </Layout>
  )
}

// ─── Tarjeta reutilizable para Maquinaria / Equipos (misma estructura) ─────────
function EquipoCard({ titulo, icon, total, part, incremento, onIncremento, items, calc, onItem, onDel, onAdd }: {
  titulo: string; icon: React.ReactNode; total: number; part: number
  incremento: number | string; onIncremento: (v: string) => void
  items: EquipoRow[]; calc: { total: number; totalInc: number }[]
  onItem: (i: number, patch: Partial<EquipoRow>) => void; onDel: (i: number) => void; onAdd: () => void
}) {
  return (
    <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
      <RubroHeader icon={icon} titulo={titulo} total={total} part={part} />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Inventory2 sx={{ fontSize: 15, color: '#94A3B8' }} />
        <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>Incremento aplicado al total</Typography>
        <TextField value={incremento} onChange={e => onIncremento(e.target.value)} variant="standard" size="small"
          sx={{ width: 54, '& input': { textAlign: 'right', fontSize: 12.5, fontWeight: 700 } }}
          InputProps={{ endAdornment: <span style={{ color: '#94A3B8', fontSize: 12 }}>%</span> }} />
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead><TableRow>
            {['Ítem', 'Cant.', 'Valor', 'Total', 'Total + incr.', ''].map((h, i) =>
              <TableCell key={h + i} sx={{ ...HEAD_SX, textAlign: i === 0 ? 'left' : 'right' }}>{h}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {items.map((m, i) => (
              <TableRow key={i}>
                <TableCell sx={CELL_SX}><TxtCell value={m.item} width={200} onChange={v => onItem(i, { item: v })} /></TableCell>
                <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={m.cantidad} width={64} onChange={v => onItem(i, { cantidad: v })} /></TableCell>
                <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={m.valor} money width={100} onChange={v => onItem(i, { valor: v })} /></TableCell>
                <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, color: '#64748B', whiteSpace: 'nowrap' }}>{money(calc[i].total)}</TableCell>
                <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>{money(calc[i].totalInc)}</TableCell>
                <TableCell sx={{ ...CELL_SX, textAlign: 'right', px: 0 }}><IconButton size="small" onClick={() => onDel(i)} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Button size="small" startIcon={<Add />} onClick={onAdd} sx={{ mt: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar ítem</Button>
    </Card>
  )
}
