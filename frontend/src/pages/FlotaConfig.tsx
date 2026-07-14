import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Tooltip,
  CircularProgress, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GF_COLOR = '#32AC5C'

// ─── Generic catalog hook ──────────────────────────────────────────────────────
function useCatalog<T extends { id: number }>(endpoint: string, queryKey: string[]) {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery<T[]>({
    queryKey,
    queryFn: () => api.get(endpoint).then(r => r.data),
  })
  const create = useMutation({
    mutationFn: (d: object) => api.post(endpoint, d).then(r => r.data),
    onSuccess: () => { toast.success('Registro creado'); qc.invalidateQueries({ queryKey }) },
    onError: () => toast.error('Error al crear'),
  })
  const update = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`${endpoint}${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Registro actualizado'); qc.invalidateQueries({ queryKey }) },
    onError: () => toast.error('Error al actualizar'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`${endpoint}${id}`),
    onSuccess: () => { toast.success('Registro eliminado'); qc.invalidateQueries({ queryKey }) },
    onError: () => toast.error('Error al eliminar'),
  })
  return { data, isLoading, create, update, remove, qc }
}

// ─── Generic simple-list section ──────────────────────────────────────────────
interface SimpleItem { id: number; nombre: string; activo?: boolean; [key: string]: unknown }

function SimpleSection({
  title, subtitle, endpoint, queryKey, extraFields,
}: {
  title: string; subtitle: string; endpoint: string; queryKey: string[]
  extraFields?: { key: string; label: string; type?: string; options?: { value: string; label: string }[] }[]
}) {
  const { data, isLoading, create, update, remove } = useCatalog<SimpleItem>(endpoint, queryKey)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SimpleItem | null>(null)
  const [form, setForm] = useState<Record<string, string>>({ nombre: '' })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const openDialog = (item?: SimpleItem) => {
    if (item) {
      setEditing(item)
      const f: Record<string, string> = { nombre: item.nombre }
      extraFields?.forEach(ef => { f[ef.key] = item[ef.key] ? String(item[ef.key]) : '' })
      setForm(f)
    } else {
      setEditing(null)
      const f: Record<string, string> = { nombre: '' }
      extraFields?.forEach(ef => { f[ef.key] = '' })
      setForm(f)
    }
    setOpen(true)
  }
  const handleClose = () => { setOpen(false); setEditing(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    const payload: Record<string, unknown> = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: handleClose })
    else create.mutate(payload, { onSuccess: handleClose })
  }

  const isMut = create.isPending || update.isPending

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography fontSize={14} fontWeight={700}>{title}</Typography>
          <Typography fontSize={12} color="text.secondary">{subtitle}</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialog()}
          sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(GF_COLOR, 0.5), color: GF_COLOR }}>
          Nuevo
        </Button>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} sx={{ color: GF_COLOR }} /></Box>
      ) : data.length === 0 ? (
        <Typography fontSize={13} color="text.secondary" textAlign="center" py={2}>Sin registros</Typography>
      ) : (
        <Stack gap={0.75}>
          {data.map(item => (
            <Paper key={item.id} elevation={0} sx={{
              border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5,
              '&:hover': { borderColor: alpha(GF_COLOR, 0.3) }, transition: 'border-color 0.12s',
            }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Box flex={1}>
                  <Typography fontSize={13} fontWeight={600}>{item.nombre}</Typography>
                  {extraFields?.map(ef => item[ef.key] && (
                    <Typography key={ef.key} fontSize={11} color="text.secondary">
                      {ef.label}: {String(item[ef.key])}
                    </Typography>
                  ))}
                </Box>
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => openDialog(item)}>
                    <EditIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton size="small" onClick={() => setDeleteId(item.id)}>
                    <DeleteIcon sx={{ fontSize: 14, color: '#EF4444' }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? `Editar ${title}` : `Nuevo ${title}`}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack gap={1.5} pt={0.5}>
              <TextField label="Nombre *" fullWidth size="small" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              {extraFields?.map(ef => ef.options ? (
                <TextField key={ef.key} select label={ef.label} fullWidth size="small"
                  value={form[ef.key] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [ef.key]: e.target.value }))}>
                  {ef.options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              ) : (
                <TextField key={ef.key} label={ef.label} fullWidth size="small"
                  type={ef.type ?? 'text'} value={form[ef.key] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [ef.key]: e.target.value }))} />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
            <Button size="small" onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={isMut}
              startIcon={isMut ? <CircularProgress size={12} color="inherit" /> : undefined}
              sx={{ textTransform: 'none', bgcolor: GF_COLOR, '&:hover': { bgcolor: '#27884A' } }}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Eliminar {title}</DialogTitle>
        <DialogContent>
          <Typography fontSize={13} color="text.secondary">¿Confirmar eliminación?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setDeleteId(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" color="error" disabled={remove.isPending}
            onClick={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }}
            sx={{ textTransform: 'none' }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Proveedores section (more fields) ────────────────────────────────────────
interface Proveedor { id: number; nombre: string; nit?: string; contacto?: string; telefono?: string; tipo: string }

function ProveedoresSection() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)
  const [form, setForm] = useState({ nombre: '', nit: '', contacto: '', telefono: '', tipo: 'GENERAL' })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: proveedores = [], isLoading } = useQuery<Proveedor[]>({
    queryKey: ['flota-proveedores'],
    queryFn: () => api.get('/flota/proveedores/').then(r => r.data),
  })

  const TIPOS = [{ v: 'COMBUSTIBLE', l: 'Combustible' }, { v: 'REPUESTOS', l: 'Repuestos' }, { v: 'TALLER', l: 'Taller' }, { v: 'GENERAL', l: 'General' }]

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/flota/proveedores/', d).then(r => r.data),
    onSuccess: () => { toast.success('Proveedor creado'); qc.invalidateQueries({ queryKey: ['flota-proveedores'] }); setOpen(false) },
    onError: () => toast.error('Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/flota/proveedores/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['flota-proveedores'] }); setOpen(false) },
    onError: () => toast.error('Error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/proveedores/${id}`),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['flota-proveedores'] }); setDeleteId(null) },
    onError: () => toast.error('Error'),
  })

  const openDialog = (p?: Proveedor) => {
    if (p) { setEditing(p); setForm({ nombre: p.nombre, nit: p.nit ?? '', contacto: p.contacto ?? '', telefono: p.telefono ?? '', tipo: p.tipo }) }
    else { setEditing(null); setForm({ nombre: '', nit: '', contacto: '', telefono: '', tipo: 'GENERAL' }) }
    setOpen(true)
  }
  const handleClose = () => { setOpen(false); setEditing(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography fontSize={14} fontWeight={700}>Proveedores</Typography>
          <Typography fontSize={12} color="text.secondary">Combustible, repuestos y talleres externos</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialog()}
          sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(GF_COLOR, 0.5), color: GF_COLOR }}>Nuevo</Button>
      </Stack>
      {isLoading ? <CircularProgress size={20} sx={{ color: GF_COLOR }} /> : (
        <Stack gap={0.75}>
          {proveedores.map(p => (
            <Paper key={p.id} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5, '&:hover': { borderColor: alpha(GF_COLOR, 0.3) } }}>
              <Stack direction="row" alignItems="center">
                <Box flex={1}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography fontSize={13} fontWeight={600}>{p.nombre}</Typography>
                    <Typography fontSize={10} px={0.75} py={0.1} bgcolor={alpha(GF_COLOR, 0.08)} color={GF_COLOR} borderRadius="4px">{p.tipo}</Typography>
                  </Stack>
                  {p.nit && <Typography fontSize={11} color="text.secondary">NIT: {p.nit}</Typography>}
                </Box>
                <Tooltip title="Editar"><IconButton size="small" onClick={() => openDialog(p)}><EditIcon sx={{ fontSize: 14, color: '#9CA3AF' }} /></IconButton></Tooltip>
                <Tooltip title="Eliminar"><IconButton size="small" onClick={() => setDeleteId(p.id)}><DeleteIcon sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack gap={1.5} pt={0.5}>
              <TextField label="Nombre *" fullWidth size="small" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              <TextField label="NIT" fullWidth size="small" value={form.nit} onChange={e => setForm(f => ({ ...f, nit: e.target.value }))} />
              <TextField label="Contacto" fullWidth size="small" value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
              <TextField label="Teléfono" fullWidth size="small" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              <TextField select label="Tipo" fullWidth size="small" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <MenuItem key={t.v} value={t.v}>{t.l}</MenuItem>)}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
            <Button size="small" onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={createMut.isPending || updateMut.isPending}
              sx={{ textTransform: 'none', bgcolor: GF_COLOR, '&:hover': { bgcolor: '#27884A' } }}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Eliminar Proveedor</DialogTitle>
        <DialogContent><Typography fontSize={13} color="text.secondary">¿Confirmar eliminación?</Typography></DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setDeleteId(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" color="error" disabled={deleteMut.isPending}
            onClick={() => { if (deleteId) deleteMut.mutate(deleteId) }} sx={{ textTransform: 'none' }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Repuestos section ─────────────────────────────────────────────────────────
interface Repuesto { id: number; codigo: string; nombre: string; descripcion?: string; categoria?: string; sistema?: string; unidad: string; costo_referencia?: number; stock_minimo?: number; activo: boolean }
const UNIDADES_REP = ['UNIDAD', 'LITRO', 'GALON', 'METRO', 'KG', 'JUEGO', 'PAR', 'ROLLO']
const CATEGORIAS_REP = ['Lubricantes', 'Filtros', 'Frenos', 'Suspensión', 'Motor', 'Transmisión', 'Eléctrico', 'Carrocería', 'Neumáticos', 'Otros']

function RepuestosSection() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Repuesto | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', descripcion: '', categoria: '', sistema: '', unidad: 'UNIDAD', costo_referencia: '', stock_minimo: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: repuestos = [], isLoading } = useQuery<Repuesto[]>({ queryKey: ['flota-repuestos'], queryFn: () => api.get('/flota/repuestos/').then(r => r.data) })

  const createMut = useMutation({ mutationFn: (d: object) => api.post('/flota/repuestos/', d), onSuccess: () => { toast.success('Repuesto creado'); qc.invalidateQueries({ queryKey: ['flota-repuestos'] }); setOpen(false) }, onError: () => toast.error('Error') })
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/flota/repuestos/${id}`, d), onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['flota-repuestos'] }); setOpen(false) }, onError: () => toast.error('Error') })
  const deleteMut = useMutation({ mutationFn: (id: number) => api.delete(`/flota/repuestos/${id}`), onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['flota-repuestos'] }); setDeleteId(null) } })

  const openDialog = (r?: Repuesto) => {
    if (r) { setEditing(r); setForm({ codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion ?? '', categoria: r.categoria ?? '', sistema: r.sistema ?? '', unidad: r.unidad, costo_referencia: r.costo_referencia?.toString() ?? '', stock_minimo: r.stock_minimo?.toString() ?? '' }) }
    else { setEditing(null); setForm({ codigo: '', nombre: '', descripcion: '', categoria: '', sistema: '', unidad: 'UNIDAD', costo_referencia: '', stock_minimo: '' }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre) { toast.error('Código y nombre son obligatorios'); return }
    const payload: Record<string, unknown> = { ...form, costo_referencia: form.costo_referencia ? Number(form.costo_referencia) : null, stock_minimo: form.stock_minimo ? Number(form.stock_minimo) : null }
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography fontSize={14} fontWeight={700}>Repuestos</Typography>
          <Typography fontSize={12} color="text.secondary">Catálogo de repuestos usados en rutinas de mantenimiento</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialog()} sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(GF_COLOR, 0.5), color: GF_COLOR }}>Nuevo</Button>
      </Stack>
      {isLoading ? <CircularProgress size={20} sx={{ color: GF_COLOR }} /> : (
        <Stack gap={0.75}>
          {repuestos.map(r => (
            <Paper key={r.id} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5, '&:hover': { borderColor: alpha(GF_COLOR, 0.3) } }}>
              <Stack direction="row" alignItems="center">
                <Box flex={1}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography fontSize={11} fontFamily="monospace" color={GF_COLOR} fontWeight={700}>{r.codigo}</Typography>
                    <Typography fontSize={13} fontWeight={600}>{r.nombre}</Typography>
                    <Typography fontSize={10} px={0.75} py={0.1} bgcolor={alpha(GF_COLOR, 0.08)} color={GF_COLOR} borderRadius="4px">{r.unidad}</Typography>
                    {r.categoria && <Typography fontSize={10} color="text.secondary">{r.categoria}</Typography>}
                  </Stack>
                  {r.costo_referencia && <Typography fontSize={11} color="text.secondary">Costo ref.: ${r.costo_referencia.toLocaleString()}</Typography>}
                </Box>
                <Tooltip title="Editar"><IconButton size="small" onClick={() => openDialog(r)}><EditIcon sx={{ fontSize: 14, color: '#9CA3AF' }} /></IconButton></Tooltip>
                <Tooltip title="Eliminar"><IconButton size="small" onClick={() => setDeleteId(r.id)}><DeleteIcon sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Repuesto' : 'Nuevo Repuesto'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack gap={1.5} pt={0.5}>
              <Stack direction="row" gap={1.5}>
                <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 3 }} />
              </Stack>
              <Stack direction="row" gap={1.5}>
                <TextField select label="Categoría" size="small" value={form.categoria} onChange={e => set('categoria', e.target.value)} sx={{ flex: 2 }}>
                  <MenuItem value="">Sin categoría</MenuItem>
                  {CATEGORIAS_REP.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
                <TextField select label="Unidad" size="small" value={form.unidad} onChange={e => set('unidad', e.target.value)} sx={{ flex: 1 }}>
                  {UNIDADES_REP.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              </Stack>
              <Stack direction="row" gap={1.5}>
                <TextField label="Costo referencia" size="small" type="number" value={form.costo_referencia} onChange={e => set('costo_referencia', e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Stock mínimo" size="small" type="number" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} sx={{ flex: 1 }} />
              </Stack>
              <TextField label="Sistema" size="small" value={form.sistema} onChange={e => set('sistema', e.target.value)} placeholder="Motor, Frenos, Transmisión..." />
              <TextField label="Descripción" size="small" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
            <Button size="small" onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={createMut.isPending || updateMut.isPending} sx={{ textTransform: 'none', bgcolor: GF_COLOR }}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Eliminar Repuesto</DialogTitle>
        <DialogContent><Typography fontSize={13} color="text.secondary">¿Confirmar eliminación?</Typography></DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setDeleteId(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" color="error" disabled={deleteMut.isPending} onClick={() => { if (deleteId) deleteMut.mutate(deleteId) }} sx={{ textTransform: 'none' }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Grupos de Vehículos section ───────────────────────────────────────────────
interface GrupoVehiculo { id: number; nombre: string; descripcion?: string; tipo_vehiculo_id?: number; tipo_vehiculo_nombre?: string; marca_id?: number; marca_nombre?: string; tipo_trabajo_filtro?: string; ciudad?: string; activo: boolean; vehiculos_count: number }
interface TipoVehiculo { id: number; nombre: string }
interface MarcaV { id: number; nombre: string }
const TIPOS_TRAB = ['BAJO', 'NORMAL', 'SEVERO']

function GruposSection() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GrupoVehiculo | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', tipo_vehiculo_id: '', marca_id: '', tipo_trabajo_filtro: '', ciudad: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: grupos = [], isLoading } = useQuery<GrupoVehiculo[]>({ queryKey: ['flota-grupos-vehiculo'], queryFn: () => api.get('/flota/grupos-vehiculo/').then(r => r.data) })
  const { data: tiposV = [] } = useQuery<TipoVehiculo[]>({ queryKey: ['flota-tipos-vehiculo'], queryFn: () => api.get('/flota/tipos-vehiculo/').then(r => r.data) })
  const { data: marcas = [] } = useQuery<MarcaV[]>({ queryKey: ['flota-marcas'], queryFn: () => api.get('/flota/marcas/').then(r => r.data) })

  const createMut = useMutation({ mutationFn: (d: object) => api.post('/flota/grupos-vehiculo/', d), onSuccess: () => { toast.success('Grupo creado'); qc.invalidateQueries({ queryKey: ['flota-grupos-vehiculo'] }); setOpen(false) } })
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/flota/grupos-vehiculo/${id}`, d), onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['flota-grupos-vehiculo'] }); setOpen(false) } })
  const deleteMut = useMutation({ mutationFn: (id: number) => api.delete(`/flota/grupos-vehiculo/${id}`), onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['flota-grupos-vehiculo'] }); setDeleteId(null) } })

  const openDialog = (g?: GrupoVehiculo) => {
    if (g) { setEditing(g); setForm({ nombre: g.nombre, descripcion: g.descripcion ?? '', tipo_vehiculo_id: g.tipo_vehiculo_id?.toString() ?? '', marca_id: g.marca_id?.toString() ?? '', tipo_trabajo_filtro: g.tipo_trabajo_filtro ?? '', ciudad: g.ciudad ?? '' }) }
    else { setEditing(null); setForm({ nombre: '', descripcion: '', tipo_vehiculo_id: '', marca_id: '', tipo_trabajo_filtro: '', ciudad: '' }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre) { toast.error('El nombre es obligatorio'); return }
    const payload: Record<string, unknown> = { nombre: form.nombre, descripcion: form.descripcion || null, tipo_vehiculo_id: form.tipo_vehiculo_id ? Number(form.tipo_vehiculo_id) : null, marca_id: form.marca_id ? Number(form.marca_id) : null, tipo_trabajo_filtro: form.tipo_trabajo_filtro || null, ciudad: form.ciudad || null }
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography fontSize={14} fontWeight={700}>Grupos de Vehículos</Typography>
          <Typography fontSize={12} color="text.secondary">Agrupaciones para asignar secuencias de mantenimiento masivamente</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialog()} sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(GF_COLOR, 0.5), color: GF_COLOR }}>Nuevo grupo</Button>
      </Stack>
      {isLoading ? <CircularProgress size={20} sx={{ color: GF_COLOR }} /> : (
        <Stack gap={0.75}>
          {grupos.map(g => (
            <Paper key={g.id} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5, '&:hover': { borderColor: alpha(GF_COLOR, 0.3) } }}>
              <Stack direction="row" alignItems="center">
                <Box flex={1}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography fontSize={13} fontWeight={600}>{g.nombre}</Typography>
                    <Typography fontSize={11} fontWeight={700} px={0.75} py={0.1} bgcolor={alpha(GF_COLOR, 0.1)} color={GF_COLOR} borderRadius="4px">{g.vehiculos_count} vehículos</Typography>
                  </Stack>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {g.tipo_vehiculo_nombre && <Typography fontSize={11} color="text.secondary">Tipo: {g.tipo_vehiculo_nombre}</Typography>}
                    {g.marca_nombre && <Typography fontSize={11} color="text.secondary">Marca: {g.marca_nombre}</Typography>}
                    {g.tipo_trabajo_filtro && <Typography fontSize={11} color="text.secondary">Trabajo: {g.tipo_trabajo_filtro}</Typography>}
                    {g.ciudad && <Typography fontSize={11} color="text.secondary">Ciudad: {g.ciudad}</Typography>}
                  </Stack>
                </Box>
                <Tooltip title="Editar"><IconButton size="small" onClick={() => openDialog(g)}><EditIcon sx={{ fontSize: 14, color: '#9CA3AF' }} /></IconButton></Tooltip>
                <Tooltip title="Eliminar"><IconButton size="small" onClick={() => setDeleteId(g.id)}><DeleteIcon sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Grupo' : 'Nuevo Grupo de Vehículos'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack gap={1.5} pt={0.5}>
              <TextField label="Nombre del grupo *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              <TextField label="Descripción" size="small" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              <Typography fontSize={12} fontWeight={600} color="text.secondary" mt={0.5}>Filtros para determinar qué vehículos pertenecen al grupo</Typography>
              <Stack direction="row" gap={1.5}>
                <TextField select label="Tipo de vehículo" size="small" value={form.tipo_vehiculo_id} onChange={e => set('tipo_vehiculo_id', e.target.value)} sx={{ flex: 1 }}>
                  <MenuItem value="">Todos</MenuItem>
                  {tiposV.map((t: TipoVehiculo) => <MenuItem key={t.id} value={t.id.toString()}>{t.nombre}</MenuItem>)}
                </TextField>
                <TextField select label="Marca" size="small" value={form.marca_id} onChange={e => set('marca_id', e.target.value)} sx={{ flex: 1 }}>
                  <MenuItem value="">Todas</MenuItem>
                  {marcas.map((m: MarcaV) => <MenuItem key={m.id} value={m.id.toString()}>{m.nombre}</MenuItem>)}
                </TextField>
              </Stack>
              <Stack direction="row" gap={1.5}>
                <TextField select label="Tipo de trabajo" size="small" value={form.tipo_trabajo_filtro} onChange={e => set('tipo_trabajo_filtro', e.target.value)} sx={{ flex: 1 }}>
                  <MenuItem value="">Todos</MenuItem>
                  {TIPOS_TRAB.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField label="Ciudad" size="small" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} sx={{ flex: 1 }} />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
            <Button size="small" onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={createMut.isPending || updateMut.isPending} sx={{ textTransform: 'none', bgcolor: GF_COLOR }}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Eliminar Grupo</DialogTitle>
        <DialogContent><Typography fontSize={13} color="text.secondary">¿Confirmar eliminación?</Typography></DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setDeleteId(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" color="error" disabled={deleteMut.isPending} onClick={() => { if (deleteId) deleteMut.mutate(deleteId) }} sx={{ textTransform: 'none' }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function FlotaConfig() {
  const [tab, setTab] = useState(0)

  const sections = [
    { label: 'Marcas' },
    { label: 'Tipos de Vehículo' },
    { label: 'Combustibles' },
    { label: 'Centros de Costo' },
    { label: 'Tipos de Trabajo' },
    { label: 'Proveedores' },
    { label: 'Repuestos' },
    { label: 'Grupos de Vehículos' },
  ]

  return (
    <Layout title="Configuración — Gestión de Flotas">
      <Box mb={3}>
        <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
          Configuración
        </Typography>
        <Typography fontSize={13} color="text.secondary" mt={0.25}>
          Catálogos y parámetros del módulo de gestión de flotas
        </Typography>
      </Box>

      <Tabs
        value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 3, borderBottom: '1px solid #E5E7EB', '& .MuiTabs-indicator': { bgcolor: GF_COLOR } }}
      >
        {sections.map((s, i) => (
          <Tab key={i} label={s.label}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GF_COLOR } }} />
        ))}
      </Tabs>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {tab === 0 && (
            <SimpleSection
              title="Marcas de Vehículos"
              subtitle="Catálogo de marcas disponibles (Kenworth, Freightliner, International…)"
              endpoint="/flota/marcas/"
              queryKey={['flota-marcas']}
            />
          )}
          {tab === 1 && (
            <SimpleSection
              title="Tipos de Vehículo"
              subtitle="Categorías de vehículos de la flota"
              endpoint="/flota/tipos-vehiculo/"
              queryKey={['flota-tipos-vehiculo']}
              extraFields={[{ key: 'descripcion', label: 'Descripción' }]}
            />
          )}
          {tab === 2 && (
            <SimpleSection
              title="Tipos de Combustible"
              subtitle="Diésel, gasolina, gas, eléctrico…"
              endpoint="/flota/tipos-combustible/"
              queryKey={['flota-tipos-combustible']}
              extraFields={[{
                key: 'unidad', label: 'Unidad de medida',
                options: [{ value: 'GALON', label: 'Galón' }, { value: 'LITRO', label: 'Litro' }, { value: 'KWH', label: 'kWh' }],
              }]}
            />
          )}
          {tab === 3 && (
            <SimpleSection
              title="Centros de Costo"
              subtitle="Unidades de negocio para distribución de gastos"
              endpoint="/flota/centros-costo/"
              queryKey={['flota-centros-costo']}
              extraFields={[{ key: 'codigo', label: 'Código' }, { key: 'descripcion', label: 'Descripción' }]}
            />
          )}
          {tab === 4 && (
            <SimpleSection
              title="Tipos de Trabajo"
              subtitle="Catálogo de trabajos de mantenimiento"
              endpoint="/flota/tipos-trabajo/"
              queryKey={['flota-tipos-trabajo']}
              extraFields={[
                { key: 'sistema', label: 'Sistema' },
                { key: 'subsistema', label: 'Subsistema' },
                {
                  key: 'tipo', label: 'Tipo',
                  options: [
                    { value: 'PREVENTIVO', label: 'Preventivo' },
                    { value: 'CORRECTIVO', label: 'Correctivo' },
                    { value: 'PREV_CORR', label: 'Preventivo-Correctivo' },
                  ],
                },
                {
                  key: 'nivel_criticidad', label: 'Criticidad',
                  options: [
                    { value: 'BAJA', label: 'Baja' }, { value: 'MEDIA', label: 'Media' },
                    { value: 'ALTA', label: 'Alta' }, { value: 'CRITICA', label: 'Crítica' },
                  ],
                },
              ]}
            />
          )}
          {tab === 5 && <ProveedoresSection />}
          {tab === 6 && <RepuestosSection />}
          {tab === 7 && <GruposSection />}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: `1px solid ${alpha(GF_COLOR, 0.2)}`, borderRadius: '14px', p: 2.5, bgcolor: alpha(GF_COLOR, 0.03) }}>
            <Typography fontSize={13} fontWeight={700} color={GF_COLOR} mb={1}>
              💡 Guía de configuración
            </Typography>
            <Stack gap={1}>
              {[
                { step: '1', text: 'Configura Marcas y Tipos de Vehículo antes de registrar la flota.' },
                { step: '2', text: 'Registra los Tipos de Combustible para el seguimiento de abastecimiento.' },
                { step: '3', text: 'Crea Centros de Costo para distribuir gastos por unidad de negocio.' },
                { step: '4', text: 'El catálogo de Tipos de Trabajo alimenta las Órdenes de Mantenimiento.' },
                { step: '5', text: 'Los Proveedores se usan en combustible, repuestos y talleres externos.' },
                { step: '6', text: 'El catálogo de Repuestos alimenta las Rutinas de Mantenimiento.' },
                { step: '7', text: 'Los Grupos de Vehículos permiten asignar secuencias de mantenimiento a toda una flota.' },
              ].map(g => (
                <Stack key={g.step} direction="row" gap={1} alignItems="flex-start">
                  <Box sx={{
                    width: 18, height: 18, borderRadius: '50%', bgcolor: GF_COLOR,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1,
                  }}>
                    <Typography fontSize={10} color="#FFF" fontWeight={700}>{g.step}</Typography>
                  </Box>
                  <Typography fontSize={12} color="text.secondary">{g.text}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  )
}
