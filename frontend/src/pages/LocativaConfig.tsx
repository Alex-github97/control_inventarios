import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Button, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tab, Tabs,
  List, ListItem, ListItemText, Divider, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ML_COLOR = '#0D9488'

interface Sede { id: number; nombre: string; ciudad: string | null; direccion: string | null }
interface Espacio { id: number; nombre: string; tipo: string | null; sede_id: number; sede_nombre: string | null }
interface Categoria { id: number; nombre: string; descripcion: string | null }
interface ModoFalla { id: number; codigo: string; descripcion: string; categoria_iso: string | null }
interface CatalogoTarea { id: number; nombre: string; tipo: string; duracion_estimada_h: number | null }
interface Proveedor { id: number; nombre: string; especialidad: string | null; contacto: string | null }

const TIPOS_ESPACIO = ['OFICINA', 'BODEGA', 'TALLER', 'AREA_COMUN', 'ZONA_CARGA', 'PARQUEADERO', 'OTRO']
const TIPOS_TAREA = ['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'MEJORATIVO', 'INSPECCION']

export default function LocativaConfig() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({})

  const tabs = ['Sedes', 'Espacios', 'Categorías', 'Modos de falla', 'Catálogo de tareas', 'Proveedores']

  const { data: sedes = [] } = useQuery<Sede[]>({ queryKey: ['locativa-sedes'], queryFn: () => api.get('/locativa/sedes/').then(r => r.data) })
  const { data: espacios = [] } = useQuery<Espacio[]>({ queryKey: ['locativa-espacios'], queryFn: () => api.get('/locativa/espacios/').then(r => r.data) })
  const { data: categorias = [] } = useQuery<Categoria[]>({ queryKey: ['locativa-categorias'], queryFn: () => api.get('/locativa/categorias/').then(r => r.data) })
  const { data: modosFalla = [] } = useQuery<ModoFalla[]>({ queryKey: ['locativa-modos-falla'], queryFn: () => api.get('/locativa/modos-falla/').then(r => r.data) })
  const { data: catalogo = [] } = useQuery<CatalogoTarea[]>({ queryKey: ['locativa-catalogo-tareas'], queryFn: () => api.get('/locativa/catalogo-tareas/').then(r => r.data) })
  const { data: proveedores = [] } = useQuery<Proveedor[]>({ queryKey: ['locativa-proveedores'], queryFn: () => api.get('/locativa/proveedores/').then(r => r.data) })

  const MUTATIONS = [
    useMutation({ mutationFn: (d: any) => api.post('/locativa/sedes/', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-sedes'] }); setOpen(false); toast.success('Sede creada') }, onError: () => toast.error('Error') }),
    useMutation({ mutationFn: (d: any) => api.post('/locativa/espacios/', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-espacios'] }); setOpen(false); toast.success('Espacio creado') }, onError: () => toast.error('Error') }),
    useMutation({ mutationFn: (d: any) => api.post('/locativa/categorias/', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-categorias'] }); setOpen(false); toast.success('Categoría creada') }, onError: () => toast.error('Error') }),
    useMutation({ mutationFn: (d: any) => api.post('/locativa/modos-falla/', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-modos-falla'] }); setOpen(false); toast.success('Modo de falla creado') }, onError: () => toast.error('Error') }),
    useMutation({ mutationFn: (d: any) => api.post('/locativa/catalogo-tareas/', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-catalogo-tareas'] }); setOpen(false); toast.success('Tarea creada') }, onError: () => toast.error('Error') }),
    useMutation({ mutationFn: (d: any) => api.post('/locativa/proveedores/', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-proveedores'] }); setOpen(false); toast.success('Proveedor creado') }, onError: () => toast.error('Error') }),
  ]

  const EMPTY_FORMS: any[] = [
    { nombre: '', ciudad: '', direccion: '' },
    { nombre: '', tipo: 'BODEGA', sede_id: '' },
    { nombre: '', descripcion: '' },
    { codigo: '', descripcion: '', categoria_iso: '' },
    { nombre: '', tipo: 'PREVENTIVO', duracion_estimada_h: '' },
    { nombre: '', especialidad: '', contacto: '', email: '', telefono: '' },
  ]

  const handleOpen = () => { setForm({ ...EMPTY_FORMS[tab] }); setOpen(true) }
  const handleSave = () => {
    const payload: any = { ...form }
    if (tab === 1 && payload.sede_id) payload.sede_id = Number(payload.sede_id)
    if (tab === 4 && payload.duracion_estimada_h) payload.duracion_estimada_h = Number(payload.duracion_estimada_h)
    MUTATIONS[tab].mutate(payload)
  }
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p: any) => ({ ...p, [k]: e.target.value }))

  const renderList = () => {
    if (tab === 0) return (
      <List disablePadding>
        {(sedes as Sede[]).map((s, i) => (
          <React.Fragment key={s.id}>
            <ListItem sx={{ py: 1.25 }}>
              <ListItemText
                primary={<Typography fontWeight={600} fontSize={14}>{s.nombre}</Typography>}
                secondary={[s.ciudad, s.direccion].filter(Boolean).join(' · ')}
              />
            </ListItem>
            {i < sedes.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    )
    if (tab === 1) return (
      <List disablePadding>
        {(espacios as Espacio[]).map((e, i) => (
          <React.Fragment key={e.id}>
            <ListItem sx={{ py: 1.25 }}>
              <ListItemText
                primary={<Typography fontWeight={600} fontSize={14}>{e.nombre}</Typography>}
                secondary={`${e.tipo ?? 'Sin tipo'} · ${e.sede_nombre ?? 'Sin sede'}`}
              />
            </ListItem>
            {i < espacios.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    )
    if (tab === 2) return (
      <List disablePadding>
        {(categorias as Categoria[]).map((c, i) => (
          <React.Fragment key={c.id}>
            <ListItem sx={{ py: 1.25 }}>
              <ListItemText
                primary={<Typography fontWeight={600} fontSize={14}>{c.nombre}</Typography>}
                secondary={c.descripcion ?? ''}
              />
            </ListItem>
            {i < categorias.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    )
    if (tab === 3) return (
      <List disablePadding>
        {(modosFalla as ModoFalla[]).map((m, i) => (
          <React.Fragment key={m.id}>
            <ListItem sx={{ py: 1.25 }}>
              <ListItemText
                primary={<Typography fontWeight={600} fontSize={14}>{m.codigo} — {m.descripcion}</Typography>}
                secondary={m.categoria_iso ?? 'Sin categoría ISO 14224'}
              />
            </ListItem>
            {i < modosFalla.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    )
    if (tab === 4) return (
      <List disablePadding>
        {(catalogo as CatalogoTarea[]).map((t, i) => (
          <React.Fragment key={t.id}>
            <ListItem sx={{ py: 1.25 }}>
              <ListItemText
                primary={<Typography fontWeight={600} fontSize={14}>{t.nombre}</Typography>}
                secondary={`${t.tipo} · ${t.duracion_estimada_h ? `${t.duracion_estimada_h}h estimadas` : 'Sin duración estimada'}`}
              />
            </ListItem>
            {i < catalogo.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    )
    if (tab === 5) return (
      <List disablePadding>
        {(proveedores as Proveedor[]).map((p, i) => (
          <React.Fragment key={p.id}>
            <ListItem sx={{ py: 1.25 }}>
              <ListItemText
                primary={<Typography fontWeight={600} fontSize={14}>{p.nombre}</Typography>}
                secondary={[p.especialidad, p.contacto].filter(Boolean).join(' · ')}
              />
            </ListItem>
            {i < proveedores.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    )
    return null
  }

  const renderForm = () => {
    if (tab === 0) return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Nombre *" value={form.nombre ?? ''} onChange={f('nombre')} /></Grid>
        <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="Ciudad" value={form.ciudad ?? ''} onChange={f('ciudad')} /></Grid>
        <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="Dirección" value={form.direccion ?? ''} onChange={f('direccion')} /></Grid>
      </Grid>
    )
    if (tab === 1) return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Nombre *" value={form.nombre ?? ''} onChange={f('nombre')} /></Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" select label="Tipo" value={form.tipo ?? 'BODEGA'} onChange={f('tipo')}>
            {TIPOS_ESPACIO.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" select label="Sede" value={form.sede_id ?? ''} onChange={f('sede_id')}>
            <MenuItem value="">Sin sede</MenuItem>
            {sedes.map((s: Sede) => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>
    )
    if (tab === 2) return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Nombre *" value={form.nombre ?? ''} onChange={f('nombre')} /></Grid>
        <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Descripción" value={form.descripcion ?? ''} onChange={f('descripcion')} /></Grid>
      </Grid>
    )
    if (tab === 3) return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 5 }}><TextField fullWidth size="small" label="Código *" value={form.codigo ?? ''} onChange={f('codigo')} /></Grid>
        <Grid size={{ xs: 7 }}><TextField fullWidth size="small" label="Descripción *" value={form.descripcion ?? ''} onChange={f('descripcion')} /></Grid>
        <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Categoría ISO 14224" value={form.categoria_iso ?? ''} onChange={f('categoria_iso')} /></Grid>
      </Grid>
    )
    if (tab === 4) return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Nombre *" value={form.nombre ?? ''} onChange={f('nombre')} /></Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" select label="Tipo" value={form.tipo ?? 'PREVENTIVO'} onChange={f('tipo')}>
            {TIPOS_TAREA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6 }}><TextField fullWidth size="small" type="number" label="Duración estimada (h)" value={form.duracion_estimada_h ?? ''} onChange={f('duracion_estimada_h')} /></Grid>
      </Grid>
    )
    if (tab === 5) return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Nombre *" value={form.nombre ?? ''} onChange={f('nombre')} /></Grid>
        <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="Especialidad" value={form.especialidad ?? ''} onChange={f('especialidad')} /></Grid>
        <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="Contacto" value={form.contacto ?? ''} onChange={f('contacto')} /></Grid>
        <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="Email" value={form.email ?? ''} onChange={f('email')} /></Grid>
        <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="Teléfono" value={form.telefono ?? ''} onChange={f('telefono')} /></Grid>
      </Grid>
    )
    return null
  }

  const COUNTS = [sedes.length, espacios.length, categorias.length, modosFalla.length, catalogo.length, proveedores.length]

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>Configuración</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Agregar
          </Button>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: ML_COLOR }, '& .MuiTabs-indicator': { bgcolor: ML_COLOR } }}
        >
          {tabs.map((t, i) => <Tab key={t} label={`${t} (${COUNTS[i]})`} />)}
        </Tabs>

        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          {COUNTS[tab] === 0 ? (
            <Box textAlign="center" py={8} color="text.secondary">
              <Typography>No hay registros. Usa el botón "Agregar" para crear el primero.</Typography>
            </Box>
          ) : (
            renderList()
          )}
        </Paper>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Agregar {tabs[tab].replace(/s$/, '').toLowerCase()}
            <IconButton onClick={() => setOpen(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {renderForm()}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!form.nombre && !form.codigo && !form.descripcion}
              sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
