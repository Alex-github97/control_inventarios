import React, { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Card, Chip, CircularProgress, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
} from '@mui/material'
import { NoteAdd, Add, Send, CheckCircle, Cancel, Refresh, DeleteOutline } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { mensajeDeError } from '@/utils/errorApi'
import { Layout } from '@/components/layout/Layout'
import { COLOR_MODULO } from '@/config/marca'
import {
  getSolicitudes, createSolicitud, enviarSolicitud, aprobarSolicitud, rechazarSolicitud,
  Solicitud, EstadoSolicitud, PrioridadSCM, CategoriaSCM, SolicitudItem,
} from '@/api/scm'

const SCM_COLOR = COLOR_MODULO
const PAGE_BG   = '#F0F2F5'
const BORDER    = `rgba(12,77,140,0.25)`

const ESTADO_META: Record<EstadoSolicitud, { label: string; color: string }> = {
  BORRADOR:   { label: 'Borrador',   color: '#64748b' },
  PENDIENTE:  { label: 'Pendiente',  color: '#f59e0b' },
  APROBADA:   { label: 'Aprobada',   color: '#22c55e' },
  RECHAZADA:  { label: 'Rechazada',  color: '#ef4444' },
  EN_PROCESO: { label: 'En Proceso', color: '#3b82f6' },
  COMPLETADA: { label: 'Completada', color: '#10b981' },
  CANCELADA:  { label: 'Cancelada',  color: '#6b7280' },
}

const PRIORIDADES: PrioridadSCM[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE']
const CATEGORIAS: CategoriaSCM[]  = ['INSUMOS', 'SERVICIOS', 'EQUIPOS', 'MATERIALES', 'LOGISTICA', 'IT', 'REPUESTOS', 'PAPELERIA', 'OTROS']

function fmt(val?: number) {
  if (!val) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: '#F9FAFB', '& fieldset': { borderColor: '#E5E7EB' }, '&:hover fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SELECT = { color: 'text.primary', bgcolor: '#F9FAFB', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }

interface Form { titulo: string; descripcion: string; prioridad: PrioridadSCM; categoria: CategoriaSCM; presupuesto: string; fecha_requerida: string }
const EMPTY: Form = { titulo: '', descripcion: '', prioridad: 'MEDIA', categoria: 'INSUMOS', presupuesto: '', fecha_requerida: '' }

// Lo que se pide, línea por línea. Antes la pantalla mandaba siempre un
// «Ítem genérico» inventado de cantidad 1, y la solicitud no decía qué se compraba.
interface Linea { descripcion: string; cantidad: string; unidad: string; precio: string }
const LINEA_VACIA: Linea = { descripcion: '', cantidad: '1', unidad: 'UND', precio: '' }

export default function SCMSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | ''>('')
  const [openNew, setOpenNew]         = useState(false)
  const [form, setForm]               = useState<Form>(EMPTY)
  const [lineas, setLineas]           = useState<Linea[]>([{ ...LINEA_VACIA }])
  const [saving, setSaving]           = useState(false)
  const [rechazarId, setRechazarId]   = useState<number | null>(null)
  const [motivo, setMotivo]           = useState('')

  const load = useCallback(() => {
    setLoading(true)
    getSolicitudes({ estado: filtroEstado || undefined, page_size: 100 })
      .then(r => { setSolicitudes(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [filtroEstado])

  useEffect(() => { load() }, [load])

  // Las acciones muestran el motivo si el servidor las rechaza; antes el error
  // se perdía y el botón parecía no hacer nada.
  async function accion(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); load() }
    catch (e) { toast.error(mensajeDeError(e, 'No se pudo completar la acción')) }
  }

  async function handleCrear() {
    if (!form.titulo.trim()) return
    const items: SolicitudItem[] = lineas
      .filter(l => l.descripcion.trim())
      .map(l => ({ descripcion: l.descripcion.trim(), cantidad: Number(l.cantidad) || 1, unidad: l.unidad || 'UND',
                   precio_estimado: l.precio ? Number(l.precio) : undefined }))
    setSaving(true)
    try {
      await createSolicitud({ titulo: form.titulo, descripcion: form.descripcion || undefined, prioridad: form.prioridad, categoria: form.categoria, presupuesto_estimado: form.presupuesto ? Number(form.presupuesto) : undefined, fecha_requerida: form.fecha_requerida || undefined, items })
      toast.success('Solicitud creada')
      setOpenNew(false); setForm(EMPTY); setLineas([{ ...LINEA_VACIA }]); load()
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo crear la solicitud'))
    } finally { setSaving(false) }
  }

  async function handleRechazar() {
    if (rechazarId === null) return
    await accion(() => rechazarSolicitud(rechazarId, motivo), 'Solicitud rechazada')
    setRechazarId(null); setMotivo('')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NoteAdd sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Solicitudes de Compra</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{total} solicitud{total !== 1 ? 'es' : ''} en el sistema</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as EstadoSolicitud | '')} displayEmpty sx={SX_SELECT}>
                <MenuItem value="">Todos los estados</MenuItem>
                {Object.entries(ESTADO_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <IconButton onClick={load} sx={{ color: 'text.secondary' }}><Refresh /></IconButton>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpenNew(true)} sx={{ bgcolor: SCM_COLOR, '&:hover': { bgcolor: alpha(SCM_COLOR, 0.85) } }}>
              Nueva Solicitud
            </Button>
          </Box>
        </Box>

        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #F1F5F9', py: 1.5, } }}>
                  <TableCell>NÚMERO</TableCell>
                  <TableCell>TÍTULO</TableCell>
                  <TableCell>CATEGORÍA</TableCell>
                  <TableCell>PRIORIDAD</TableCell>
                  <TableCell align="right">PRESUPUESTO</TableCell>
                  <TableCell>ESTADO</TableCell>
                  <TableCell>F. REQUERIDA</TableCell>
                  <TableCell align="center">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, }}><CircularProgress size={28} sx={{ color: SCM_COLOR }} /></TableCell></TableRow>
                ) : solicitudes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.disabled', fontSize: 13, }}>Sin solicitudes</TableCell></TableRow>
                ) : solicitudes.map(s => {
                  const meta = ESTADO_META[s.estado]
                  return (
                    <TableRow key={s.id} sx={{ '& td': { borderBottom: '1px solid #F1F5F9', py: 1.2, }, '&:hover td': { bgcolor: '#F9FAFB !important' } }}>
                      <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#5B9BD5' }}>{s.numero}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: 13, color: 'text.primary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titulo}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.categoria?.replace('_', ' ')}</Typography></TableCell>
                      <TableCell>
                        <Chip label={s.prioridad} size="small" sx={{
                          bgcolor: s.prioridad === 'URGENTE' ? alpha('#ef4444', 0.15) : s.prioridad === 'ALTA' ? alpha('#f97316', 0.15) : alpha('#64748b', 0.12),
                          color: s.prioridad === 'URGENTE' ? '#ef4444' : s.prioridad === 'ALTA' ? '#f97316' : '#64748b',
                          fontSize: 10, fontWeight: 700,
                        }} />
                      </TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: 12, color: 'text.primary' }}>{fmt(s.presupuesto_estimado)}</Typography></TableCell>
                      <TableCell><Chip label={meta.label} size="small" sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontSize: 10, fontWeight: 700 }} /></TableCell>
                      <TableCell><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.fecha_requerida ?? '—'}</Typography></TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {s.estado === 'BORRADOR' && (
                            <Tooltip title="Enviar a aprobación"><IconButton size="small" onClick={() => accion(() => enviarSolicitud(s.id), 'Enviada a aprobación')} sx={{ color: '#f59e0b' }}><Send fontSize="small" /></IconButton></Tooltip>
                          )}
                          {s.estado === 'PENDIENTE' && (
                            <>
                              <Tooltip title="Aprobar"><IconButton size="small" onClick={() => accion(() => aprobarSolicitud(s.id), 'Solicitud aprobada')} sx={{ color: '#22c55e' }}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Rechazar"><IconButton size="small" onClick={() => { setRechazarId(s.id); setMotivo('') }} sx={{ color: '#ef4444' }}><Cancel fontSize="small" /></IconButton></Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Dialog nueva solicitud */}
        <Dialog open={openNew} onClose={() => setOpenNew(false)} maxWidth="md" fullWidth PaperProps={{ sx: { color: 'text.primary' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Nueva Solicitud de Compra</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Título *" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} fullWidth size="small" sx={SX_INPUT} />
            <TextField label="Descripción" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} fullWidth multiline rows={2} size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Prioridad</InputLabel>
                <Select value={form.prioridad} label="Prioridad" onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as PrioridadSCM }))} sx={SX_SELECT}>
                  {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Categoría</InputLabel>
                <Select value={form.categoria} label="Categoría" onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaSCM }))} sx={SX_SELECT}>
                  {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c.replace('_', ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Presupuesto (COP)" value={form.presupuesto} onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))} type="number" fullWidth size="small" sx={SX_INPUT} />
              <TextField label="Fecha requerida" value={form.fecha_requerida} onChange={e => setForm(f => ({ ...f, fecha_requerida: e.target.value }))} type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} sx={SX_INPUT} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Ítems</Typography>
              {lineas.map((l, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField label="Descripción" value={l.descripcion} size="small" sx={{ flex: 3, ...SX_INPUT }}
                    onChange={e => setLineas(ls => ls.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))} />
                  <TextField label="Cant." type="number" value={l.cantidad} size="small" sx={{ flex: 1, ...SX_INPUT }}
                    onChange={e => setLineas(ls => ls.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} />
                  <TextField label="Unidad" value={l.unidad} size="small" sx={{ flex: 1, ...SX_INPUT }}
                    onChange={e => setLineas(ls => ls.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))} />
                  <TextField label="Precio est." type="number" value={l.precio} size="small" sx={{ flex: 1.5, ...SX_INPUT }}
                    onChange={e => setLineas(ls => ls.map((x, j) => j === i ? { ...x, precio: e.target.value } : x))} />
                  <IconButton size="small" aria-label="Quitar ítem" disabled={lineas.length === 1}
                    onClick={() => setLineas(ls => ls.filter((_, j) => j !== i))}><DeleteOutline fontSize="small" /></IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<Add />} onClick={() => setLineas(ls => [...ls, { ...LINEA_VACIA }])}>Agregar ítem</Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid #F1F5F9', p: 2, gap: 1 }}>
            <Button onClick={() => setOpenNew(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrear} disabled={saving || !form.titulo.trim()} sx={{ bgcolor: SCM_COLOR }}>
              {saving ? 'Creando...' : 'Crear Solicitud'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog rechazo */}
        <Dialog open={rechazarId !== null} onClose={() => setRechazarId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Rechazar solicitud</DialogTitle>
          <DialogContent>
            <TextField label="Motivo *" value={motivo} onChange={e => setMotivo(e.target.value)} fullWidth multiline rows={3} size="small" sx={{ mt: 1, ...SX_INPUT }} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setRechazarId(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleRechazar} disabled={!motivo.trim()} sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>Rechazar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
