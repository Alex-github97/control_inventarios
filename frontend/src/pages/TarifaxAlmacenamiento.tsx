import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Card, Button, TextField, alpha, MenuItem, Stack, Divider, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip, LinearProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
} from '@mui/material'
import {
  Warehouse as WarehouseIcon, Add, DeleteOutline, Save, Download, PictureAsPdf,
  Bolt, Groups, Construction, Devices, RestartAlt, Tune, Edit as EditIcon, Close, Straighten,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'

const TX_COLOR = '#369E4D'
const TX_DARK = '#1f6130'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AreaRow { area: string; m2: number | string }
interface Plataforma {
  id?: number; nombre: string; pais: string; ciudad: string; direccion: string; posicion: string
  m2_totales: number | string; valor_arriendo: number | string; capacidad_posiciones: number | string
  areas: AreaRow[]; notas?: string
}
interface CargoRow { cargo: string; cantidad: number | string; salario: number | string; dotacion: number | string; carga_prestacional: number | string }
interface ServRow { servicio: string; gasto_total: number | string }
interface EquipoRow { item: string; cantidad: number | string; valor: number | string }
interface Parametros {
  pallet_largo_m: number | string; pallet_ancho_m: number | string; margen_utilidad_pct: number | string
  ipc_pct: number | string; smlv: number | string; aux_transporte: number | string; hr_mensuales: number | string
}
interface Config {
  parametros: Parametros
  nomina: { cargos: CargoRow[] }
  servicios_publicos: { items: ServRow[] }
  maquinaria: { incremento_pct: number | string; items: EquipoRow[] }
  equipos_tecnologicos: { incremento_pct: number | string; items: EquipoRow[] }
}
interface Cliente { nombre: string; nit: string; contacto: string }

const AREAS_DEFAULT: AreaRow[] = [
  { area: 'Almacenamiento', m2: 0 }, { area: 'Transito (alistamiento - Cross)', m2: 0 },
  { area: 'Muelle (recibo - despacho)', m2: 0 }, { area: 'Patio de maniobras', m2: 0 },
  { area: 'Devoluciones', m2: 0 }, { area: 'Despacho ruta nacional', m2: 0 }, { area: 'Area maquila', m2: 0 },
]
const PLATAFORMA_VACIA: Plataforma = {
  nombre: '', pais: 'Colombia', ciudad: '', direccion: '', posicion: '',
  m2_totales: '', valor_arriendo: '', capacidad_posiciones: '', areas: AREAS_DEFAULT.map(a => ({ ...a })), notas: '',
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
  const m2Tot = num(p.m2_totales), arr = num(p.valor_arriendo), posiciones = num(p.capacidad_posiciones)

  const nomina = c.nomina.cargos.map(x => {
    const base = num(x.salario) + num(x.dotacion) + num(x.carga_prestacional)
    return { ...x, base, total: num(x.cantidad) * base }
  })
  const totalNomina = sum(nomina.map(x => x.total))

  const m2Util = sum(p.areas.map(a => num(a.m2)))
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

  const totalOperacion = totalNomina + totalArriendo + totalServ + totalMaq + totalEq
  const margen = num(c.parametros.margen_utilidad_pct) / 100
  const valorPosicion = posiciones ? totalOperacion / posiciones : 0
  const cobroPosicion = valorPosicion * (1 + margen)
  const m2PorPosicion = posiciones ? m2Util / posiciones : 0
  const part = (x: number) => (totalOperacion ? x / totalOperacion : 0)

  return {
    nomina, totalNomina, m2Util, valorM2, pctUtil, totalArriendo, serv, totalServ,
    maq, totalMaq, eq, totalEq, totalOperacion, valorPosicion, cobroPosicion, posiciones, m2PorPosicion,
    part: { nomina: part(totalNomina), arriendo: part(totalArriendo), serv: part(totalServ), maq: part(totalMaq), eq: part(totalEq) },
  }
}

// ─── Celdas / helpers de UI ────────────────────────────────────────────────────
function NumCell({ value, onChange, width = 96, money: isMoney }: { value: number | string; onChange: (v: string) => void; width?: number; money?: boolean }) {
  return (
    <TextField value={value === 0 ? '0' : (value ?? '')} onChange={e => onChange(e.target.value)}
      variant="standard" size="small"
      InputProps={{ startAdornment: isMoney ? <span style={{ color: '#94A3B8', fontSize: 12, marginRight: 2 }}>$</span> : undefined }}
      sx={{ width, '& input': { textAlign: 'right', fontSize: 12.5, py: 0.3, fontVariantNumeric: 'tabular-nums' } }} />
  )
}
function TxtCell({ value, onChange, width = 200 }: { value: string; onChange: (v: string) => void; width?: number }) {
  return <TextField value={value} onChange={e => onChange(e.target.value)} variant="standard" size="small" sx={{ width, '& input': { fontSize: 12.5, py: 0.3 } }} />
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

const descargarBlob = (b64: string, filename: string, mime: string) => {
  const bytes = atob(b64); const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([arr], { type: mime }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

export default function TarifaxAlmacenamiento() {
  const [plataformas, setPlataformas] = useState<Plataforma[]>([])
  const [selId, setSelId] = useState<number | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [cliente, setCliente] = useState<Cliente>({ nombre: '', nit: '', contacto: '' })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exportando, setExportando] = useState<'' | 'excel' | 'pdf'>('')

  // Diálogo de plataforma
  const [dlgOpen, setDlgOpen] = useState(false)
  const [draft, setDraft] = useState<Plataforma>({ ...PLATAFORMA_VACIA })

  useEffect(() => {
    Promise.all([
      apiClient.get<Plataforma[]>('/tarifax/plataformas'),
      apiClient.get<Config>('/tarifax/cotizacion-config'),
    ]).then(([pl, cf]) => {
      setPlataformas(pl.data || [])
      setConfig(cf.data)
      if (pl.data?.length) setSelId(pl.data[0].id!)
    }).catch(() => toast.error('No se pudo cargar la cotización'))
      .finally(() => setCargando(false))
  }, [])

  const plat = useMemo(() => plataformas.find(p => p.id === selId) || null, [plataformas, selId])
  const r = useMemo(() => (plat && config ? calcular(plat, config) : null), [plat, config])

  const recargarPlataformas = async (focusId?: number) => {
    const lista = (await apiClient.get<Plataforma[]>('/tarifax/plataformas')).data || []
    setPlataformas(lista)
    if (focusId) setSelId(focusId)
    else if (!lista.find(p => p.id === selId)) setSelId(lista[0]?.id ?? null)
  }

  // ── Diálogo plataforma ──
  const abrirNueva = () => { setDraft({ ...PLATAFORMA_VACIA, areas: AREAS_DEFAULT.map(a => ({ ...a })) }); setDlgOpen(true) }
  const abrirEditar = () => { if (plat) { setDraft(JSON.parse(JSON.stringify(plat))); setDlgOpen(true) } }
  const guardarDraft = async () => {
    if (!draft.nombre.trim()) { toast.error('Ponle un nombre a la plataforma'); return }
    setGuardando(true)
    try {
      const payload = {
        ...draft,
        m2_totales: num(draft.m2_totales), valor_arriendo: num(draft.valor_arriendo), capacidad_posiciones: num(draft.capacidad_posiciones),
        areas: draft.areas.map(a => ({ area: a.area, m2: num(a.m2) })),
      }
      const saved = draft.id
        ? (await apiClient.put<Plataforma>(`/tarifax/plataformas/${draft.id}`, payload)).data
        : (await apiClient.post<Plataforma>('/tarifax/plataformas', payload)).data
      await recargarPlataformas(saved.id!)
      setDlgOpen(false)
      toast.success('Plataforma guardada')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo guardar') }
    finally { setGuardando(false) }
  }
  const eliminar = async () => {
    if (!plat?.id) return
    if (!window.confirm(`¿Eliminar la plataforma "${plat.nombre}"?`)) return
    try { await apiClient.delete(`/tarifax/plataformas/${plat.id}`); await recargarPlataformas(); toast.success('Plataforma eliminada') }
    catch { toast.error('No se pudo eliminar') }
  }

  // ── Config ──
  const setC = (patch: Partial<Config>) => setConfig(c => (c ? { ...c, ...patch } : c))
  const setPar = (patch: Partial<Parametros>) => setConfig(c => (c ? { ...c, parametros: { ...c.parametros, ...patch } } : c))
  const updRow = <T,>(arr: T[], i: number, patch: Partial<T>): T[] => arr.map((x, k) => (k === i ? { ...x, ...patch } : x))

  const guardarConfig = async () => {
    if (!config) return
    setGuardando(true)
    try { await apiClient.put('/tarifax/cotizacion-config', config); toast.success('Inputs y rubros guardados') }
    catch { toast.error('No se pudo guardar la configuración') }
    finally { setGuardando(false) }
  }
  const restaurarConfig = async () => {
    if (!window.confirm('¿Restaurar los inputs y rubros a los valores por defecto? (Se aplica al guardar)')) return
    try { const def = (await apiClient.post<Config>('/tarifax/cotizacion-config/reset')).data; setConfig(def); toast.success('Restaurado (recuerda Guardar)') }
    catch { toast.error('No se pudo restaurar') }
  }

  const exportar = async (tipo: 'excel' | 'pdf') => {
    if (!config || !plat) { toast.error('Selecciona o crea una plataforma primero'); return }
    setExportando(tipo)
    try {
      const path = tipo === 'pdf' ? '/tarifax/cotizacion/pdf' : '/tarifax/cotizacion/exportar'
      const res = await apiClient.post<{ filename: string; file_base64: string }>(path, { plataforma: plat, config, cliente })
      descargarBlob(res.data.file_base64, res.data.filename,
        tipo === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    } catch { toast.error(`No se pudo generar el ${tipo === 'pdf' ? 'PDF' : 'Excel'}`) }
    finally { setExportando('') }
  }

  if (cargando || !config) {
    return <Layout title="TarifaX · Almacenamiento"><LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: TX_COLOR } }} /></Layout>
  }

  const m2DraftUtil = sum(draft.areas.map(a => num(a.m2)))
  const draftValorM2 = num(draft.m2_totales) ? num(draft.valor_arriendo) / num(draft.m2_totales) : 0
  const draftPct = num(draft.m2_totales) ? m2DraftUtil / num(draft.m2_totales) : 0

  return (
    <Layout title="TarifaX · Cotización de Almacenamiento">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${alpha(TX_COLOR, 0.4)}` }}>
          <WarehouseIcon sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Cotización de Almacenamiento</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>Plataformas, inputs pre-configurados y valor por posición · cotización formal en PDF</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download />} onClick={() => exportar('excel')} disabled={!!exportando || !plat}
          sx={{ color: TX_DARK, borderColor: alpha(TX_COLOR, 0.5), textTransform: 'none', fontWeight: 700, borderRadius: '9px', '&:hover': { borderColor: TX_COLOR, bgcolor: alpha(TX_COLOR, 0.06) } }}>
          {exportando === 'excel' ? 'Generando…' : 'Excel'}
        </Button>
        <Button variant="contained" startIcon={<PictureAsPdf />} onClick={() => exportar('pdf')} disabled={!!exportando || !plat}
          sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}>
          {exportando === 'pdf' ? 'Generando…' : 'Cotización PDF'}
        </Button>
      </Box>

      {plataformas.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', border: `2px dashed ${alpha(TX_COLOR, 0.35)}`, borderRadius: '14px', mb: 2 }}>
          <WarehouseIcon sx={{ fontSize: 40, color: alpha(TX_COLOR, 0.4) }} />
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1E293B', mt: 1 }}>Aún no tienes plataformas</Typography>
          <Typography sx={{ fontSize: 13, color: '#64748B', mb: 2 }}>Crea tu primera bodega/plataforma para empezar a cotizar.</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={abrirNueva} sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Crear plataforma</Button>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>
        {/* ── Columna izquierda ── */}
        <Box sx={{ width: { xs: '100%', lg: 370 }, flexShrink: 0, position: { lg: 'sticky' }, top: { lg: 16 } }}>
          {/* Selección de plataforma */}
          <Card sx={{ p: 2.25, mb: 2, border: `1px solid ${alpha(TX_COLOR, 0.2)}`, borderRadius: '14px' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', flex: 1 }}>Plataforma a cotizar</Typography>
              <Tooltip title="Nueva plataforma"><IconButton size="small" onClick={abrirNueva} sx={{ color: TX_DARK, bgcolor: alpha(TX_COLOR, 0.1), borderRadius: '8px' }}><Add fontSize="small" /></IconButton></Tooltip>
            </Stack>
            <TextField select fullWidth size="small" value={selId ?? ''} onChange={e => setSelId(Number(e.target.value))} disabled={!plataformas.length}>
              {plataformas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}{p.ciudad ? ` · ${p.ciudad}` : ''}</MenuItem>)}
            </TextField>
            {plat && (
              <>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Button size="small" fullWidth variant="outlined" startIcon={<EditIcon />} onClick={abrirEditar}
                    sx={{ color: '#475569', borderColor: '#CBD5E1', textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>Editar</Button>
                  <Tooltip title="Eliminar"><IconButton onClick={eliminar} sx={{ color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px' }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                </Stack>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={0.5}>
                  {plat.direccion && <Typography sx={{ fontSize: 12, color: '#64748B' }}>{plat.direccion}, {plat.ciudad}, {plat.pais}</Typography>}
                  <Grid container spacing={1} sx={{ mt: 0.25 }}>
                    {[
                      { l: 'M² totales', v: fmt(num(plat.m2_totales)) },
                      { l: 'M² utilizados', v: fmt(r!.m2Util) },
                      { l: 'Valor arriendo', v: money(num(plat.valor_arriendo)) },
                      { l: 'Valor / m²', v: money(r!.valorM2) },
                      { l: '% ocupación', v: `${fmt(r!.pctUtil * 100, 1)}%` },
                      { l: 'Posiciones', v: fmt(num(plat.capacidad_posiciones)) },
                    ].map(x => (
                      <Grid item xs={6} key={x.l}>
                        <Box sx={{ p: 1, borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                          <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{x.l}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>{x.v}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </>
            )}
          </Card>

          {/* Datos del cliente (para el PDF) */}
          <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>Datos del cliente <Typography component="span" sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>(para la cotización PDF)</Typography></Typography>
            <Stack spacing={1.25}>
              <TextField size="small" label="Cliente / Razón social" value={cliente.nombre} onChange={e => setCliente({ ...cliente, nombre: e.target.value })} fullWidth />
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="NIT / ID" value={cliente.nit} onChange={e => setCliente({ ...cliente, nit: e.target.value })} sx={{ flex: 1 }} />
                <TextField size="small" label="Contacto" value={cliente.contacto} onChange={e => setCliente({ ...cliente, contacto: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
            </Stack>
          </Card>

          {/* Resumen */}
          {r && (
            <Card sx={{ p: 2.25, border: `1px solid ${alpha(TX_COLOR, 0.25)}`, borderRadius: '14px', background: `linear-gradient(160deg, ${alpha(TX_COLOR, 0.06)}, #fff)` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>Resumen de la operación</Typography>
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
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B', width: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(x.v)}</Typography>
                </Stack>
              ))}
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" alignItems="center" sx={{ py: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', flex: 1 }}>Total operación / mes</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>{money(r.totalOperacion)}</Typography>
              </Stack>
              <Box sx={{ mt: 1, p: 1.5, borderRadius: '12px', bgcolor: alpha(TX_COLOR, 0.1), textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costo por posición</Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 800, color: TX_DARK, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{money(r.valorPosicion)}</Typography>
                <Typography sx={{ fontSize: 11, color: '#475569', mt: 0.25 }}>
                  {r.posiciones > 0 ? `${fmt(r.posiciones)} posiciones · ${fmt(r.m2PorPosicion, 2)} m²/posición` : 'Define la capacidad en posiciones ✎'}
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: 12, color: '#475569', flex: 1 }}>Margen de utilidad</Typography>
                <TextField value={config.parametros.margen_utilidad_pct} onChange={e => setPar({ margen_utilidad_pct: e.target.value })}
                  variant="standard" size="small" sx={{ width: 60, '& input': { textAlign: 'right', fontSize: 13, fontWeight: 700 } }}
                  InputProps={{ endAdornment: <span style={{ color: '#94A3B8', fontSize: 12 }}>%</span> }} />
              </Stack>
              <Box sx={{ mt: 1, p: 1.5, borderRadius: '12px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: alpha('#fff', 0.85), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobro por posición / mes</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{money(r.cobroPosicion)}</Typography>
                {r.posiciones > 0 && <Typography sx={{ fontSize: 11, color: alpha('#fff', 0.85), mt: 0.25 }}>≈ {money(r.cobroPosicion * r.posiciones)} / mes</Typography>}
              </Box>
            </Card>
          )}
        </Box>

        {/* ── Columna derecha ── */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {/* Inputs pre-configurados */}
          <Card sx={{ p: 2.25, mb: 2, border: `1px solid ${alpha(TX_COLOR, 0.2)}`, borderRadius: '14px' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: alpha(TX_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: TX_DARK }}><Tune fontSize="small" /></Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#1E293B', flex: 1 }}>Inputs / Parámetros</Typography>
              <Button size="small" variant="text" startIcon={<RestartAlt />} onClick={restaurarConfig} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 700 }}>Restaurar</Button>
              <Button size="small" variant="contained" startIcon={<Save />} onClick={guardarConfig} disabled={guardando}
                sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}>Guardar</Button>
            </Stack>
            <Grid container spacing={1.25}>
              {[
                { l: 'Pallet largo (m)', k: 'pallet_largo_m' as const, adorn: 'm' },
                { l: 'Pallet ancho (m)', k: 'pallet_ancho_m' as const, adorn: 'm' },
                { l: 'Margen utilidad', k: 'margen_utilidad_pct' as const, adorn: '%' },
                { l: 'IPC', k: 'ipc_pct' as const, adorn: '%' },
                { l: 'SMLV', k: 'smlv' as const, adorn: '$' },
                { l: 'Aux. transporte', k: 'aux_transporte' as const, adorn: '$' },
                { l: 'Horas mensuales', k: 'hr_mensuales' as const, adorn: 'h' },
              ].map(f => (
                <Grid item xs={6} sm={4} md={3} key={f.k}>
                  <TextField size="small" label={f.l} value={config.parametros[f.k]} onChange={e => setPar({ [f.k]: e.target.value } as Partial<Parametros>)} fullWidth
                    InputProps={f.adorn === '$'
                      ? { startAdornment: <InputAdornment position="start">$</InputAdornment> }
                      : { endAdornment: <InputAdornment position="end">{f.adorn}</InputAdornment> }} />
                </Grid>
              ))}
              <Grid item xs={6} sm={4} md={3}>
                <Box sx={{ p: 1, borderRadius: '8px', bgcolor: alpha(TX_COLOR, 0.06), height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: TX_DARK, textTransform: 'uppercase' }}>Área posición</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: TX_DARK }}>{fmt(num(config.parametros.pallet_largo_m) * num(config.parametros.pallet_ancho_m), 2)} m²</Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {r && <>
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

            {/* ARRIENDO (áreas viven en la plataforma) */}
            <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <RubroHeader icon={<WarehouseIcon fontSize="small" />} titulo="Arriendo de bodega" total={r.totalArriendo} part={r.part.arriendo} />
              <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 1 }}>
                La distribución de áreas se define en cada plataforma. Utilizados: <b>{fmt(r.m2Util)} m²</b> ({fmt(r.pctUtil * 100, 1)}%) · Valor/m²: <b>{money(r.valorM2)}</b>.
                {plat && <Button size="small" startIcon={<Straighten />} onClick={abrirEditar} sx={{ ml: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700, py: 0 }}>Editar áreas</Button>}
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 420 }}>
                  <TableHead><TableRow>
                    <TableCell sx={HEAD_SX}>Área</TableCell>
                    <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>M²</TableCell>
                    <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>Costo asignado</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {plat?.areas.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ ...CELL_SX, fontSize: 12.5, color: '#475569' }}>{a.area}</TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5 }}>{fmt(num(a.m2))}</TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>{money(num(a.m2) * r.valorM2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Card>

            {/* SERVICIOS */}
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
            <EquipoCard titulo="Maquinaria y equipo" icon={<Construction fontSize="small" />} total={r.totalMaq} part={r.part.maq}
              incremento={config.maquinaria.incremento_pct} onIncremento={v => setC({ maquinaria: { ...config.maquinaria, incremento_pct: v } })}
              items={config.maquinaria.items} calc={r.maq}
              onItem={(i, patch) => setC({ maquinaria: { ...config.maquinaria, items: updRow(config.maquinaria.items, i, patch) } })}
              onDel={i => setC({ maquinaria: { ...config.maquinaria, items: config.maquinaria.items.filter((_, k) => k !== i) } })}
              onAdd={() => setC({ maquinaria: { ...config.maquinaria, items: [...config.maquinaria.items, { item: '', cantidad: 1, valor: 0 }] } })} />

            {/* EQUIPOS */}
            <EquipoCard titulo="Equipos tecnológicos" icon={<Devices fontSize="small" />} total={r.totalEq} part={r.part.eq}
              incremento={config.equipos_tecnologicos.incremento_pct} onIncremento={v => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, incremento_pct: v } })}
              items={config.equipos_tecnologicos.items} calc={r.eq}
              onItem={(i, patch) => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, items: updRow(config.equipos_tecnologicos.items, i, patch) } })}
              onDel={i => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, items: config.equipos_tecnologicos.items.filter((_, k) => k !== i) } })}
              onAdd={() => setC({ equipos_tecnologicos: { ...config.equipos_tecnologicos, items: [...config.equipos_tecnologicos.items, { item: '', cantidad: 1, valor: 0 }] } })} />
          </>}
        </Box>
      </Box>

      {/* ── Diálogo profesional de plataforma ── */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '9px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarehouseIcon sx={{ color: '#fff', fontSize: 17 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{draft.id ? 'Editar plataforma' : 'Nueva plataforma'}</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>Ubicación, capacidades y distribución de áreas</Typography>
          </Box>
          <IconButton onClick={() => setDlgOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#FCFCFD' }}>
          {/* Identificación */}
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>Identificación y ubicación</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}><TextField size="small" label="Nombre de la plataforma" value={draft.nombre} onChange={e => setDraft({ ...draft, nombre: e.target.value })} fullWidth required /></Grid>
            <Grid item xs={6} sm={3}><TextField size="small" label="País" value={draft.pais} onChange={e => setDraft({ ...draft, pais: e.target.value })} fullWidth /></Grid>
            <Grid item xs={6} sm={3}><TextField size="small" label="Ciudad" value={draft.ciudad} onChange={e => setDraft({ ...draft, ciudad: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={8}><TextField size="small" label="Dirección" value={draft.direccion} onChange={e => setDraft({ ...draft, direccion: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={4}><TextField size="small" label="Posición / referencia" placeholder="Bodega 4, zona franca…" value={draft.posicion} onChange={e => setDraft({ ...draft, posicion: e.target.value })} fullWidth /></Grid>
          </Grid>

          <Typography sx={{ fontSize: 11, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', mt: 2.5, mb: 1 }}>Capacidades</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4}><TextField size="small" type="number" label="M² totales de la bodega" value={draft.m2_totales} onChange={e => setDraft({ ...draft, m2_totales: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={4}><TextField size="small" type="number" label="Valor arriendo mensual" value={draft.valor_arriendo} onChange={e => setDraft({ ...draft, valor_arriendo: e.target.value })} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
            <Grid item xs={12} sm={4}><TextField size="small" type="number" label="Capacidad (posiciones)" value={draft.capacidad_posiciones} onChange={e => setDraft({ ...draft, capacidad_posiciones: e.target.value })} fullWidth helperText="Posiciones de almacenamiento (pallets)" /></Grid>
          </Grid>
          <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
            {[
              { l: 'Valor / m²', v: money(draftValorM2) },
              { l: 'M² utilizados', v: `${fmt(m2DraftUtil)} m²` },
              { l: '% ocupación', v: `${fmt(draftPct * 100, 1)}%` },
              { l: 'M² / posición', v: num(draft.capacidad_posiciones) ? fmt(m2DraftUtil / num(draft.capacidad_posiciones), 2) : '—' },
            ].map(x => (
              <Box key={x.l} sx={{ flex: 1, p: 1, borderRadius: '8px', bgcolor: alpha(TX_COLOR, 0.06), textAlign: 'center' }}>
                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{x.l}</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: TX_DARK }}>{x.v}</Typography>
              </Box>
            ))}
          </Stack>

          <Stack direction="row" alignItems="center" sx={{ mt: 2.5, mb: 1 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>Distribución de áreas (m²)</Typography>
            <Button size="small" startIcon={<Add />} onClick={() => setDraft({ ...draft, areas: [...draft.areas, { area: '', m2: 0 }] })} sx={{ color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar área</Button>
          </Stack>
          <Card variant="outlined" sx={{ borderRadius: '10px' }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell sx={{ ...HEAD_SX, pl: 2 }}>Área</TableCell>
                <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>M²</TableCell>
                <TableCell sx={{ ...HEAD_SX, textAlign: 'right', pr: 1 }} />
              </TableRow></TableHead>
              <TableBody>
                {draft.areas.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ ...CELL_SX, pl: 2 }}><TxtCell value={a.area} width={300} onChange={v => setDraft({ ...draft, areas: draft.areas.map((x, k) => k === i ? { ...x, area: v } : x) })} /></TableCell>
                    <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={a.m2} width={90} onChange={v => setDraft({ ...draft, areas: draft.areas.map((x, k) => k === i ? { ...x, m2: v } : x) })} /></TableCell>
                    <TableCell sx={{ ...CELL_SX, textAlign: 'right', pr: 1 }}><IconButton size="small" onClick={() => setDraft({ ...draft, areas: draft.areas.filter((_, k) => k !== i) })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ ...CELL_SX, pl: 2, fontWeight: 800, fontSize: 12.5, color: TX_DARK }}>Total utilizados</TableCell>
                  <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontWeight: 800, fontSize: 12.5, color: TX_DARK }}>{fmt(m2DraftUtil)}</TableCell>
                  <TableCell sx={CELL_SX} />
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <TextField size="small" label="Notas" value={draft.notas} onChange={e => setDraft({ ...draft, notas: e.target.value })} fullWidth multiline minRows={2} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgOpen(false)} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" startIcon={<Save />} onClick={guardarDraft} disabled={guardando}
            sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '9px', px: 3 }}>
            {guardando ? 'Guardando…' : (draft.id ? 'Guardar cambios' : 'Crear plataforma')}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

// ─── Tarjeta reutilizable para Maquinaria / Equipos ────────────────────────────
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
