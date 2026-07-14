import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Tooltip,
  CircularProgress, alpha, Switch, FormControlLabel, Chip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GH_COLOR = '#BE185D'

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
  extraLabels?: { key: string; label: string; value?: string }[]
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Paper elevation={0} sx={{
      border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5,
      '&:hover': { borderColor: alpha(GH_COLOR, 0.3) }, transition: 'border-color 0.12s',
    }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Box flex={1}>
          <Typography fontSize={13} fontWeight={600}>{item.nombre ?? String(item.id)}</Typography>
          {extraLabels?.map(el => {
            const val = el.value ?? (item[el.key] != null ? String(item[el.key]) : undefined)
            return val ? (
              <Typography key={el.key} fontSize={11} color="text.secondary">
                {el.label}: {val}
              </Typography>
            ) : null
          })}
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
          sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(GH_COLOR, 0.5), color: GH_COLOR }}>
          Nuevo
        </Button>
      </Stack>
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} sx={{ color: GH_COLOR }} /></Box>
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
        sx={{ textTransform: 'none', bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}>
        {editing ? 'Guardar' : 'Crear'}
      </Button>
    </DialogActions>
  )
}

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: GH_COLOR },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: GH_COLOR },
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 0: Empresas
// ═══════════════════════════════════════════════════════════════════════════════
interface Empresa extends SimpleItem {
  nombre: string; nit: string; pais: string; ciudad?: string; telefono?: string; email?: string; activo: boolean
}

function EmpresasSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Empresa>('/hcm/empresas/', ['gh-empresas'])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Empresa | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ nombre: '', nit: '', pais: 'Colombia', ciudad: '', telefono: '', email: '', activo: true })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Empresa) => {
    if (item) {
      setEditing(item)
      setForm({ nombre: item.nombre, nit: item.nit, pais: item.pais, ciudad: item.ciudad ?? '', telefono: item.telefono ?? '', email: item.email ?? '', activo: item.activo })
    } else {
      setEditing(null)
      setForm({ nombre: '', nit: '', pais: 'Colombia', ciudad: '', telefono: '', email: '', activo: true })
    }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.nit) { toast.error('Nombre y NIT son obligatorios'); return }
    const payload: Record<string, unknown> = { nombre: form.nombre, nit: form.nit, pais: form.pais, activo: form.activo }
    if (form.ciudad) payload.ciudad = form.ciudad
    if (form.telefono) payload.telefono = form.telefono
    if (form.email) payload.email = form.email
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Empresas" subtitle="Empresas del grupo organizacional" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Empresa[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'nit', label: 'NIT' }, { key: 'ciudad', label: 'Ciudad' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <Stack direction="row" gap={1.5}>
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
              <TextField label="NIT *" size="small" value={form.nit} onChange={e => set('nit', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="País" size="small" value={form.pais} onChange={e => set('pais', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Ciudad" size="small" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Teléfono" size="small" value={form.telefono} onChange={e => set('telefono', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Email" size="small" type="email" value={form.email} onChange={e => set('email', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <FormControlLabel
              control={<Switch checked={form.activo} onChange={e => set('activo', e.target.checked)} sx={switchSx} />}
              label={<Typography fontSize={13}>Activo</Typography>}
            />
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Empresa" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: Sedes
// ═══════════════════════════════════════════════════════════════════════════════
interface Sede extends SimpleItem {
  nombre: string; empresa_id: number; ciudad?: string; departamento?: string; pais?: string; direccion?: string; telefono?: string; activo: boolean
}

function SedesSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Sede>('/hcm/sedes/', ['gh-sedes'])
  const { data: empresas = [] } = useQuery<Empresa[]>({ queryKey: ['gh-empresas'], queryFn: () => api.get('/hcm/empresas/').then(r => r.data) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Sede | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ nombre: '', empresa_id: '', ciudad: '', departamento: '', pais: '', direccion: '', telefono: '', activo: true })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: Sede) => {
    if (item) {
      setEditing(item)
      setForm({ nombre: item.nombre, empresa_id: item.empresa_id?.toString() ?? '', ciudad: item.ciudad ?? '', departamento: item.departamento ?? '', pais: item.pais ?? '', direccion: item.direccion ?? '', telefono: item.telefono ?? '', activo: item.activo })
    } else {
      setEditing(null)
      setForm({ nombre: '', empresa_id: '', ciudad: '', departamento: '', pais: '', direccion: '', telefono: '', activo: true })
    }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.empresa_id) { toast.error('Nombre y empresa son obligatorios'); return }
    const payload: Record<string, unknown> = { nombre: form.nombre, empresa_id: Number(form.empresa_id), activo: form.activo }
    if (form.ciudad) payload.ciudad = form.ciudad
    if (form.departamento) payload.departamento = form.departamento
    if (form.pais) payload.pais = form.pais
    if (form.direccion) payload.direccion = form.direccion
    if (form.telefono) payload.telefono = form.telefono
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Sedes" subtitle="Ubicaciones físicas de las empresas" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Sede[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'ciudad', label: 'Ciudad' }, { key: 'departamento', label: 'Departamento' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Sede' : 'Nueva Sede'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <TextField select label="Empresa *" fullWidth size="small" value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
              <MenuItem value="">Seleccione empresa</MenuItem>
              {empresas.map(emp => <MenuItem key={emp.id} value={emp.id.toString()}>{emp.nombre}</MenuItem>)}
            </TextField>
            <TextField label="Nombre *" fullWidth size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            <Stack direction="row" gap={1.5}>
              <TextField label="Ciudad" size="small" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Departamento" size="small" value={form.departamento} onChange={e => set('departamento', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="País" size="small" value={form.pais} onChange={e => set('pais', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Teléfono" size="small" value={form.telefono} onChange={e => set('telefono', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <TextField label="Dirección" fullWidth size="small" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
            <FormControlLabel
              control={<Switch checked={form.activo} onChange={e => set('activo', e.target.checked)} sx={switchSx} />}
              label={<Typography fontSize={13}>Activo</Typography>}
            />
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Sede" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: Áreas
// ═══════════════════════════════════════════════════════════════════════════════
interface Area extends SimpleItem {
  nombre: string; empresa_id: number; descripcion?: string; area_padre_id?: number | null; activo: boolean
}

function AreasSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Area>('/hcm/areas/', ['gh-areas'])
  const { data: empresas = [] } = useQuery<Empresa[]>({ queryKey: ['gh-empresas'], queryFn: () => api.get('/hcm/empresas/').then(r => r.data) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Area | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ nombre: '', empresa_id: '', descripcion: '', area_padre_id: '', activo: true })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const areasFiltradas = (items as Area[]).filter(a => form.empresa_id && a.empresa_id === Number(form.empresa_id) && (!editing || a.id !== editing.id))

  const openDialog = (item?: Area) => {
    if (item) {
      setEditing(item)
      setForm({ nombre: item.nombre, empresa_id: item.empresa_id?.toString() ?? '', descripcion: item.descripcion ?? '', area_padre_id: item.area_padre_id?.toString() ?? '', activo: item.activo })
    } else {
      setEditing(null)
      setForm({ nombre: '', empresa_id: '', descripcion: '', area_padre_id: '', activo: true })
    }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.empresa_id) { toast.error('Nombre y empresa son obligatorios'); return }
    const payload: Record<string, unknown> = { nombre: form.nombre, empresa_id: Number(form.empresa_id), activo: form.activo }
    if (form.descripcion) payload.descripcion = form.descripcion
    payload.area_padre_id = form.area_padre_id ? Number(form.area_padre_id) : null
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Áreas" subtitle="Departamentos y áreas organizativas" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Area[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'descripcion', label: 'Descripción' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Área' : 'Nueva Área'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <TextField select label="Empresa *" fullWidth size="small" value={form.empresa_id} onChange={e => { set('empresa_id', e.target.value); set('area_padre_id', '') }}>
              <MenuItem value="">Seleccione empresa</MenuItem>
              {empresas.map(emp => <MenuItem key={emp.id} value={emp.id.toString()}>{emp.nombre}</MenuItem>)}
            </TextField>
            <TextField label="Nombre *" fullWidth size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            <TextField label="Descripción" fullWidth size="small" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            <TextField select label="Área Padre (opcional)" fullWidth size="small" value={form.area_padre_id} onChange={e => set('area_padre_id', e.target.value)}>
              <MenuItem value="">Sin área padre</MenuItem>
              {areasFiltradas.map(a => <MenuItem key={a.id} value={a.id.toString()}>{a.nombre}</MenuItem>)}
            </TextField>
            <FormControlLabel
              control={<Switch checked={form.activo} onChange={e => set('activo', e.target.checked)} sx={switchSx} />}
              label={<Typography fontSize={13}>Activo</Typography>}
            />
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Área" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: Cargos
// ═══════════════════════════════════════════════════════════════════════════════
interface Cargo extends SimpleItem {
  nombre: string; empresa_id: number; area_id?: number | null; nivel: string; descripcion?: string; salario_minimo?: number; salario_maximo?: number; activo: boolean
}

const NIVELES_CARGO = ['OPERATIVO', 'TÁCTICO', 'ESTRATÉGICO']

function CargosSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<Cargo>('/hcm/cargos/', ['gh-cargos'])
  const { data: empresas = [] } = useQuery<Empresa[]>({ queryKey: ['gh-empresas'], queryFn: () => api.get('/hcm/empresas/').then(r => r.data) })
  const { data: areas = [] } = useQuery<Area[]>({ queryKey: ['gh-areas'], queryFn: () => api.get('/hcm/areas/').then(r => r.data) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cargo | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ nombre: '', empresa_id: '', area_id: '', nivel: '', descripcion: '', salario_minimo: '', salario_maximo: '', activo: true })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const areasFiltradas = (areas as Area[]).filter(a => form.empresa_id && a.empresa_id === Number(form.empresa_id))

  const openDialog = (item?: Cargo) => {
    if (item) {
      setEditing(item)
      setForm({ nombre: item.nombre, empresa_id: item.empresa_id?.toString() ?? '', area_id: item.area_id?.toString() ?? '', nivel: item.nivel, descripcion: item.descripcion ?? '', salario_minimo: item.salario_minimo?.toString() ?? '', salario_maximo: item.salario_maximo?.toString() ?? '', activo: item.activo })
    } else {
      setEditing(null)
      setForm({ nombre: '', empresa_id: '', area_id: '', nivel: '', descripcion: '', salario_minimo: '', salario_maximo: '', activo: true })
    }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.empresa_id || !form.nivel) { toast.error('Nombre, empresa y nivel son obligatorios'); return }
    const payload: Record<string, unknown> = { nombre: form.nombre, empresa_id: Number(form.empresa_id), nivel: form.nivel, activo: form.activo }
    payload.area_id = form.area_id ? Number(form.area_id) : null
    if (form.descripcion) payload.descripcion = form.descripcion
    if (form.salario_minimo) payload.salario_minimo = Number(form.salario_minimo)
    if (form.salario_maximo) payload.salario_maximo = Number(form.salario_maximo)
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Cargos" subtitle="Posiciones y niveles jerárquicos" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as Cargo[]).map(item => (
        <ItemCard key={item.id} item={item}
          extraLabels={[{ key: 'nivel', label: 'Nivel' }, { key: 'descripcion', label: 'Descripción' }]}
          onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Cargo' : 'Nuevo Cargo'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <TextField select label="Empresa *" fullWidth size="small" value={form.empresa_id} onChange={e => { set('empresa_id', e.target.value); set('area_id', '') }}>
              <MenuItem value="">Seleccione empresa</MenuItem>
              {empresas.map(emp => <MenuItem key={emp.id} value={emp.id.toString()}>{emp.nombre}</MenuItem>)}
            </TextField>
            <TextField select label="Área" fullWidth size="small" value={form.area_id} onChange={e => set('area_id', e.target.value)}>
              <MenuItem value="">Sin área</MenuItem>
              {areasFiltradas.map(a => <MenuItem key={a.id} value={a.id.toString()}>{a.nombre}</MenuItem>)}
            </TextField>
            <Stack direction="row" gap={1.5}>
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
              <TextField select label="Nivel *" size="small" value={form.nivel} onChange={e => set('nivel', e.target.value)} sx={{ flex: 1 }}>
                <MenuItem value="">Seleccione</MenuItem>
                {NIVELES_CARGO.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Descripción" fullWidth size="small" multiline rows={2} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            <Stack direction="row" gap={1.5}>
              <TextField label="Salario mínimo" size="small" type="number" value={form.salario_minimo} onChange={e => set('salario_minimo', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Salario máximo" size="small" type="number" value={form.salario_maximo} onChange={e => set('salario_maximo', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <FormControlLabel
              control={<Switch checked={form.activo} onChange={e => set('activo', e.target.checked)} sx={switchSx} />}
              label={<Typography fontSize={13}>Activo</Typography>}
            />
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Cargo" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: Centros de Costo
// ═══════════════════════════════════════════════════════════════════════════════
interface CentroCosto extends SimpleItem {
  codigo: string; nombre: string; empresa_id: number; activo: boolean
}

function CentrosCostoSection() {
  const { data: items, isLoading, create, update, remove } = useCatalog<CentroCosto>('/hcm/centros-costo/', ['gh-centros-costo'])
  const { data: empresas = [] } = useQuery<Empresa[]>({ queryKey: ['gh-empresas'], queryFn: () => api.get('/hcm/empresas/').then(r => r.data) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CentroCosto | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', empresa_id: '', activo: true })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const openDialog = (item?: CentroCosto) => {
    if (item) {
      setEditing(item)
      setForm({ codigo: item.codigo, nombre: item.nombre, empresa_id: item.empresa_id?.toString() ?? '', activo: item.activo })
    } else {
      setEditing(null)
      setForm({ codigo: '', nombre: '', empresa_id: '', activo: true })
    }
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre || !form.empresa_id) { toast.error('Código, nombre y empresa son obligatorios'); return }
    const payload: Record<string, unknown> = { codigo: form.codigo, nombre: form.nombre, empresa_id: Number(form.empresa_id), activo: form.activo }
    if (editing) update.mutate({ id: editing.id, d: payload }, { onSuccess: () => setOpen(false) })
    else create.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  return (
    <SectionShell title="Centros de Costo" subtitle="Unidades organizativas para asignación de costos" onNew={() => openDialog()} isLoading={isLoading}>
      {(items as CentroCosto[]).map(item => {
        const empresa = (empresas as Empresa[]).find(e => e.id === item.empresa_id)
        return (
          <ItemCard key={item.id} item={item}
            extraLabels={[
              { key: 'codigo', label: 'Código' },
              { key: 'empresa_id', label: 'Empresa', value: empresa?.nombre },
            ]}
            onEdit={() => openDialog(item)} onDelete={() => setDeleteId(item.id)} />
        )
      })}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{editing ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent><Stack gap={1.5} pt={0.5}>
            <TextField select label="Empresa *" fullWidth size="small" value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
              <MenuItem value="">Seleccione empresa</MenuItem>
              {empresas.map(emp => <MenuItem key={emp.id} value={emp.id.toString()}>{emp.nombre}</MenuItem>)}
            </TextField>
            <Stack direction="row" gap={1.5}>
              <TextField label="Código *" size="small" value={form.codigo} onChange={e => set('codigo', e.target.value)} inputProps={{ maxLength: 20 }} sx={{ flex: 1 }} />
              <TextField label="Nombre *" size="small" value={form.nombre} onChange={e => set('nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <FormControlLabel
              control={<Switch checked={form.activo} onChange={e => set('activo', e.target.checked)} sx={switchSx} />}
              label={<Typography fontSize={13}>Activo</Typography>}
            />
          </Stack></DialogContent>
          <CrudActions onCancel={() => setOpen(false)} isPending={create.isPending || update.isPending} editing={!!editing} />
        </Box>
      </Dialog>
      <ConfirmDelete open={deleteId !== null} title="Centro de Costo" onConfirm={() => { if (deleteId) remove.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }} onCancel={() => setDeleteId(null)} loading={remove.isPending} />
    </SectionShell>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GHConfig() {
  const [tab, setTab] = useState(0)
  const tabs = ['Empresas', 'Sedes', 'Áreas', 'Cargos', 'Centros de Costo']

  const GUIDE = [
    { step: '1', text: 'Registra las Empresas del grupo antes de configurar sedes y áreas.' },
    { step: '2', text: 'Cada Sede representa una ubicación física de una empresa.' },
    { step: '3', text: 'Las Áreas organizan los departamentos dentro de cada empresa.' },
    { step: '4', text: 'Los Cargos definen las posiciones y niveles jerárquicos.' },
    { step: '5', text: 'Los Centros de Costo permiten asociar costos a unidades organizativas.' },
  ]

  return (
    <Layout title="GH — Configuración">
      {/* Header */}
      <Box mb={3}>
        <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
          Configuración Gestión Humana
        </Typography>
        <Typography fontSize={13} color="text.secondary" mt={0.25}>
          Catálogos y parámetros del módulo de gestión humana
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 3, borderBottom: '1px solid #E5E7EB', '& .MuiTabs-indicator': { bgcolor: GH_COLOR } }}>
        {tabs.map((label, i) => (
          <Tab key={i} label={label}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GH_COLOR } }} />
        ))}
      </Tabs>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {tab === 0 && <EmpresasSection />}
          {tab === 1 && <SedesSection />}
          {tab === 2 && <AreasSection />}
          {tab === 3 && <CargosSection />}
          {tab === 4 && <CentrosCostoSection />}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: `1px solid ${alpha(GH_COLOR, 0.2)}`, borderRadius: '14px', p: 2.5, bgcolor: alpha(GH_COLOR, 0.03) }}>
            <Typography fontSize={13} fontWeight={700} color={GH_COLOR} mb={1}>Guía de configuración</Typography>
            <Stack gap={1}>
              {GUIDE.map(g => (
                <Stack key={g.step} direction="row" gap={1} alignItems="flex-start">
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: GH_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
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
