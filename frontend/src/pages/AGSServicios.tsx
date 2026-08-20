/**
 * AGS · Servicios — el catálogo con precio y duración preconfigurados.
 *
 * Es la base de todo el módulo: la duración alimenta la agenda y el precio
 * alimenta los ingresos, así que se edita aquí una vez y no cita por cita.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Card, CardContent, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel, alpha, Tooltip, Menu,
  ListItemIcon, ListItemText, InputAdornment, Alert, Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add, Edit, Delete, MoreVert, Search, ContentCut, Home,
  Inventory2, Download,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarExcel } from '@/utils/exportar'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtMinutos, type Servicio, type Categoria,
} from '@/utils/ags'

const SERVICIO_VACIO = {
  nombre: '', categoria_id: null as number | null, descripcion: '',
  duracion_min: 30, precio: 0, costo_insumos: 0,
  comision_pct: null as number | null,
  permite_domicilio: false, cobra_materiales: false, requiere_anticipo: false,
  activo: true,
}

export default function AGSServicios() {
  const qc = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState<number | 'todas'>('todas')
  const [soloActivos, setSoloActivos] = useState(false)

  const [dlgServicio, setDlgServicio] = useState<{ abierto: boolean; item: Servicio | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...SERVICIO_VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  const [dlgCat, setDlgCat] = useState<{ abierto: boolean; item: Categoria | null }>(
    { abierto: false, item: null })
  const [formCat, setFormCat] = useState({ nombre: '', descripcion: '', color: AGS_COLOR, activo: true })
  const [catWasOpen, setCatWasOpen] = useState(false)

  const [menu, setMenu] = useState<{ el: HTMLElement; item: Servicio } | null>(null)

  if (dlgServicio.abierto && !wasOpen) {
    setWasOpen(true)
    setForm(dlgServicio.item
      ? {
        nombre: dlgServicio.item.nombre,
        categoria_id: dlgServicio.item.categoria_id ?? null,
        descripcion: dlgServicio.item.descripcion ?? '',
        duracion_min: dlgServicio.item.duracion_min,
        precio: dlgServicio.item.precio,
        costo_insumos: dlgServicio.item.costo_insumos ?? 0,
        comision_pct: dlgServicio.item.comision_pct ?? null,
        permite_domicilio: Boolean(dlgServicio.item.permite_domicilio),
        cobra_materiales: Boolean(dlgServicio.item.cobra_materiales),
        requiere_anticipo: Boolean(dlgServicio.item.requiere_anticipo),
        activo: dlgServicio.item.activo !== false,
      }
      : { ...SERVICIO_VACIO })
  }
  if (!dlgServicio.abierto && wasOpen) setWasOpen(false)

  if (dlgCat.abierto && !catWasOpen) {
    setCatWasOpen(true)
    setFormCat(dlgCat.item
      ? {
        nombre: dlgCat.item.nombre, descripcion: dlgCat.item.descripcion ?? '',
        color: dlgCat.item.color ?? AGS_COLOR, activo: dlgCat.item.activo !== false,
      }
      : { nombre: '', descripcion: '', color: AGS_COLOR, activo: true })
  }
  if (!dlgCat.abierto && catWasOpen) setCatWasOpen(false)

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['ags-categorias'],
    queryFn: async () => (await api.get('/ags/categorias')).data,
  })
  const { data: servicios = [] } = useQuery<Servicio[]>({
    queryKey: ['ags-servicios'],
    queryFn: async () => (await api.get('/ags/servicios')).data,
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['ags-servicios'] })
    qc.invalidateQueries({ queryKey: ['ags-servicios-activos'] })
    qc.invalidateQueries({ queryKey: ['ags-categorias'] })
  }

  const guardarServicio = useMutation({
    mutationFn: async () => dlgServicio.item
      ? (await api.put(`/ags/servicios/${dlgServicio.item.id}`, form)).data
      : (await api.post('/ags/servicios', form)).data,
    onSuccess: () => {
      toast.success(dlgServicio.item ? 'Servicio actualizado' : 'Servicio creado')
      invalidar()
      setDlgServicio({ abierto: false, item: null })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar'),
  })

  const eliminarServicio = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/ags/servicios/${id}`)).data,
    onSuccess: () => {
      toast.success('Servicio eliminado. Si ya se había vendido, quedó desactivado para no afectar el histórico.')
      invalidar()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo eliminar'),
  })

  const alternarActivo = useMutation({
    mutationFn: async (s: Servicio) =>
      (await api.put(`/ags/servicios/${s.id}`, { nombre: s.nombre, activo: !s.activo })).data,
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo cambiar'),
  })

  const guardarCat = useMutation({
    mutationFn: async () => dlgCat.item
      ? (await api.put(`/ags/categorias/${dlgCat.item.id}`, formCat)).data
      : (await api.post('/ags/categorias', formCat)).data,
    onSuccess: () => {
      toast.success(dlgCat.item ? 'Categoría actualizada' : 'Categoría creada')
      invalidar()
      setDlgCat({ abierto: false, item: null })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar'),
  })

  const eliminarCat = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/ags/categorias/${id}`)).data,
    onSuccess: () => { toast.success('Categoría eliminada'); invalidar() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo eliminar'),
  })

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return servicios.filter(s => {
      if (soloActivos && s.activo === false) return false
      if (filtroCat !== 'todas' && s.categoria_id !== filtroCat) return false
      if (!q) return true
      return s.nombre.toLowerCase().includes(q)
        || s.codigo.toLowerCase().includes(q)
        || (s.categoria_nombre ?? '').toLowerCase().includes(q)
    })
  }, [servicios, busqueda, filtroCat, soloActivos])

  const exportar = () => {
    if (!filtrados.length) { toast.error('No hay servicios para exportar'); return }
    exportarExcel({
      archivo: 'ags-catalogo-servicios',
      titulo: 'Catálogo de servicios',
      color: AGS_COLOR,
      columnas: [
        { key: 'codigo', header: 'Código' },
        { key: 'nombre', header: 'Servicio' },
        { key: 'categoria_nombre', header: 'Categoría' },
        { key: 'duracion_min', header: 'Duración (min)' },
        { key: 'precio', header: 'Precio' },
        { key: 'costo_insumos', header: 'Costo insumos' },
        { key: 'margen', header: 'Margen' },
        { key: 'margen_pct', header: 'Margen %' },
        { key: 'veces_vendido', header: 'Veces vendido' },
        { key: 'activo', header: 'Activo' },
      ],
      filas: filtrados.map(s => ({ ...s, activo: s.activo === false ? 'No' : 'Sí' })),
    })
    toast.success('Catálogo exportado')
  }

  return (
    <Layout title="Servicios">
      <Box className="anim-page-in">
        {/* ── Categorías ── */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>Categorías</Typography>
                <Typography variant="caption" color="text.secondary">
                  Agrupan el catálogo y le dan color a la agenda
                </Typography>
              </Box>
              <Button
                size="small" startIcon={<Add />} onClick={() => setDlgCat({ abierto: true, item: null })}
                sx={{ color: AGS_COLOR }}
              >
                Nueva categoría
              </Button>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              <Chip
                label={`Todas (${servicios.length})`}
                onClick={() => setFiltroCat('todas')}
                variant={filtroCat === 'todas' ? 'filled' : 'outlined'}
                sx={filtroCat === 'todas' ? { bgcolor: AGS_COLOR, color: '#fff' } : undefined}
              />
              {categorias.map(c => (
                <Chip
                  key={c.id}
                  label={`${c.nombre} (${c.total_servicios ?? 0})`}
                  onClick={() => setFiltroCat(c.id)}
                  onDelete={() => setDlgCat({ abierto: true, item: c })}
                  deleteIcon={<Edit sx={{ fontSize: 14 }} />}
                  variant={filtroCat === c.id ? 'filled' : 'outlined'}
                  sx={{
                    opacity: c.activo === false ? 0.5 : 1,
                    ...(filtroCat === c.id
                      ? { bgcolor: c.color ?? AGS_COLOR, color: '#fff', '& .MuiChip-deleteIcon': { color: '#fff' } }
                      : { borderColor: alpha(c.color ?? AGS_COLOR, 0.5), color: c.color ?? undefined }),
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* ── Filtros y acciones ── */}
        <Card sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              size="small" placeholder="Buscar servicio, código o categoría…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, minWidth: 240 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} />}
              label={<Typography variant="body2">Solo activos</Typography>}
            />
            <Button size="small" startIcon={<Download />} onClick={exportar}>Excel</Button>
            <Button
              variant="contained" startIcon={<Add />}
              onClick={() => setDlgServicio({ abierto: true, item: null })}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Nuevo servicio
            </Button>
          </Stack>
        </Card>

        {/* ── Tabla ── */}
        <Card>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Servicio</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell align="right">Duración</TableCell>
                <TableCell align="right">Precio</TableCell>
                <TableCell align="right">Insumos</TableCell>
                <TableCell align="right">Margen</TableCell>
                <TableCell align="center">Marcas</TableCell>
                <TableCell align="right">Vendido</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay servicios que coincidan con el filtro.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map(s => (
                <TableRow key={s.id} hover sx={{ opacity: s.activo === false ? 0.55 : 1 }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{s.codigo}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{s.nombre}</Typography>
                    {s.descripcion && (
                      <Typography variant="caption" color="text.secondary" noWrap display="block"
                        sx={{ maxWidth: 240 }}>
                        {s.descripcion}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.categoria_nombre && (
                      <Chip
                        size="small" label={s.categoria_nombre}
                        sx={{
                          height: 20, fontSize: 10.5,
                          bgcolor: alpha(s.categoria_color ?? AGS_COLOR, 0.13),
                          color: s.categoria_color ?? AGS_COLOR,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">{fmtMinutos(s.duracion_min)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCOP(s.precio)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{fmtCOP(s.costo_insumos)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="caption" fontWeight={700}
                      color={(s.margen_pct ?? 100) < 40 ? 'error.main' : 'success.main'}
                    >
                      {s.margen_pct === null || s.margen_pct === undefined ? '—' : `${s.margen_pct}%`}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.3} justifyContent="center">
                      {s.permite_domicilio && (
                        <Tooltip title="Se puede prestar a domicilio">
                          <Home sx={{ fontSize: 15, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                      {s.cobra_materiales && (
                        <Tooltip title="Cobra materiales aparte de la mano de obra">
                          <Inventory2 sx={{ fontSize: 15, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{s.veces_vendido ?? 0}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small" label={s.activo === false ? 'Inactivo' : 'Activo'}
                      sx={{
                        height: 20, fontSize: 10.5, fontWeight: 700,
                        bgcolor: alpha(s.activo === false ? '#64748B' : '#16A34A', 0.13),
                        color: s.activo === false ? '#64748B' : '#16A34A',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={e => setMenu({ el: e.currentTarget, item: s })}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Menu open={Boolean(menu)} anchorEl={menu?.el} onClose={() => setMenu(null)}>
          <MenuItem onClick={() => { setDlgServicio({ abierto: true, item: menu!.item }); setMenu(null) }}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>Editar servicio</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { alternarActivo.mutate(menu!.item); setMenu(null) }}>
            <ListItemIcon><ContentCut fontSize="small" /></ListItemIcon>
            <ListItemText>{menu?.item.activo === false ? 'Activar' : 'Desactivar'}</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              if (window.confirm(`¿Eliminar el servicio "${menu!.item.nombre}"?`)) {
                eliminarServicio.mutate(menu!.item.id)
              }
              setMenu(null)
            }}
          >
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ color: 'error.main' }}>Eliminar</ListItemText>
          </MenuItem>
        </Menu>

        {/* ── Diálogo de servicio ── */}
        <Dialog
          open={dlgServicio.abierto} onClose={() => setDlgServicio({ abierto: false, item: null })}
          maxWidth="sm" fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            {dlgServicio.item ? `Editar ${dlgServicio.item.codigo}` : 'Nuevo servicio'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField
                  fullWidth size="small" label="Nombre del servicio" required autoFocus
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  select fullWidth size="small" label="Categoría"
                  value={form.categoria_id ?? ''}
                  onChange={e => setForm(f => ({
                    ...f, categoria_id: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                >
                  <MenuItem value="">Sin categoría</MenuItem>
                  {categorias.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth size="small" label="Descripción" multiline rows={2}
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </Grid>

              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  type="number" fullWidth size="small" label="Duración" required
                  value={form.duracion_min}
                  onChange={e => setForm(f => ({ ...f, duracion_min: Number(e.target.value) || 0 }))}
                  InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                  error={form.duracion_min <= 0}
                  helperText={form.duracion_min <= 0 ? 'Debe ser mayor a cero' : 'Define la hora de fin en la agenda'}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  type="number" fullWidth size="small" label="Precio" required
                  value={form.precio}
                  onChange={e => setForm(f => ({ ...f, precio: Number(e.target.value) || 0 }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  type="number" fullWidth size="small" label="Costo de insumos"
                  value={form.costo_insumos}
                  onChange={e => setForm(f => ({ ...f, costo_insumos: Number(e.target.value) || 0 }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText="Para calcular la utilidad real"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  type="number" fullWidth size="small" label="Comisión propia"
                  value={form.comision_pct ?? ''}
                  onChange={e => setForm(f => ({
                    ...f, comision_pct: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  helperText="Vacío = usa la del profesional"
                />
              </Grid>

              {form.precio > 0 && (
                <Grid size={12}>
                  <Alert severity="info" sx={{ py: 0.3 }}>
                    Margen: <strong>{fmtCOP(form.precio - form.costo_insumos)}</strong>
                    {' '}({Math.round((form.precio - form.costo_insumos) / form.precio * 100)}%)
                    {' · '}Ingreso por hora: <strong>
                      {fmtCOP(form.duracion_min > 0 ? form.precio / (form.duracion_min / 60) : 0)}
                    </strong>
                  </Alert>
                </Grid>
              )}

              <Grid size={12}>
                <Stack>
                  <FormControlLabel
                    control={<Switch checked={form.permite_domicilio}
                      onChange={e => setForm(f => ({ ...f, permite_domicilio: e.target.checked }))} />}
                    label={<Typography variant="body2">
                      Se puede prestar a domicilio
                      <Typography variant="caption" color="text.secondary" display="block">
                        La cita pedirá dirección
                      </Typography>
                    </Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={form.cobra_materiales}
                      onChange={e => setForm(f => ({ ...f, cobra_materiales: e.target.checked }))} />}
                    label={<Typography variant="body2">
                      Cobra materiales aparte
                      <Typography variant="caption" color="text.secondary" display="block">
                        Típico de plomería y albañilería: mano de obra + materiales
                      </Typography>
                    </Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={form.requiere_anticipo}
                      onChange={e => setForm(f => ({ ...f, requiere_anticipo: e.target.checked }))} />}
                    label={<Typography variant="body2">Requiere anticipo</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={form.activo}
                      onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />}
                    label={<Typography variant="body2">Activo</Typography>}
                  />
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlgServicio({ abierto: false, item: null })}>Cancelar</Button>
            <Button
              variant="contained" onClick={() => guardarServicio.mutate()}
              disabled={!form.nombre.trim() || form.duracion_min <= 0 || guardarServicio.isPending}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              {guardarServicio.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo de categoría ── */}
        <Dialog
          open={dlgCat.abierto} onClose={() => setDlgCat({ abierto: false, item: null })}
          maxWidth="xs" fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            {dlgCat.item ? 'Editar categoría' : 'Nueva categoría'}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                fullWidth size="small" label="Nombre" required autoFocus
                value={formCat.nombre} onChange={e => setFormCat(f => ({ ...f, nombre: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Descripción"
                value={formCat.descripcion}
                onChange={e => setFormCat(f => ({ ...f, descripcion: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Color" type="color"
                value={formCat.color} onChange={e => setFormCat(f => ({ ...f, color: e.target.value }))}
              />
              <FormControlLabel
                control={<Switch checked={formCat.activo}
                  onChange={e => setFormCat(f => ({ ...f, activo: e.target.checked }))} />}
                label={<Typography variant="body2">Activa</Typography>}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            {dlgCat.item && (
              <Button
                color="error" sx={{ mr: 'auto' }}
                onClick={() => {
                  if (window.confirm(`¿Eliminar la categoría "${dlgCat.item!.nombre}"?`)) {
                    eliminarCat.mutate(dlgCat.item!.id)
                    setDlgCat({ abierto: false, item: null })
                  }
                }}
              >
                Eliminar
              </Button>
            )}
            <Button onClick={() => setDlgCat({ abierto: false, item: null })}>Cancelar</Button>
            <Button
              variant="contained" onClick={() => guardarCat.mutate()}
              disabled={!formCat.nombre.trim() || guardarCat.isPending}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
