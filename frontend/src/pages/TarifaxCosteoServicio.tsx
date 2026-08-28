import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Card, Button, TextField, alpha, MenuItem, Stack, Divider, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip, LinearProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
} from '@mui/material'
import {
  Add, DeleteOutline, Save, Download, PictureAsPdf, Bolt, Groups, Construction, Devices,
  RestartAlt, Tune, Edit as EditIcon, Close, Warehouse as WarehouseIcon, Straighten, LocalOffer,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'

import { COLOR_MODULO } from '@/config/marca'
const TX_COLOR = COLOR_MODULO
const TX_DARK = COLOR_MODULO

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AreaRow { area: string; m2: number | string }
interface UnidadRow { unidad: string; cantidad: number | string }
interface CargoRow { cargo: string; cantidad: number | string; salario: number | string; dotacion: number | string; carga_prestacional: number | string }
interface ServRow { servicio: string; gasto_total: number | string }
interface EquipoRow { item: string; cantidad: number | string; valor: number | string }
interface Parametros {
  pallet_largo_m: number | string; pallet_ancho_m: number | string; margen_utilidad_pct: number | string
  ipc_pct: number | string; smlv: number | string; aux_transporte: number | string; hr_mensuales: number | string
}
interface Plataforma {
  id?: number; nombre: string; base_almacenamiento_id?: number | null
  pais: string; ciudad: string; direccion: string; posicion: string
  m2_totales: number | string; valor_arriendo: number | string; valor_m2_manual?: number | string
  unidades: UnidadRow[]; areas: AreaRow[]
  parametros: Parametros
  nomina: { cargos: CargoRow[] }
  servicios_publicos: { items: ServRow[] }
  maquinaria: { incremento_pct: number | string; items: EquipoRow[] }
  equipos_tecnologicos: { incremento_pct: number | string; items: EquipoRow[] }
  notas?: string
}
// Bodega base de almacenamiento (solo los campos de la instalacion que se heredan)
interface Bodega { id: number; nombre: string; ciudad?: string; direccion?: string; pais?: string; m2_totales: number; valor_arriendo: number; valor_m2_manual?: number }
type Config = Pick<Plataforma, 'parametros' | 'nomina' | 'servicios_publicos' | 'maquinaria' | 'equipos_tecnologicos'>
interface Cliente { nombre: string; nit: string; contacto: string }
interface Meta { servicio: string; label: string; subtitulo: string; unidades_sugeridas: string[] }

const AREAS_DEFAULT: AreaRow[] = [
  { area: 'Almacenamiento', m2: 0 }, { area: 'Transito (alistamiento - Cross)', m2: 0 },
  { area: 'Muelle (recibo - despacho)', m2: 0 }, { area: 'Patio de maniobras', m2: 0 },
  { area: 'Devoluciones', m2: 0 }, { area: 'Despacho ruta nacional', m2: 0 }, { area: 'Area maquila', m2: 0 },
]

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const fmt = (v: number, dec = 0) => v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const money = (v: number) => `$ ${fmt(v)}`

// Si la plataforma esta vinculada a una bodega, hereda los datos de la instalacion.
function resolverBase(p: Plataforma, bases: Bodega[]): Plataforma {
  if (!p.base_almacenamiento_id) return p
  const b = bases.find(x => x.id === p.base_almacenamiento_id)
  if (!b) return p
  return { ...p, m2_totales: b.m2_totales, valor_arriendo: b.valor_arriendo, valor_m2_manual: b.valor_m2_manual ?? 0, pais: b.pais || p.pais, ciudad: b.ciudad || p.ciudad, direccion: b.direccion || p.direccion }
}

function plataformaNueva(tmpl: Config, unidadesSugeridas: string[]): Plataforma {
  return {
    nombre: '', base_almacenamiento_id: null, pais: 'Colombia', ciudad: '', direccion: '', posicion: '',
    m2_totales: '', valor_arriendo: '', valor_m2_manual: '',
    unidades: unidadesSugeridas.map(u => ({ unidad: u, cantidad: '' })),
    areas: AREAS_DEFAULT.map(a => ({ ...a })),
    parametros: { ...tmpl.parametros },
    nomina: { cargos: tmpl.nomina.cargos.map(c => ({ ...c })) },
    servicios_publicos: { items: tmpl.servicios_publicos.items.map(s => ({ ...s })) },
    maquinaria: { incremento_pct: tmpl.maquinaria.incremento_pct, items: tmpl.maquinaria.items.map(m => ({ ...m })) },
    equipos_tecnologicos: { incremento_pct: tmpl.equipos_tecnologicos.incremento_pct, items: tmpl.equipos_tecnologicos.items.map(e => ({ ...e })) },
    notas: '',
  }
}

// ─── Cálculo (mismo modelo que el backend; costo/cobro por CADA unidad) ────────
function calcular(p: Plataforma) {
  const m2Tot = num(p.m2_totales), arr = num(p.valor_arriendo)
  const nomina = p.nomina.cargos.map(x => {
    const base = num(x.salario) + num(x.dotacion) + num(x.carga_prestacional)
    return { ...x, base, total: num(x.cantidad) * base }
  })
  const totalNomina = sum(nomina.map(x => x.total))
  const m2Util = sum(p.areas.map(a => num(a.m2)))
  const vm2Manual = num(p.valor_m2_manual)
  const valorM2 = vm2Manual > 0 ? vm2Manual : (m2Tot ? arr / m2Tot : 0)
  const pctUtil = m2Tot ? m2Util / m2Tot : 0
  const totalArriendo = m2Util * valorM2
  const serv = p.servicios_publicos.items.map(s => ({ ...s, asignado: num(s.gasto_total) * pctUtil }))
  const totalServ = sum(serv.map(s => s.asignado))
  const incMaq = num(p.maquinaria.incremento_pct) / 100
  const maq = p.maquinaria.items.map(m => { const t = num(m.cantidad) * num(m.valor); return { ...m, total: t, totalInc: t * (1 + incMaq) } })
  const totalMaq = sum(maq.map(m => m.totalInc))
  const incEq = num(p.equipos_tecnologicos.incremento_pct) / 100
  const eq = p.equipos_tecnologicos.items.map(e => { const t = num(e.cantidad) * num(e.valor); return { ...e, total: t, totalInc: t * (1 + incEq) } })
  const totalEq = sum(eq.map(e => e.totalInc))
  const totalOperacion = totalNomina + totalArriendo + totalServ + totalMaq + totalEq
  const margen = num(p.parametros.margen_utilidad_pct) / 100
  const unidades = p.unidades.map(u => {
    const cant = num(u.cantidad)
    const costo = cant ? totalOperacion / cant : 0
    return { unidad: u.unidad, cantidad: cant, costo, cobro: costo * (1 + margen) }
  })
  const part = (x: number) => (totalOperacion ? x / totalOperacion : 0)
  return {
    nomina, totalNomina, m2Util, valorM2, pctUtil, totalArriendo, serv, totalServ,
    maq, totalMaq, eq, totalEq, totalOperacion, margen, unidades,
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

export default function CosteoServicio({ servicio }: { servicio: string }) {
  const API = `/tarifax/servicios/${servicio}`
  const [meta, setMeta] = useState<Meta | null>(null)
  const [plataformas, setPlataformas] = useState<Plataforma[]>([])
  const [template, setTemplate] = useState<Config | null>(null)
  const [selId, setSelId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Plataforma | null>(null)
  const [baseline, setBaseline] = useState('')
  const [cliente, setCliente] = useState<Cliente>({ nombre: '', nit: '', contacto: '' })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exportando, setExportando] = useState<'' | 'excel' | 'pdf'>('')

  const [bases, setBases] = useState<Bodega[]>([])
  const [dlgOpen, setDlgOpen] = useState(false)
  const [dlgMode, setDlgMode] = useState<'new' | 'edit'>('new')
  const [dlgData, setDlgData] = useState<Plataforma | null>(null)

  useEffect(() => {
    setCargando(true)
    Promise.all([
      apiClient.get<Meta>(`${API}/meta`),
      apiClient.get<Plataforma[]>(`${API}/plataformas`),
      apiClient.get<Config>(`${API}/config`),
      apiClient.get<Bodega[]>('/tarifax/plataformas'),  // bodegas de almacenamiento (base)
    ]).then(([mt, pl, cf, bo]) => {
      setMeta(mt.data); setTemplate(cf.data); setPlataformas(pl.data || []); setBases(bo.data || [])
      if (pl.data?.length) cargarDraft(pl.data[0]); else { setDraft(null); setSelId(null) }
    }).catch(() => toast.error('No se pudo cargar la cotización'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicio])

  const cargarDraft = (p: Plataforma) => { setSelId(p.id!); setDraft(clone(p)); setBaseline(JSON.stringify(p)) }
  const seleccionar = (id: number) => { const p = plataformas.find(x => x.id === id); if (p) cargarDraft(p) }
  const dirty = useMemo(() => !!draft && JSON.stringify(draft) !== baseline, [draft, baseline])
  const draftBase = useMemo(() => (draft ? resolverBase(draft, bases) : null), [draft, bases])
  const r = useMemo(() => (draftBase ? calcular(draftBase) : null), [draftBase])
  const baseNombre = draft?.base_almacenamiento_id ? (bases.find(b => b.id === draft.base_almacenamiento_id)?.nombre || '') : ''

  const setD = (patch: Partial<Plataforma>) => setDraft(d => (d ? { ...d, ...patch } : d))
  const setPar = (patch: Partial<Parametros>) => setDraft(d => (d ? { ...d, parametros: { ...d.parametros, ...patch } } : d))
  const updRow = <T,>(arr: T[], i: number, patch: Partial<T>): T[] => arr.map((x, k) => (k === i ? { ...x, ...patch } : x))

  const recargar = async (focusId?: number) => {
    const lista = (await apiClient.get<Plataforma[]>(`${API}/plataformas`)).data || []
    setPlataformas(lista)
    const f = focusId ? lista.find(p => p.id === focusId) : lista[0]
    if (f) cargarDraft(f); else { setDraft(null); setSelId(null) }
  }

  const persistir = (p: Plataforma) => {
    const payload = {
      ...p,
      base_almacenamiento_id: p.base_almacenamiento_id || null,
      m2_totales: num(p.m2_totales), valor_arriendo: num(p.valor_arriendo), valor_m2_manual: num(p.valor_m2_manual),
      unidades: p.unidades.filter(u => u.unidad.trim()).map(u => ({ unidad: u.unidad.trim(), cantidad: num(u.cantidad) })),
      areas: p.areas.map(a => ({ area: a.area, m2: num(a.m2) })),
    }
    return p.id
      ? apiClient.put<Plataforma>(`${API}/plataformas/${p.id}`, payload).then(res => res.data)
      : apiClient.post<Plataforma>(`${API}/plataformas`, payload).then(res => res.data)
  }

  const guardar = async () => {
    if (!draft) return
    setGuardando(true)
    try { const s = await persistir(draft); await recargar(s.id!); toast.success('Guardado') }
    catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo guardar') }
    finally { setGuardando(false) }
  }

  const abrirNueva = () => { if (!template || !meta) return; setDlgMode('new'); setDlgData(plataformaNueva(template, meta.unidades_sugeridas)); setDlgOpen(true) }
  const abrirEditar = () => { if (!draft) return; setDlgMode('edit'); setDlgData(clone(draft)); setDlgOpen(true) }
  const guardarDialogo = async () => {
    if (!dlgData) return
    if (!dlgData.nombre.trim()) { toast.error('Ponle un nombre a la plataforma'); return }
    setGuardando(true)
    try { const s = await persistir(dlgData); await recargar(s.id!); setDlgOpen(false); toast.success(dlgMode === 'new' ? 'Plataforma creada' : 'Plataforma actualizada') }
    catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo guardar') }
    finally { setGuardando(false) }
  }
  const eliminar = async () => {
    if (!draft?.id) return
    if (!window.confirm(`¿Eliminar la plataforma "${draft.nombre}"?`)) return
    try { await apiClient.delete(`${API}/plataformas/${draft.id}`); await recargar(); toast.success('Eliminada') }
    catch { toast.error('No se pudo eliminar') }
  }

  const restaurarRubros = () => {
    if (!draft || !template) return
    if (!window.confirm('¿Restaurar los rubros e inputs de esta plataforma a la plantilla por defecto?')) return
    setD({
      parametros: { ...template.parametros },
      nomina: clone(template.nomina), servicios_publicos: clone(template.servicios_publicos),
      maquinaria: clone(template.maquinaria), equipos_tecnologicos: clone(template.equipos_tecnologicos),
    })
  }
  const guardarComoPlantilla = async () => {
    if (!draft) return
    if (!window.confirm('¿Usar los rubros e inputs de esta plataforma como plantilla por defecto para nuevas?')) return
    try {
      const tmpl: Config = { parametros: draft.parametros, nomina: draft.nomina, servicios_publicos: draft.servicios_publicos, maquinaria: draft.maquinaria, equipos_tecnologicos: draft.equipos_tecnologicos }
      await apiClient.put(`${API}/config`, tmpl); setTemplate(clone(tmpl)); toast.success('Guardado como plantilla')
    } catch { toast.error('No se pudo guardar la plantilla') }
  }

  const exportar = async (tipo: 'excel' | 'pdf') => {
    if (!draft) { toast.error('Selecciona o crea una plataforma primero'); return }
    if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Exportar con los valores actuales?')) return
    setExportando(tipo)
    try {
      const path = tipo === 'pdf' ? `${API}/cotizacion/pdf` : `${API}/cotizacion/exportar`
      const res = await apiClient.post<{ filename: string; file_base64: string }>(path, { plataforma: draft, cliente })
      descargarBlob(res.data.file_base64, res.data.filename,
        tipo === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    } catch { toast.error(`No se pudo generar el ${tipo === 'pdf' ? 'PDF' : 'Excel'}`) }
    finally { setExportando('') }
  }

  if (cargando || !template || !meta) {
    return <Layout title="TarifaX"><LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: TX_COLOR } }} /></Layout>
  }

  const unidadesConCantidad = draft ? draft.unidades.filter(u => num(u.cantidad) > 0) : []

  return (
    <Layout title={`TarifaX · ${meta.label}`}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${alpha(TX_COLOR, 0.4)}` }}>
          <LocalOffer sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>{meta.label}</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>{meta.subtitulo} · rubros por plataforma · unidades de cobro configurables</Typography>
        </Box>
        <Button variant="contained" startIcon={<Save />} onClick={guardar} disabled={!draft || !dirty || guardando}
          sx={{ bgcolor: dirty ? '#0F766E' : '#94A3B8', '&:hover': { bgcolor: dirty ? '#115E59' : '#94A3B8' }, textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}>
          {guardando ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}
        </Button>
        <Button variant="outlined" startIcon={<Download />} onClick={() => exportar('excel')} disabled={!!exportando || !draft}
          sx={{ color: TX_DARK, borderColor: alpha(TX_COLOR, 0.5), textTransform: 'none', fontWeight: 700, borderRadius: '9px', '&:hover': { borderColor: TX_COLOR, bgcolor: alpha(TX_COLOR, 0.06) } }}>
          {exportando === 'excel' ? '…' : 'Excel'}
        </Button>
        <Button variant="contained" startIcon={<PictureAsPdf />} onClick={() => exportar('pdf')} disabled={!!exportando || !draft}
          sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}>
          {exportando === 'pdf' ? '…' : 'Cotización PDF'}
        </Button>
      </Box>

      {plataformas.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', border: `2px dashed ${alpha(TX_COLOR, 0.35)}`, borderRadius: '14px', mb: 2 }}>
          <LocalOffer sx={{ fontSize: 40, color: alpha(TX_COLOR, 0.4) }} />
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1E293B', mt: 1 }}>Aún no tienes plataformas de {meta.label}</Typography>
          <Typography sx={{ fontSize: 13, color: '#64748B', mb: 2 }}>Crea la primera. Vendrá con los rubros pre-configurados y las unidades de cobro sugeridas.</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={abrirNueva} sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Crear plataforma</Button>
        </Card>
      )}

      {draft && r && (
        <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>
          {/* ── Columna izquierda ── */}
          <Box sx={{ width: { xs: '100%', lg: 370 }, flexShrink: 0, position: { lg: 'sticky' }, top: { lg: 16 } }}>
            <Card sx={{ p: 2.25, mb: 2, border: `1px solid ${alpha(TX_COLOR, 0.2)}`, borderRadius: '14px' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', flex: 1 }}>Plataforma a cotizar</Typography>
                <Tooltip title="Nueva plataforma"><IconButton size="small" onClick={abrirNueva} sx={{ color: TX_DARK, bgcolor: alpha(TX_COLOR, 0.1), borderRadius: '8px' }}><Add fontSize="small" /></IconButton></Tooltip>
              </Stack>
              <TextField select fullWidth size="small" value={selId ?? ''} onChange={e => seleccionar(Number(e.target.value))}>
                {plataformas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}{p.ciudad ? ` · ${p.ciudad}` : ''}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button size="small" fullWidth variant="outlined" startIcon={<EditIcon />} onClick={abrirEditar}
                  sx={{ color: '#475569', borderColor: '#CBD5E1', textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>Datos, unidades y áreas</Button>
                <Tooltip title="Eliminar"><IconButton onClick={eliminar} sx={{ color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px' }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
              </Stack>
              {baseNombre && (
                <Chip size="small" icon={<WarehouseIcon sx={{ fontSize: 14 }} />} label={`Vinculada a bodega: ${baseNombre}`}
                  sx={{ mt: 1.5, width: '100%', justifyContent: 'flex-start', fontSize: 11, fontWeight: 700, bgcolor: alpha(TX_COLOR, 0.12), color: TX_DARK }} />
              )}
              <Divider sx={{ my: 1.5 }} />
              {(draftBase!.direccion || draftBase!.ciudad) && <Typography sx={{ fontSize: 12, color: '#64748B', mb: 1 }}>{draftBase!.direccion}{draftBase!.ciudad ? `, ${draftBase!.ciudad}` : ''}{draftBase!.pais ? `, ${draftBase!.pais}` : ''}</Typography>}
              <Grid container spacing={1}>
                {[
                  { l: 'M² totales', v: fmt(num(draftBase!.m2_totales)) },
                  { l: 'M² utilizados', v: fmt(r.m2Util) },
                  { l: 'Valor arriendo', v: money(num(draftBase!.valor_arriendo)) },
                  { l: 'Valor / m²', v: money(r.valorM2) },
                  { l: '% ocupación', v: `${fmt(r.pctUtil * 100, 1)}%` },
                  { l: 'Unidades cobro', v: fmt(unidadesConCantidad.length) },
                ].map(x => (
                  <Grid item xs={6} key={x.l}>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                      <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{x.l}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>{x.v}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Card>

            <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>Datos del cliente <Typography component="span" sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>(para el PDF)</Typography></Typography>
              <Stack spacing={1.25}>
                <TextField size="small" label="Cliente / Razón social" value={cliente.nombre} onChange={e => setCliente({ ...cliente, nombre: e.target.value })} fullWidth />
                <Stack direction="row" spacing={1}>
                  <TextField size="small" label="NIT / ID" value={cliente.nit} onChange={e => setCliente({ ...cliente, nit: e.target.value })} sx={{ flex: 1 }} />
                  <TextField size="small" label="Contacto" value={cliente.contacto} onChange={e => setCliente({ ...cliente, contacto: e.target.value })} sx={{ flex: 1 }} />
                </Stack>
              </Stack>
            </Card>

            {/* Resumen */}
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
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 12, color: '#475569', flex: 1 }}>Margen de utilidad</Typography>
                <TextField value={draft.parametros.margen_utilidad_pct} onChange={e => setPar({ margen_utilidad_pct: e.target.value })}
                  variant="standard" size="small" sx={{ width: 60, '& input': { textAlign: 'right', fontSize: 13, fontWeight: 700 } }}
                  InputProps={{ endAdornment: <span style={{ color: '#94A3B8', fontSize: 12 }}>%</span> }} />
              </Stack>

              {/* Tarifas por unidad */}
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', mt: 1.5, mb: 0.5 }}>Cobro por unidad</Typography>
              {r.unidades.filter(u => u.cantidad > 0).length === 0 ? (
                <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha(TX_COLOR, 0.06), textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Define las cantidades mensuales de tus unidades de cobro en <b>Datos, unidades y áreas</b> ✎</Typography>
                </Box>
              ) : r.unidades.filter(u => u.cantidad > 0).map((u, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, mb: 0.75, borderRadius: '10px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})` }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{u.unidad}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: alpha('#fff', 0.8) }}>{fmt(u.cantidad)}/mes · costo {money(u.costo)}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{money(u.cobro)}</Typography>
                </Box>
              ))}
            </Card>
          </Box>

          {/* ── Columna derecha ── */}
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Card sx={{ p: 2.25, mb: 2, border: `1px solid ${alpha(TX_COLOR, 0.2)}`, borderRadius: '14px' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: alpha(TX_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: TX_DARK }}><Tune fontSize="small" /></Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#1E293B', flex: 1 }}>Inputs / Parámetros <Typography component="span" sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>de esta plataforma</Typography></Typography>
                <Button size="small" variant="text" startIcon={<RestartAlt />} onClick={restaurarRubros} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 700 }}>Restaurar</Button>
                <Button size="small" variant="text" onClick={guardarComoPlantilla} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 700 }}>Fijar plantilla</Button>
              </Stack>
              <Grid container spacing={1.25}>
                {[
                  { l: 'Margen utilidad', k: 'margen_utilidad_pct' as const, adorn: '%' },
                  { l: 'IPC', k: 'ipc_pct' as const, adorn: '%' },
                  { l: 'SMLV', k: 'smlv' as const, adorn: '$' },
                  { l: 'Aux. transporte', k: 'aux_transporte' as const, adorn: '$' },
                  { l: 'Horas mensuales', k: 'hr_mensuales' as const, adorn: 'h' },
                  { l: 'Pallet largo (m)', k: 'pallet_largo_m' as const, adorn: 'm' },
                  { l: 'Pallet ancho (m)', k: 'pallet_ancho_m' as const, adorn: 'm' },
                ].map(f => (
                  <Grid item xs={6} sm={4} md={3} key={f.k}>
                    <TextField size="small" label={f.l} value={draft.parametros[f.k]} onChange={e => setPar({ [f.k]: e.target.value } as Partial<Parametros>)} fullWidth
                      InputProps={f.adorn === '$'
                        ? { startAdornment: <InputAdornment position="start">$</InputAdornment> }
                        : { endAdornment: <InputAdornment position="end">{f.adorn}</InputAdornment> }} />
                  </Grid>
                ))}
              </Grid>
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
                    {draft.nomina.cargos.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell sx={CELL_SX}><TxtCell value={c.cargo} width={180} onChange={v => setD({ nomina: { cargos: updRow(draft.nomina.cargos, i, { cargo: v }) } })} /></TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.cantidad} width={58} onChange={v => setD({ nomina: { cargos: updRow(draft.nomina.cargos, i, { cantidad: v }) } })} /></TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.salario} money onChange={v => setD({ nomina: { cargos: updRow(draft.nomina.cargos, i, { salario: v }) } })} /></TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.dotacion} money width={82} onChange={v => setD({ nomina: { cargos: updRow(draft.nomina.cargos, i, { dotacion: v }) } })} /></TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={c.carga_prestacional} money onChange={v => setD({ nomina: { cargos: updRow(draft.nomina.cargos, i, { carga_prestacional: v }) } })} /></TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{money(r.nomina[i].total)}</TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right', px: 0 }}><IconButton size="small" onClick={() => setD({ nomina: { cargos: draft.nomina.cargos.filter((_, k) => k !== i) } })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Button size="small" startIcon={<Add />} onClick={() => setD({ nomina: { cargos: [...draft.nomina.cargos, { cargo: '', cantidad: 1, salario: 0, dotacion: 0, carga_prestacional: 0 }] } })}
                sx={{ mt: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar cargo</Button>
            </Card>

            {/* ARRIENDO */}
            <Card sx={{ p: 2.25, mb: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <RubroHeader icon={<WarehouseIcon fontSize="small" />} titulo="Arriendo / espacio" total={r.totalArriendo} part={r.part.arriendo} />
              <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 1 }}>
                Utilizados: <b>{fmt(r.m2Util)} m²</b> ({fmt(r.pctUtil * 100, 1)}%) · Valor/m²: <b>{money(r.valorM2)}</b>.
                <Button size="small" startIcon={<Straighten />} onClick={abrirEditar} sx={{ ml: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700, py: 0 }}>Editar áreas</Button>
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 420 }}>
                  <TableHead><TableRow>
                    <TableCell sx={HEAD_SX}>Área</TableCell>
                    <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>M²</TableCell>
                    <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>Costo asignado</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {draft.areas.map((a, i) => (
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
                    {draft.servicios_publicos.items.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell sx={CELL_SX}><TxtCell value={s.servicio} width={200} onChange={v => setD({ servicios_publicos: { items: updRow(draft.servicios_publicos.items, i, { servicio: v }) } })} /></TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={s.gasto_total} money width={110} onChange={v => setD({ servicios_publicos: { items: updRow(draft.servicios_publicos.items, i, { gasto_total: v }) } })} /></TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>{money(r.serv[i].asignado)}</TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right', px: 0 }}><IconButton size="small" onClick={() => setD({ servicios_publicos: { items: draft.servicios_publicos.items.filter((_, k) => k !== i) } })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Button size="small" startIcon={<Add />} onClick={() => setD({ servicios_publicos: { items: [...draft.servicios_publicos.items, { servicio: '', gasto_total: 0 }] } })}
                sx={{ mt: 1, color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar servicio</Button>
            </Card>

            <EquipoCard titulo="Maquinaria y equipo" icon={<Construction fontSize="small" />} total={r.totalMaq} part={r.part.maq}
              incremento={draft.maquinaria.incremento_pct} onIncremento={v => setD({ maquinaria: { ...draft.maquinaria, incremento_pct: v } })}
              items={draft.maquinaria.items} calc={r.maq}
              onItem={(i, patch) => setD({ maquinaria: { ...draft.maquinaria, items: updRow(draft.maquinaria.items, i, patch) } })}
              onDel={i => setD({ maquinaria: { ...draft.maquinaria, items: draft.maquinaria.items.filter((_, k) => k !== i) } })}
              onAdd={() => setD({ maquinaria: { ...draft.maquinaria, items: [...draft.maquinaria.items, { item: '', cantidad: 1, valor: 0 }] } })} />

            <EquipoCard titulo="Equipos tecnológicos" icon={<Devices fontSize="small" />} total={r.totalEq} part={r.part.eq}
              incremento={draft.equipos_tecnologicos.incremento_pct} onIncremento={v => setD({ equipos_tecnologicos: { ...draft.equipos_tecnologicos, incremento_pct: v } })}
              items={draft.equipos_tecnologicos.items} calc={r.eq}
              onItem={(i, patch) => setD({ equipos_tecnologicos: { ...draft.equipos_tecnologicos, items: updRow(draft.equipos_tecnologicos.items, i, patch) } })}
              onDel={i => setD({ equipos_tecnologicos: { ...draft.equipos_tecnologicos, items: draft.equipos_tecnologicos.items.filter((_, k) => k !== i) } })}
              onAdd={() => setD({ equipos_tecnologicos: { ...draft.equipos_tecnologicos, items: [...draft.equipos_tecnologicos.items, { item: '', cantidad: 1, valor: 0 }] } })} />
          </Box>
        </Box>
      )}

      {/* ── Diálogo ── */}
      {dlgData && (
        <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LocalOffer sx={{ color: '#fff', fontSize: 17 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{dlgMode === 'new' ? `Nueva plataforma · ${meta.label}` : 'Datos de la plataforma'}</Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>Ubicación, capacidades, unidades de cobro y áreas</Typography>
            </Box>
            <IconButton onClick={() => setDlgOpen(false)} size="small"><Close /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ bgcolor: '#FCFCFD' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>Identificación y ubicación</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}><TextField size="small" label="Nombre de la plataforma" value={dlgData.nombre} onChange={e => setDlgData({ ...dlgData, nombre: e.target.value })} fullWidth required /></Grid>
              <Grid item xs={6} sm={3}><TextField size="small" label="País" value={dlgData.pais} onChange={e => setDlgData({ ...dlgData, pais: e.target.value })} fullWidth /></Grid>
              <Grid item xs={6} sm={3}><TextField size="small" label="Ciudad" value={dlgData.ciudad} onChange={e => setDlgData({ ...dlgData, ciudad: e.target.value })} fullWidth /></Grid>
              <Grid item xs={12} sm={8}><TextField size="small" label="Dirección" value={dlgData.direccion} onChange={e => setDlgData({ ...dlgData, direccion: e.target.value })} fullWidth /></Grid>
              <Grid item xs={12} sm={4}><TextField size="small" label="Posición / referencia" value={dlgData.posicion} onChange={e => setDlgData({ ...dlgData, posicion: e.target.value })} fullWidth /></Grid>
            </Grid>

            <Typography sx={{ fontSize: 11, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', mt: 2.5, mb: 1 }}>Instalación (espacio)</Typography>
            <TextField select fullWidth size="small" label="Vincular a bodega de Almacenamiento"
              value={dlgData.base_almacenamiento_id ?? ''}
              onChange={e => {
                const v = e.target.value === '' ? null : Number(e.target.value)
                const b = v ? bases.find(x => x.id === v) : null
                setDlgData({ ...dlgData, base_almacenamiento_id: v,
                  ...(b ? { nombre: dlgData.nombre || `${meta.label} · ${b.nombre}`, ciudad: b.ciudad || dlgData.ciudad, direccion: b.direccion || dlgData.direccion, pais: b.pais || dlgData.pais } : {}) })
              }}
              helperText="Hereda m², arriendo, valor/m² y ubicación de la bodega. Vacío = instalación propia." sx={{ mb: 1.5 }}>
              <MenuItem value="">— Sin vincular (instalación propia) —</MenuItem>
              {bases.map(b => <MenuItem key={b.id} value={b.id}>{b.nombre}{b.ciudad ? ` · ${b.ciudad}` : ''}</MenuItem>)}
            </TextField>
            {dlgData.base_almacenamiento_id ? (() => {
              const b = bases.find(x => x.id === dlgData.base_almacenamiento_id)
              const vm2 = b ? (num(b.valor_m2_manual) > 0 ? num(b.valor_m2_manual) : (num(b.m2_totales) ? num(b.valor_arriendo) / num(b.m2_totales) : 0)) : 0
              return (
                <Stack direction="row" spacing={1.5}>
                  {[{ l: 'M² totales', v: fmt(num(b?.m2_totales)) }, { l: 'Arriendo', v: money(num(b?.valor_arriendo)) }, { l: 'Valor / m²', v: money(vm2) }].map(x => (
                    <Box key={x.l} sx={{ flex: 1, p: 1, borderRadius: '8px', bgcolor: alpha(TX_COLOR, 0.06), textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{x.l} <Typography component="span" sx={{ fontSize: 8.5, color: TX_DARK }}>(bodega)</Typography></Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: TX_DARK }}>{x.v}</Typography>
                    </Box>
                  ))}
                </Stack>
              )
            })() : (
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}><TextField size="small" type="number" label="M² totales de la bodega" value={dlgData.m2_totales} onChange={e => setDlgData({ ...dlgData, m2_totales: e.target.value })} fullWidth /></Grid>
                <Grid item xs={12} sm={4}><TextField size="small" type="number" label="Valor arriendo mensual" value={dlgData.valor_arriendo} onChange={e => setDlgData({ ...dlgData, valor_arriendo: e.target.value })} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
                <Grid item xs={12} sm={4}><TextField size="small" type="number" label="Valor / m² (manual)" value={dlgData.valor_m2_manual ?? ''} onChange={e => setDlgData({ ...dlgData, valor_m2_manual: e.target.value })} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Opcional" /></Grid>
              </Grid>
            )}

            {/* Unidades de cobro */}
            <Stack direction="row" alignItems="center" sx={{ mt: 2.5, mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>Unidades de cobro (cantidad mensual)</Typography>
              <Button size="small" startIcon={<Add />} onClick={() => setDlgData({ ...dlgData, unidades: [...dlgData.unidades, { unidad: '', cantidad: '' }] })} sx={{ color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar unidad</Button>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
              {meta.unidades_sugeridas.filter(u => !dlgData.unidades.some(x => x.unidad === u)).map(u => (
                <Chip key={u} size="small" label={`+ ${u}`} onClick={() => setDlgData({ ...dlgData, unidades: [...dlgData.unidades, { unidad: u, cantidad: '' }] })}
                  sx={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, bgcolor: alpha(TX_COLOR, 0.1), color: TX_DARK, '&:hover': { bgcolor: alpha(TX_COLOR, 0.2) } }} />
              ))}
            </Stack>
            <Card variant="outlined" sx={{ borderRadius: '10px' }}>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ ...HEAD_SX, pl: 2 }}>Unidad de cobro</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>Cantidad / mes</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right', pr: 1 }} />
                </TableRow></TableHead>
                <TableBody>
                  {dlgData.unidades.map((u, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ ...CELL_SX, pl: 2 }}><TxtCell value={u.unidad} width={280} onChange={v => setDlgData({ ...dlgData, unidades: dlgData.unidades.map((x, k) => k === i ? { ...x, unidad: v } : x) })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={u.cantidad} width={110} onChange={v => setDlgData({ ...dlgData, unidades: dlgData.unidades.map((x, k) => k === i ? { ...x, cantidad: v } : x) })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', pr: 1 }}><IconButton size="small" onClick={() => setDlgData({ ...dlgData, unidades: dlgData.unidades.filter((_, k) => k !== i) })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                    </TableRow>
                  ))}
                  {dlgData.unidades.length === 0 && <TableRow><TableCell colSpan={3} sx={{ ...CELL_SX, pl: 2, color: '#94A3B8', fontSize: 12 }}>Agrega al menos una unidad de cobro (chips de arriba).</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>

            <Stack direction="row" alignItems="center" sx={{ mt: 2.5, mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: TX_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>Distribución de áreas (m²)</Typography>
              <Button size="small" startIcon={<Add />} onClick={() => setDlgData({ ...dlgData, areas: [...dlgData.areas, { area: '', m2: 0 }] })} sx={{ color: TX_DARK, textTransform: 'none', fontWeight: 700 }}>Agregar área</Button>
            </Stack>
            <Card variant="outlined" sx={{ borderRadius: '10px' }}>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ ...HEAD_SX, pl: 2 }}>Área</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right' }}>M²</TableCell>
                  <TableCell sx={{ ...HEAD_SX, textAlign: 'right', pr: 1 }} />
                </TableRow></TableHead>
                <TableBody>
                  {dlgData.areas.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ ...CELL_SX, pl: 2 }}><TxtCell value={a.area} width={300} onChange={v => setDlgData({ ...dlgData, areas: dlgData.areas.map((x, k) => k === i ? { ...x, area: v } : x) })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}><NumCell value={a.m2} width={90} onChange={v => setDlgData({ ...dlgData, areas: dlgData.areas.map((x, k) => k === i ? { ...x, m2: v } : x) })} /></TableCell>
                      <TableCell sx={{ ...CELL_SX, textAlign: 'right', pr: 1 }}><IconButton size="small" onClick={() => setDlgData({ ...dlgData, areas: dlgData.areas.filter((_, k) => k !== i) })} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ ...CELL_SX, pl: 2, fontWeight: 800, fontSize: 12.5, color: TX_DARK }}>Total utilizados</TableCell>
                    <TableCell sx={{ ...CELL_SX, textAlign: 'right', fontWeight: 800, fontSize: 12.5, color: TX_DARK }}>{fmt(sum(dlgData.areas.map(a => num(a.m2))))}</TableCell>
                    <TableCell sx={CELL_SX} />
                  </TableRow>
                </TableBody>
              </Table>
            </Card>

            <TextField size="small" label="Notas" value={dlgData.notas} onChange={e => setDlgData({ ...dlgData, notas: e.target.value })} fullWidth multiline minRows={2} sx={{ mt: 2 }} />
            {dlgMode === 'new' && <Typography sx={{ fontSize: 11.5, color: '#94A3B8', mt: 1.5 }}>Los rubros (nómina, servicios, maquinaria, equipos) se copian de la plantilla y luego los editas por plataforma.</Typography>}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlgOpen(false)} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 700 }}>Cancelar</Button>
            <Button variant="contained" startIcon={<Save />} onClick={guardarDialogo} disabled={guardando}
              sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '9px', px: 3 }}>
              {guardando ? 'Guardando…' : (dlgMode === 'new' ? 'Crear plataforma' : 'Guardar cambios')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Layout>
  )
}

// ─── Tarjeta reutilizable Maquinaria / Equipos ─────────────────────────────────
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
