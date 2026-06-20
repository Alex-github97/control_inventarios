import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Grid, Tooltip,
  CircularProgress, alpha, Switch, FormControlLabel, Chip,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const WMS_COLOR = '#1E40AF'

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
  return { data, isLoading, create, update, remove }
}

// ─── Generic item type ────────────────────────────────────────────────────────
interface SimpleItem { id: number; nombre: string; [key: string]: unknown }

// ─── Generic item card ─────────────────────────────────────────────────────────
function ItemCard({
  item, extraLabels, onEdit, onDelete,
}: {
  item: SimpleItem
  extraLabels?: { key: string; label: string }[]
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Paper elevation={0} sx={{
      border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5,
      '&:hover': { borderColor: alpha(WMS_COLOR, 0.3) }, transition: 'border-color 0.12s',
    }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Box flex={1}>
          <Typography fontSize={13} fontWeight={600}>{item.nombre ?? (item.codigo as string) ?? String(item.id)}</Typography>
          {extraLabels?.map(el => item[el.key] != null && (
            <Typography key={el.key} fontSize={11} color="text.secondary">
              {el.label}: {String(item[el.key])}
            </Typography>
          ))}
        </Box>
        <Tooltip title="Editar">
          <IconButton size="small" onClick={onEdit}><EditIcon sx={{ fontSize: 14, color: '#9CA3AF' }} /></IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton size="small" onClick={onDelete}><DeleteIcon sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  )
}

// ─── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDelete({ open, title, onConfirm, onCancel, loading }: { open: boolean; title: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Eliminar {title}</DialogTitle>
      <DialogContent><Typography fontSize={13} color="text.secondary">¿Confirmar eliminación?</Typography></DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button size="small" onClick={onCancel} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button size="small" variant="contained" color="error" disabled={loading} onClick={onConfirm} sx={{ textTransform: 'none' }}>Eliminar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: Almacenes
// ═══════════════════════════════════════════════════════════════════════════════
interface Almacen extends SimpleItem { codigo: string; nombre: string; direccion?: string; ciudad?: string; pais?: string }

function AlmacenesSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Almacen>('/wms/almacenes/', ['wms-almacenes'])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Almacen | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', direccion: '', ciudad: '', pais: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Almacen) => {
    if (item) { setEditing(item); setForm({ codigo: item.codigo, nombre: item.nombre, direccion: item.direccion ?? '', ciudad: item.ciudad ?? '', pais: item.pais ?? '' }) }
    else { setEditing(null); setForm({ codigo: '', nombre: '', direccion: '', ciudad: '', pais: '' }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre) { toast.error('Código y nombre son obligatorios'); return }
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Almacenes" subtitle="Instalaciones físicas del WMS" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Almacen[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'codigo', label: 'Código' }, { key: 'ciudad', label: 'Ciudad' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Almacén' : 'Nuevo Almacén'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <TextField label="Dirección" size="small" value={form.direccion} onChange={e => set('direccion', e.target.value)} fullWidth />
            <Stack direction="row" gap={1.5}>
              <TextField label="Ciudad" size="small" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="País" size="small" value={form.pais} onChange={e => set('pais', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Almacén" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: Zonas
// ═══════════════════════════════════════════════════════════════════════════════
interface Zona extends SimpleItem { codigo: string; nombre: string; almacen_id?: number; tipo?: string; temperatura_controlada?: boolean }
const TIPOS_ZONA = ['RECEPCION', 'ALMACENAMIENTO', 'DESPACHO', 'CUARENTENA', 'CROSS_DOCKING']

function ZonasSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Zona>('/wms/zonas/', ['wms-zonas'])
  const { data: almacenes = [] } = useQuery<Almacen[]>({ queryKey: ['wms-almacenes'], queryFn: () => api.get('/wms/almacenes/').then(r => r.data) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Zona | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', almacen_id: '', tipo: '', temperatura_controlada: false })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Zona) => {
    if (item) { setEditing(item); setForm({ codigo: item.codigo, nombre: item.nombre, almacen_id: item.almacen_id?.toString() ?? '', tipo: item.tipo ?? '', temperatura_controlada: item.temperatura_controlada ?? false }) }
    else { setEditing(null); setForm({ codigo: '', nombre: '', almacen_id: '', tipo: '', temperatura_controlada: false }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre) { toast.error('Código y nombre son obligatorios'); return }
    const payload: Record<string, unknown> = { codigo: form.codigo, nombre: form.nombre, temperatura_controlada: form.temperatura_controlada }
    if (form.almacen_id) payload.almacen_id = Number(form.almacen_id)
    if (form.tipo) payload.tipo = form.tipo
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Zonas" subtitle="Divisiones internas de los almacenes" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Zona[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'codigo', label: 'Código' }, { key: 'tipo', label: 'Tipo' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Zona' : 'Nueva Zona'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <TextField select label="Almacén" fullWidth size="small" value={form.almacen_id} onChange={e => set('almacen_id', e.target.value)}>
              <MenuItem value="">Sin almacén</MenuItem>
              {almacenes.map(a => <MenuItem key={a.id} value={a.id.toString()}>{a.nombre}</MenuItem>)}
            </TextField>
            <TextField select label="Tipo" fullWidth size="small" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <MenuItem value="">Sin tipo</MenuItem>
              {TIPOS_ZONA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <FormControlLabel
              control={<Switch checked={form.temperatura_controlada} onChange={e => set('temperatura_controlada', e.target.checked)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: WMS_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: WMS_COLOR } }} />}
              label={<Typography fontSize={13}>Temperatura controlada</Typography>}
            />
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Zona" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: Ubicaciones
// ═══════════════════════════════════════════════════════════════════════════════
interface Ubicacion extends SimpleItem { codigo: string; nombre: string; zona_id?: number; pasillo?: string; estanteria?: string; nivel?: string; posicion?: string; tipo?: string; capacidad_kg?: number; capacidad_m3?: number }
const TIPOS_UBIC = ['ESTANDAR', 'PALLET', 'SUELO', 'CAMARA_FRIO', 'RESTRINGIDA', 'CUARENTENA']

function UbicacionesSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Ubicacion>('/wms/ubicaciones/', ['wms-ubicaciones'])
  const { data: zonas = [] } = useQuery<Zona[]>({ queryKey: ['wms-zonas'], queryFn: () => api.get('/wms/zonas/').then(r => r.data) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Ubicacion | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', zona_id: '', pasillo: '', estanteria: '', nivel: '', posicion: '', tipo: '', capacidad_kg: '', capacidad_m3: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Ubicacion) => {
    if (item) {
      setEditing(item)
      setForm({ codigo: item.codigo, zona_id: item.zona_id?.toString() ?? '', pasillo: item.pasillo ?? '', estanteria: item.estanteria ?? '', nivel: item.nivel ?? '', posicion: item.posicion ?? '', tipo: item.tipo ?? '', capacidad_kg: item.capacidad_kg?.toString() ?? '', capacidad_m3: item.capacidad_m3?.toString() ?? '' })
    } else {
      setEditing(null)
      setForm({ codigo: '', zona_id: '', pasillo: '', estanteria: '', nivel: '', posicion: '', tipo: '', capacidad_kg: '', capacidad_m3: '' })
    }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo) { toast.error('El código es obligatorio'); return }
    const payload: Record<string, unknown> = { codigo: form.codigo }
    if (form.zona_id) payload.zona_id = Number(form.zona_id)
    if (form.pasillo) payload.pasillo = form.pasillo
    if (form.estanteria) payload.estanteria = form.estanteria
    if (form.nivel) payload.nivel = form.nivel
    if (form.posicion) payload.posicion = form.posicion
    if (form.tipo) payload.tipo = form.tipo
    if (form.capacidad_kg) payload.capacidad_kg = Number(form.capacidad_kg)
    if (form.capacidad_m3) payload.capacidad_m3 = Number(form.capacidad_m3)
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Ubicaciones" subtitle="Posiciones físicas dentro de las zonas" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Ubicacion[]).map(item => (
        <ItemCard key={item.id} item={{ ...item, nombre: item.codigo }}
          extraLabels={[{ key: 'tipo', label: 'Tipo' }, { key: 'pasillo', label: 'Pasillo' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Ubicación' : 'Nueva Ubicación'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} sx={{ flex: 1 }} />
              <TextField select label="Zona" size="small" value={form.zona_id} onChange={e => set('zona_id', e.target.value)} sx={{ flex: 2 }}>
                <MenuItem value="">Sin zona</MenuItem>
                {zonas.map(z => <MenuItem key={z.id} value={z.id.toString()}>{z.nombre}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Pasillo" size="small" value={form.pasillo} onChange={e => set('pasillo', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Estantería" size="small" value={form.estanteria} onChange={e => set('estanteria', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Nivel" size="small" value={form.nivel} onChange={e => set('nivel', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Posición" size="small" value={form.posicion} onChange={e => set('posicion', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <TextField select label="Tipo" fullWidth size="small" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <MenuItem value="">Sin tipo</MenuItem>
              {TIPOS_UBIC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <Stack direction="row" gap={1.5}>
              <TextField label="Capacidad (kg)" size="small" type="number" value={form.capacidad_kg} onChange={e => set('capacidad_kg', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Capacidad (m³)" size="small" type="number" value={form.capacidad_m3} onChange={e => set('capacidad_m3', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Ubicación" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: Productos
// ═══════════════════════════════════════════════════════════════════════════════
interface Producto extends SimpleItem { sku: string; nombre: string; categoria?: string; familia?: string; unidad_medida?: string; peso_kg?: number; volumen_m3?: number; requiere_refrigeracion?: boolean; requiere_serial?: boolean; requiere_lote?: boolean; vida_util_dias?: number }

function ProductosSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Producto>('/wms/productos/', ['wms-productos'])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ sku: '', nombre: '', categoria: '', familia: '', unidad_medida: '', peso_kg: '', volumen_m3: '', vida_util_dias: '', requiere_refrigeracion: false, requiere_serial: false, requiere_lote: false })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Producto) => {
    if (item) {
      setEditing(item)
      setForm({ sku: item.sku, nombre: item.nombre, categoria: item.categoria ?? '', familia: item.familia ?? '', unidad_medida: item.unidad_medida ?? '', peso_kg: item.peso_kg?.toString() ?? '', volumen_m3: item.volumen_m3?.toString() ?? '', vida_util_dias: item.vida_util_dias?.toString() ?? '', requiere_refrigeracion: item.requiere_refrigeracion ?? false, requiere_serial: item.requiere_serial ?? false, requiere_lote: item.requiere_lote ?? false })
    } else {
      setEditing(null)
      setForm({ sku: '', nombre: '', categoria: '', familia: '', unidad_medida: '', peso_kg: '', volumen_m3: '', vida_util_dias: '', requiere_refrigeracion: false, requiere_serial: false, requiere_lote: false })
    }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.sku || !form.nombre) { toast.error('SKU y nombre son obligatorios'); return }
    const payload: Record<string, unknown> = {
      sku: form.sku, nombre: form.nombre,
      requiere_refrigeracion: form.requiere_refrigeracion,
      requiere_serial: form.requiere_serial,
      requiere_lote: form.requiere_lote,
    }
    if (form.categoria) payload.categoria = form.categoria
    if (form.familia) payload.familia = form.familia
    if (form.unidad_medida) payload.unidad_medida = form.unidad_medida
    if (form.peso_kg) payload.peso_kg = Number(form.peso_kg)
    if (form.volumen_m3) payload.volumen_m3 = Number(form.volumen_m3)
    if (form.vida_util_dias) payload.vida_util_dias = Number(form.vida_util_dias)
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  const switchSx = { '& .MuiSwitch-switchBase.Mui-checked': { color: WMS_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: WMS_COLOR } }

  return (
    <SectionShell title="Productos" subtitle="Catálogo de SKUs del WMS" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Producto[]).map(item => (
        <ItemCard key={item.id} item={{ ...item, nombre: item.nombre }}
          extraLabels={[{ key: 'sku', label: 'SKU' }, { key: 'categoria', label: 'Categoría' }, { key: 'unidad_medida', label: 'Unidad' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="SKU *" size="small" value={form.sku} onChange={e => set('sku', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Categoría" size="small" value={form.categoria} onChange={e => set('categoria', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Familia" size="small" value={form.familia} onChange={e => set('familia', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Unidad de medida" size="small" value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Peso (kg)" size="small" type="number" value={form.peso_kg} onChange={e => set('peso_kg', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Volumen (m³)" size="small" type="number" value={form.volumen_m3} onChange={e => set('volumen_m3', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Vida útil (días)" size="small" type="number" value={form.vida_util_dias} onChange={e => set('vida_util_dias', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={2} flexWrap="wrap">
              <FormControlLabel control={<Switch checked={form.requiere_refrigeracion} onChange={e => set('requiere_refrigeracion', e.target.checked)} sx={switchSx} />} label={<Typography fontSize={12}>Requiere refrigeración</Typography>} />
              <FormControlLabel control={<Switch checked={form.requiere_serial} onChange={e => set('requiere_serial', e.target.checked)} sx={switchSx} />} label={<Typography fontSize={12}>Requiere serial</Typography>} />
              <FormControlLabel control={<Switch checked={form.requiere_lote} onChange={e => set('requiere_lote', e.target.checked)} sx={switchSx} />} label={<Typography fontSize={12}>Requiere lote</Typography>} />
            </Stack>
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Producto" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5: Lotes
// ═══════════════════════════════════════════════════════════════════════════════
interface Lote extends SimpleItem { numero_lote: string; producto_id?: number; fecha_fabricacion?: string; fecha_vencimiento?: string; proveedor_lote?: string }

function LotesSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Lote>('/wms/lotes/', ['wms-lotes'])
  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ['wms-productos'], queryFn: () => api.get('/wms/productos/').then(r => r.data) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Lote | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ numero_lote: '', producto_id: '', fecha_fabricacion: '', fecha_vencimiento: '', proveedor_lote: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Lote) => {
    if (item) { setEditing(item); setForm({ numero_lote: item.numero_lote, producto_id: item.producto_id?.toString() ?? '', fecha_fabricacion: item.fecha_fabricacion ?? '', fecha_vencimiento: item.fecha_vencimiento ?? '', proveedor_lote: item.proveedor_lote ?? '' }) }
    else { setEditing(null); setForm({ numero_lote: '', producto_id: '', fecha_fabricacion: '', fecha_vencimiento: '', proveedor_lote: '' }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.numero_lote) { toast.error('El número de lote es obligatorio'); return }
    const payload: Record<string, unknown> = { numero_lote: form.numero_lote }
    if (form.producto_id) payload.producto_id = Number(form.producto_id)
    if (form.fecha_fabricacion) payload.fecha_fabricacion = form.fecha_fabricacion
    if (form.fecha_vencimiento) payload.fecha_vencimiento = form.fecha_vencimiento
    if (form.proveedor_lote) payload.proveedor_lote = form.proveedor_lote
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Lotes" subtitle="Trazabilidad por número de lote" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Lote[]).map(item => (
        <ItemCard key={item.id} item={{ ...item, nombre: item.numero_lote }}
          extraLabels={[{ key: 'fecha_vencimiento', label: 'Vencimiento' }, { key: 'proveedor_lote', label: 'Proveedor' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Lote' : 'Nuevo Lote'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <TextField label="Número de lote *" fullWidth size="small" value={form.numero_lote} onChange={e => set('numero_lote', e.target.value)} />
            <TextField select label="Producto" fullWidth size="small" value={form.producto_id} onChange={e => set('producto_id', e.target.value)}>
              <MenuItem value="">Sin producto</MenuItem>
              {productos.map(p => <MenuItem key={p.id} value={p.id.toString()}>{p.nombre} ({p.sku})</MenuItem>)}
            </TextField>
            <Stack direction="row" gap={1.5}>
              <TextField label="Fecha fabricación" size="small" type="date" value={form.fecha_fabricacion} onChange={e => set('fecha_fabricacion', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
              <TextField label="Fecha vencimiento" size="small" type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField label="Proveedor del lote" fullWidth size="small" value={form.proveedor_lote} onChange={e => set('proveedor_lote', e.target.value)} />
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Lote" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 6: Proveedores WMS
// ═══════════════════════════════════════════════════════════════════════════════
interface ProveedorWMS extends SimpleItem { codigo: string; nombre: string; nit?: string; contacto?: string; email?: string; telefono?: string; ciudad?: string; pais?: string }

function ProveedoresWMSSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<ProveedorWMS>('/wms/proveedores/', ['wms-proveedores'])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProveedorWMS | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', nit: '', contacto: '', email: '', telefono: '', ciudad: '', pais: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: ProveedorWMS) => {
    if (item) { setEditing(item); setForm({ codigo: item.codigo, nombre: item.nombre, nit: item.nit ?? '', contacto: item.contacto ?? '', email: item.email ?? '', telefono: item.telefono ?? '', ciudad: item.ciudad ?? '', pais: item.pais ?? '' }) }
    else { setEditing(null); setForm({ codigo: '', nombre: '', nit: '', contacto: '', email: '', telefono: '', ciudad: '', pais: '' }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre) { toast.error('Código y nombre son obligatorios'); return }
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Proveedores" subtitle="Empresas proveedoras de mercancía" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as ProveedorWMS[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'codigo', label: 'Código' }, { key: 'nit', label: 'NIT' }, { key: 'ciudad', label: 'Ciudad' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="NIT" size="small" value={form.nit} onChange={e => set('nit', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Contacto" size="small" value={form.contacto} onChange={e => set('contacto', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Email" size="small" type="email" value={form.email} onChange={e => set('email', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Teléfono" size="small" value={form.telefono} onChange={e => set('telefono', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Ciudad" size="small" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="País" size="small" value={form.pais} onChange={e => set('pais', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Proveedor" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 7: Clientes WMS
// ═══════════════════════════════════════════════════════════════════════════════
interface ClienteWMS extends SimpleItem { codigo: string; nombre: string; nit?: string; contacto?: string; email?: string; telefono?: string; ciudad?: string; pais?: string; segmento?: string }

function ClientesWMSSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<ClienteWMS>('/wms/clientes/', ['wms-clientes'])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ClienteWMS | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', nit: '', contacto: '', email: '', telefono: '', ciudad: '', pais: '', segmento: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: ClienteWMS) => {
    if (item) { setEditing(item); setForm({ codigo: item.codigo, nombre: item.nombre, nit: item.nit ?? '', contacto: item.contacto ?? '', email: item.email ?? '', telefono: item.telefono ?? '', ciudad: item.ciudad ?? '', pais: item.pais ?? '', segmento: item.segmento ?? '' }) }
    else { setEditing(null); setForm({ codigo: '', nombre: '', nit: '', contacto: '', email: '', telefono: '', ciudad: '', pais: '', segmento: '' }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre) { toast.error('Código y nombre son obligatorios'); return }
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Clientes" subtitle="Clientes que reciben mercancía del WMS" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as ClienteWMS[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'codigo', label: 'Código' }, { key: 'nit', label: 'NIT' }, { key: 'segmento', label: 'Segmento' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="NIT" size="small" value={form.nit} onChange={e => set('nit', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Segmento" size="small" value={form.segmento} onChange={e => set('segmento', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Contacto" size="small" value={form.contacto} onChange={e => set('contacto', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Teléfono" size="small" value={form.telefono} onChange={e => set('telefono', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <TextField label="Email" size="small" type="email" fullWidth value={form.email} onChange={e => set('email', e.target.value)} />
            <Stack direction="row" gap={1.5}>
              <TextField label="Ciudad" size="small" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="País" size="small" value={form.pais} onChange={e => set('pais', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Cliente" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 8: Transportadoras
// ═══════════════════════════════════════════════════════════════════════════════
interface Transportadora extends SimpleItem { codigo: string; nombre: string; nit?: string; contacto?: string; telefono?: string }

function TransportadorasSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Transportadora>('/wms/transportadoras/', ['wms-transportadoras'])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transportadora | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', nit: '', contacto: '', telefono: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Transportadora) => {
    if (item) { setEditing(item); setForm({ codigo: item.codigo, nombre: item.nombre, nit: item.nit ?? '', contacto: item.contacto ?? '', telefono: item.telefono ?? '' }) }
    else { setEditing(null); setForm({ codigo: '', nombre: '', nit: '', contacto: '', telefono: '' }) }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre) { toast.error('Código y nombre son obligatorios'); return }
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Transportadoras" subtitle="Empresas de transporte y logística" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Transportadora[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'codigo', label: 'Código' }, { key: 'nit', label: 'NIT' }, { key: 'telefono', label: 'Teléfono' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Transportadora' : 'Nueva Transportadora'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <TextField label="NIT" fullWidth size="small" value={form.nit} onChange={e => set('nit', e.target.value)} />
            <Stack direction="row" gap={1.5}>
              <TextField label="Contacto" size="small" value={form.contacto} onChange={e => set('contacto', e.target.value)} sx={{ flex: 2 }} />
              <TextField label="Teléfono" size="small" value={form.telefono} onChange={e => set('telefono', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Transportadora" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 9: Devoluciones (read-only list)
// ═══════════════════════════════════════════════════════════════════════════════
interface Devolucion { id: number; numero_devolucion: string; tipo: string; estado: string; motivo?: string; fecha_recepcion?: string }

function DevolucionesListSection() {
  const { data: devoluciones = [], isLoading } = useQuery<Devolucion[]>({
    queryKey: ['wms-devoluciones'],
    queryFn: () => api.get('/wms/devoluciones/').then(r => r.data),
  })

  const TIPO_CFG: Record<string, { color: string; bg: string }> = {
    CLIENTE:   { color: '#1E40AF', bg: '#DBEAFE' },
    PROVEEDOR: { color: '#4338CA', bg: '#E0E7FF' },
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography fontSize={14} fontWeight={700}>Devoluciones</Typography>
          <Typography fontSize={12} color="text.secondary">Registro histórico de todas las devoluciones</Typography>
        </Box>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} sx={{ color: WMS_COLOR }} /></Box>
      ) : devoluciones.length === 0 ? (
        <Typography fontSize={13} color="text.secondary" textAlign="center" py={2}>Sin devoluciones registradas</Typography>
      ) : (
        <Stack gap={0.75}>
          {devoluciones.map(d => {
            const cfg = TIPO_CFG[d.tipo] ?? { color: '#374151', bg: '#F3F4F6' }
            return (
              <Paper key={d.id} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5 }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Box flex={1}>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography fontSize={13} fontWeight={700} fontFamily="monospace">{d.numero_devolucion}</Typography>
                      <Chip label={d.tipo} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      <Chip label={d.estado} size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontSize: 10, height: 20 }} />
                    </Stack>
                    {d.motivo && <Typography fontSize={11} color="text.secondary" mt={0.25}>{d.motivo}</Typography>}
                    {d.fecha_recepcion && <Typography fontSize={11} color="text.secondary">Recepción: {d.fecha_recepcion}</Typography>}
                  </Box>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}

// ─── Shared helper components ──────────────────────────────────────────────────
function SectionShell({ title, subtitle, onNew, isLoading, children }: { title: string; subtitle: string; onNew: () => void; isLoading: boolean; children: React.ReactNode }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography fontSize={14} fontWeight={700}>{title}</Typography>
          <Typography fontSize={12} color="text.secondary">{subtitle}</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onNew}
          sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(WMS_COLOR, 0.5), color: WMS_COLOR }}>
          Nuevo
        </Button>
      </Stack>
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} sx={{ color: WMS_COLOR }} /></Box>
      ) : (
        <Stack gap={0.75}>{children}</Stack>
      )}
    </Box>
  )
}

function CrudActions({ onCancel, isPending, editing }: { onCancel: () => void; isPending: boolean; editing: boolean }) {
  return (
    <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
      <Button size="small" onClick={onCancel} sx={{ textTransform: 'none' }}>Cancelar</Button>
      <Button type="submit" size="small" variant="contained" disabled={isPending}
        startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
        sx={{ textTransform: 'none', bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1E3A8A' } }}>
        {editing ? 'Guardar' : 'Crear'}
      </Button>
    </DialogActions>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function WMSConfig() {
  const [tab, setTab] = useState(0)

  const tabs = [
    'Almacenes', 'Zonas', 'Ubicaciones', 'Productos', 'Lotes',
    'Proveedores', 'Clientes', 'Transportadoras', 'Devoluciones',
  ]

  const GUIDE = [
    { step: '1', text: 'Crea los Almacenes físicos antes de configurar zonas y ubicaciones.' },
    { step: '2', text: 'Divide cada almacén en Zonas por función: Recepción, Almacenamiento, Despacho.' },
    { step: '3', text: 'Define Ubicaciones (pasillos, estanterías, niveles) dentro de cada zona.' },
    { step: '4', text: 'Registra los Productos con su SKU, peso y requisitos de trazabilidad.' },
    { step: '5', text: 'Los Lotes permiten rastrear mercancía por fecha de vencimiento y origen.' },
    { step: '6', text: 'Registra Proveedores y Clientes para asociarlos a recepciones y despachos.' },
    { step: '7', text: 'Las Transportadoras se usan al crear Despachos y órdenes de entrega.' },
    { step: '8', text: 'Consulta el historial completo de Devoluciones desde la última pestaña.' },
  ]

  return (
    <Layout title="WMS — Configuración">
      <Box mb={3}>
        <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
          Configuración WMS
        </Typography>
        <Typography fontSize={13} color="text.secondary" mt={0.25}>
          Catálogos y parámetros del módulo de gestión de almacenes
        </Typography>
      </Box>

      <Tabs
        value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 3, borderBottom: '1px solid #E5E7EB', '& .MuiTabs-indicator': { bgcolor: WMS_COLOR } }}
      >
        {tabs.map((label, i) => (
          <Tab key={i} label={label}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: WMS_COLOR } }} />
        ))}
      </Tabs>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {tab === 0 && <AlmacenesSection />}
          {tab === 1 && <ZonasSection />}
          {tab === 2 && <UbicacionesSection />}
          {tab === 3 && <ProductosSection />}
          {tab === 4 && <LotesSection />}
          {tab === 5 && <ProveedoresWMSSection />}
          {tab === 6 && <ClientesWMSSection />}
          {tab === 7 && <TransportadorasSection />}
          {tab === 8 && <DevolucionesListSection />}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: `1px solid ${alpha(WMS_COLOR, 0.2)}`, borderRadius: '14px', p: 2.5, bgcolor: alpha(WMS_COLOR, 0.03) }}>
            <Typography fontSize={13} fontWeight={700} color={WMS_COLOR} mb={1}>
              Guia de configuracion
            </Typography>
            <Stack gap={1}>
              {GUIDE.map(g => (
                <Stack key={g.step} direction="row" gap={1} alignItems="flex-start">
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: WMS_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
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
