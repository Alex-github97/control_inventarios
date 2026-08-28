import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  alpha,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Tooltip,
  Divider,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add,
  Delete,
  Description,
  DirectionsCar,
  Person,
  AccountBalance,
  PeopleAlt,
  FolderSpecial,
  CheckCircle,
  Draw,
  TextFields,
  Numbers,
  CalendarMonth,
  List as ListIcon,
} from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'

import { COLOR_MODULO } from '@/config/marca'
const DMS_COLOR = COLOR_MODULO

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Categoria {
  id: number
  nombre: string
  codigo?: string | null
  color?: string | null
  icono?: string | null
  activo: boolean
}
interface TipoDoc {
  id: number
  nombre: string
  categoria_id: number
  requiere_firma: boolean
  requiere_aprobacion: boolean
  extensiones_permitidas?: string | null
  dias_vigencia?: number | null
  activo: boolean
}
interface Campo {
  id: number
  tipo_documento_id: number
  etiqueta: string
  nombre: string
  tipo_dato: string
  requerido: boolean
  orden: number
}

// ─── Iconos y colores ──────────────────────────────────────────────────────────

const ICON_OPTS: { key: string; label: string; el: React.ReactElement }[] = [
  { key: 'folder', label: 'Carpeta general', el: <FolderSpecial /> },
  { key: 'description', label: 'Documento', el: <Description /> },
  { key: 'car', label: 'Vehículo', el: <DirectionsCar /> },
  { key: 'person', label: 'Persona', el: <Person /> },
  { key: 'people', label: 'Recursos humanos', el: <PeopleAlt /> },
  { key: 'finance', label: 'Financiero', el: <AccountBalance /> },
]
const iconoDe = (key?: string | null): React.ReactElement => ICON_OPTS.find((o) => o.key === key)?.el ?? <FolderSpecial />
const colorDe = (c?: string | null) => c || DMS_COLOR

const COLORES = ['#0E7490', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#2563EB', '#BE185D', '#374151']
const EXTS = ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'xml']
const TIPO_DATO_LABEL: Record<string, string> = { texto: 'Texto', numero: 'Número', fecha: 'Fecha', lista: 'Lista' }

function TipoFieldIcon({ tipo }: { tipo: string }) {
  switch (tipo) {
    case 'numero': return <Numbers sx={{ fontSize: 16, color: '#16A34A' }} />
    case 'fecha':  return <CalendarMonth sx={{ fontSize: 16, color: '#D97706' }} />
    case 'lista':  return <ListIcon sx={{ fontSize: 16, color: '#7C3AED' }} />
    default:       return <TextFields sx={{ fontSize: 16, color: '#2563EB' }} />
  }
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function DialogNuevaCategoria({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [icono, setIcono] = useState('folder')
  const [colorSel, setColorSel] = useState('#0E7490')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) { setNombre(''); setCodigo(''); setIcono('folder'); setColorSel('#0E7490') } }, [open])

  const guardar = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await apiClient.post('/dms/categorias', { nombre: nombre.trim(), codigo: codigo.trim() || undefined, icono, color: colorSel })
      toast.success('Categoría creada'); onSaved(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo crear') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva Categoría</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField label="Nombre de la categoría" size="small" fullWidth value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <TextField label="Código (3 letras)" size="small" fullWidth inputProps={{ maxLength: 3 }} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
          <FormControl size="small" fullWidth>
            <InputLabel>Icono</InputLabel>
            <Select label="Icono" value={icono} onChange={(e) => setIcono(String(e.target.value))}>
              {ICON_OPTS.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Box>
            <Typography fontSize={12} fontWeight={600} color="text.secondary" mb={1}>Color</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {COLORES.map((c) => (
                <Box key={c} onClick={() => setColorSel(c)}
                  sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: colorSel === c ? `3px solid ${alpha(c, 0.5)}` : '2px solid transparent', outline: colorSel === c ? `2px solid ${c}` : 'none', transition: 'all 0.15s' }} />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>{saving ? 'Guardando…' : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  )
}

function DialogNuevoTipo({ open, onClose, onSaved, categoria }: { open: boolean; onClose: () => void; onSaved: () => void; categoria: Categoria | null }) {
  const [nombre, setNombre] = useState('')
  const [dias, setDias] = useState('365')
  const [exts, setExts] = useState<string[]>(['pdf'])
  const [firma, setFirma] = useState(false)
  const [aprob, setAprob] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) { setNombre(''); setDias('365'); setExts(['pdf']); setFirma(false); setAprob(false) } }, [open])

  const guardar = async () => {
    if (!categoria) { toast.error('Selecciona una categoría'); return }
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await apiClient.post('/dms/tipos-documento', {
        nombre: nombre.trim(),
        categoria_id: categoria.id,
        dias_vigencia: dias ? Number(dias) : null,
        extensiones_permitidas: exts.join(','),
        requiere_firma: firma,
        requiere_aprobacion: aprob,
      })
      toast.success('Tipo creado'); onSaved(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo crear') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo Tipo de Documento{categoria ? ` — ${categoria.nombre}` : ''}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mt={0.5}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Nombre del tipo" size="small" fullWidth value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Días de vigencia (0 = sin vencimiento)" size="small" fullWidth type="number" value={dias} onChange={(e) => setDias(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Extensiones permitidas</InputLabel>
              <Select label="Extensiones permitidas" multiple value={exts} onChange={(e) => setExts(typeof e.target.value === 'string' ? e.target.value.split(',') : (e.target.value as string[]))} renderValue={(sel) => (sel as string[]).map((s) => `.${s}`).join(', ')}>
                {EXTS.map((ext) => <MenuItem key={ext} value={ext}>.{ext}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={3}>
              <FormControlLabel control={<Switch size="small" checked={firma} onChange={(e) => setFirma(e.target.checked)} />} label={<Typography fontSize={13}>Requiere Firma</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={aprob} onChange={(e) => setAprob(e.target.checked)} />} label={<Typography fontSize={13}>Requiere Aprobación</Typography>} />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>{saving ? 'Guardando…' : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DMSCategorias() {
  const qc = useQueryClient()
  const [catSelId, setCatSelId] = useState<number | null>(null)
  const [tipoSelId, setTipoSelId] = useState<number | null>(null)
  const [catOpen, setCatOpen] = useState(false)
  const [tipoOpen, setTipoOpen] = useState(false)

  // Nuevo campo inline
  const [nuevoCampo, setNuevoCampo] = useState('')
  const [nuevoCampoTipo, setNuevoCampoTipo] = useState('texto')
  const [nuevoCampoOblig, setNuevoCampoOblig] = useState(false)

  const { data: categorias = [], isLoading: loadingCat } = useQuery<Categoria[]>({
    queryKey: ['dms-categorias-cfg'],
    queryFn: () => apiClient.get('/dms/categorias').then((r) => r.data),
  })

  // Selección por defecto
  useEffect(() => {
    if (categorias.length && (catSelId === null || !categorias.some((c) => c.id === catSelId))) {
      setCatSelId(categorias[0].id)
    }
  }, [categorias, catSelId])

  const catSel = useMemo(() => categorias.find((c) => c.id === catSelId) ?? null, [categorias, catSelId])

  const { data: tipos = [], isLoading: loadingTipos } = useQuery<TipoDoc[]>({
    queryKey: ['dms-tipos-cfg', catSelId],
    queryFn: () => apiClient.get('/dms/tipos-documento', { params: { categoria_id: catSelId } }).then((r) => r.data),
    enabled: catSelId !== null,
  })

  useEffect(() => {
    if (tipos.length && (tipoSelId === null || !tipos.some((t) => t.id === tipoSelId))) setTipoSelId(tipos[0].id)
    if (!tipos.length) setTipoSelId(null)
  }, [tipos, tipoSelId])

  const tipoSel = useMemo(() => tipos.find((t) => t.id === tipoSelId) ?? null, [tipos, tipoSelId])

  const { data: campos = [], isLoading: loadingCampos } = useQuery<Campo[]>({
    queryKey: ['dms-campos-cfg', tipoSelId],
    queryFn: () => apiClient.get(`/dms/tipos-documento/${tipoSelId}/campos`).then((r) => r.data),
    enabled: tipoSelId !== null,
  })

  const agregarCampo = async () => {
    if (!tipoSel) return
    if (!nuevoCampo.trim()) { toast.error('Escribe la etiqueta del campo'); return }
    try {
      await apiClient.post('/dms/campos-metadato', {
        tipo_documento_id: tipoSel.id,
        nombre: nuevoCampo.trim().toLowerCase().replace(/\s+/g, '_'),
        etiqueta: nuevoCampo.trim(),
        tipo_dato: nuevoCampoTipo,
        requerido: nuevoCampoOblig,
        orden: campos.length + 1,
      })
      setNuevoCampo(''); setNuevoCampoOblig(false); setNuevoCampoTipo('texto')
      qc.invalidateQueries({ queryKey: ['dms-campos-cfg', tipoSelId] })
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo agregar el campo') }
  }

  const eliminarCampo = async (id: number) => {
    try {
      await apiClient.delete(`/dms/campos-metadato/${id}`)
      qc.invalidateQueries({ queryKey: ['dms-campos-cfg', tipoSelId] })
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo eliminar') }
  }

  return (
    <Layout title="DMS — Categorías">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(DMS_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderSpecial sx={{ color: DMS_COLOR, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontSize={20} fontWeight={800}>Categorías y Tipos de Documento</Typography>
              <Typography fontSize={12} color="text.secondary">Configuración de categorías, tipos y campos de metadatos</Typography>
            </Box>
          </Stack>
        </Stack>

        {/* ── Three-panel layout ──────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ minHeight: 520 }}>

          {/* Panel izquierdo: Categorías */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography fontSize={13} fontWeight={700}>Categorías</Typography>
                <Button size="small" startIcon={<Add sx={{ fontSize: 14 }} />} onClick={() => setCatOpen(true)} sx={{ fontSize: 11, color: DMS_COLOR, fontWeight: 700, py: 0.25 }}>Nueva</Button>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
                {loadingCat ? <Box textAlign="center" py={4}><CircularProgress size={22} /></Box>
                : categorias.length === 0 ? <Typography fontSize={12} color="text.secondary" sx={{ px: 2, py: 2 }}>Sin categorías. Crea la primera.</Typography>
                : categorias.map((cat) => {
                  const isSelected = catSelId === cat.id
                  const color = colorDe(cat.color)
                  return (
                    <Box key={cat.id} onClick={() => { setCatSelId(cat.id); setTipoSelId(null) }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, mx: 0.75, cursor: 'pointer', borderRadius: '10px', bgcolor: isSelected ? alpha(color, 0.1) : 'transparent', '&:hover': { bgcolor: isSelected ? alpha(color, 0.12) : '#F9FAFB' } }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: isSelected ? alpha(color, 0.2) : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {React.cloneElement(iconoDe(cat.icono), { sx: { fontSize: 18, color: isSelected ? color : '#9CA3AF' } })}
                      </Box>
                      <Box flex={1} overflow="hidden">
                        <Typography fontSize={13} fontWeight={isSelected ? 700 : 500} color={isSelected ? color : 'text.primary'} noWrap>{cat.nombre}</Typography>
                        <Typography fontSize={11} color="text.disabled">{cat.codigo || '—'}</Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          </Grid>

          {/* Panel centro: Tipos de documento */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography fontSize={13} fontWeight={700}>Tipos</Typography>
                  {catSel && <Chip label={catSel.nombre} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(colorDe(catSel.color), 0.1), color: colorDe(catSel.color), fontWeight: 700 }} />}
                </Stack>
                <Button size="small" startIcon={<Add sx={{ fontSize: 14 }} />} onClick={() => catSel && setTipoOpen(true)} disabled={!catSel} sx={{ fontSize: 11, color: DMS_COLOR, fontWeight: 700, py: 0.25 }}>Nuevo</Button>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
                {loadingTipos ? <Box textAlign="center" py={4}><CircularProgress size={22} /></Box>
                : tipos.length === 0 ? <Typography fontSize={12} color="text.secondary" sx={{ px: 2, py: 2 }}>Esta categoría no tiene tipos configurados.</Typography>
                : tipos.map((tipo) => {
                  const isSelected = tipoSelId === tipo.id
                  return (
                    <Box key={tipo.id} onClick={() => setTipoSelId(tipo.id)}
                      sx={{ px: 2, py: 1.25, mx: 0.75, cursor: 'pointer', borderRadius: '10px', bgcolor: isSelected ? alpha(DMS_COLOR, 0.08) : 'transparent', '&:hover': { bgcolor: isSelected ? alpha(DMS_COLOR, 0.1) : '#F9FAFB' } }}>
                      <Typography fontSize={13} fontWeight={isSelected ? 700 : 500} color={isSelected ? DMS_COLOR : 'text.primary'}>{tipo.nombre}</Typography>
                      <Stack direction="row" spacing={0.75} mt={0.5} flexWrap="wrap" gap={0.5}>
                        {tipo.requiere_firma && <Chip icon={<Draw sx={{ fontSize: 11 }} />} label="Requiere Firma" size="small" sx={{ fontSize: 9, height: 18, fontWeight: 700, bgcolor: alpha('#2563EB', 0.1), color: '#2563EB', '& .MuiChip-icon': { fontSize: 11, color: '#2563EB' } }} />}
                        {tipo.requiere_aprobacion && <Chip icon={<CheckCircle sx={{ fontSize: 11 }} />} label="Requiere Aprobación" size="small" sx={{ fontSize: 9, height: 18, fontWeight: 700, bgcolor: alpha('#16A34A', 0.1), color: '#16A34A', '& .MuiChip-icon': { fontSize: 11, color: '#16A34A' } }} />}
                        {!!tipo.dias_vigencia && tipo.dias_vigencia > 0 && <Chip label={`${tipo.dias_vigencia}d vigencia`} size="small" sx={{ fontSize: 9, height: 18, fontWeight: 600, bgcolor: '#F3F4F6', color: '#6B7280' }} />}
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          </Grid>

          {/* Panel derecho: Campos de metadatos */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography fontSize={13} fontWeight={700}>Campos de Metadatos</Typography>
                  {tipoSel && <Typography fontSize={11} color="text.secondary" noWrap>{tipoSel.nombre}</Typography>}
                </Box>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
                {!tipoSel ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', gap: 1 }}>
                    <Description sx={{ fontSize: 40, color: '#D1D5DB' }} />
                    <Typography fontSize={13} color="text.secondary" textAlign="center">Selecciona un tipo de documento</Typography>
                  </Box>
                ) : loadingCampos ? <Box textAlign="center" py={4}><CircularProgress size={22} /></Box>
                : campos.length > 0 ? (
                  <Stack spacing={1}>
                    {campos.map((campo) => (
                      <Box key={campo.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px', '&:hover': { borderColor: alpha(DMS_COLOR, 0.4), '& .actions': { opacity: 1 } } }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TipoFieldIcon tipo={campo.tipo_dato} />
                        </Box>
                        <Box flex={1} overflow="hidden">
                          <Typography fontSize={13} fontWeight={600} noWrap>{campo.etiqueta}</Typography>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography fontSize={11} color="text.secondary">{TIPO_DATO_LABEL[campo.tipo_dato] ?? campo.tipo_dato}</Typography>
                            {campo.requerido && <Chip label="Obligatorio" size="small" sx={{ fontSize: 9, height: 16, fontWeight: 700, bgcolor: alpha('#DC2626', 0.08), color: '#DC2626' }} />}
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={0} className="actions" sx={{ opacity: 0, transition: 'opacity 0.15s' }}>
                          <Tooltip title="Eliminar"><IconButton size="small" onClick={() => eliminarCampo(campo.id)}><Delete sx={{ fontSize: 15, color: '#DC2626' }} /></IconButton></Tooltip>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 1 }}>
                    <Description sx={{ fontSize: 40, color: '#D1D5DB' }} />
                    <Typography fontSize={13} color="text.secondary" textAlign="center">Este tipo no tiene campos de metadatos configurados</Typography>
                  </Box>
                )}
              </Box>

              {/* Agregar nuevo campo (inline) */}
              {tipoSel && (
                <>
                  <Divider />
                  <Box sx={{ p: 1.5 }}>
                    <Typography fontSize={12} fontWeight={600} color="text.secondary" mb={1}>Agregar nuevo campo</Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField size="small" placeholder="Etiqueta del campo" value={nuevoCampo} onChange={(e) => setNuevoCampo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') agregarCampo() }} sx={{ flex: 1, '& input': { fontSize: 12 } }} />
                      <FormControl size="small" sx={{ minWidth: 110 }}>
                        <Select value={nuevoCampoTipo} onChange={(e) => setNuevoCampoTipo(String(e.target.value))} sx={{ fontSize: 12 }}>
                          <MenuItem value="texto" sx={{ fontSize: 12 }}>Texto</MenuItem>
                          <MenuItem value="numero" sx={{ fontSize: 12 }}>Número</MenuItem>
                          <MenuItem value="fecha" sx={{ fontSize: 12 }}>Fecha</MenuItem>
                          <MenuItem value="lista" sx={{ fontSize: 12 }}>Lista</MenuItem>
                        </Select>
                      </FormControl>
                      <Tooltip title="Agregar campo">
                        <IconButton size="small" onClick={agregarCampo} sx={{ bgcolor: DMS_COLOR, color: '#fff', '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px', width: 34, height: 34 }}>
                          <Add sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <FormControlLabel control={<Switch size="small" checked={nuevoCampoOblig} onChange={(e) => setNuevoCampoOblig(e.target.checked)} />} label={<Typography fontSize={12} color="text.secondary">Campo obligatorio</Typography>} sx={{ mt: 0.5 }} />
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ── Resumen rápido ──────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
          <Typography fontSize={13} fontWeight={700} mb={2}>Resumen de Configuración</Typography>
          {categorias.length === 0 ? (
            <Typography fontSize={12} color="text.secondary">Aún no hay categorías configuradas.</Typography>
          ) : (
            <Grid container spacing={2}>
              {categorias.map((cat) => {
                const color = colorDe(cat.color)
                const nTipos = catSelId === cat.id ? tipos.length : undefined
                return (
                  <Grid key={cat.id} size={{ xs: 12, sm: 6, md: 'auto' }} sx={{ flex: 1 }}>
                    <Box sx={{ p: 1.5, border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '10px', bgcolor: alpha(color, 0.04) }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        {React.cloneElement(iconoDe(cat.icono), { sx: { fontSize: 16, color } })}
                        <Typography fontSize={12} fontWeight={700} color={color}>{cat.nombre}</Typography>
                      </Stack>
                      <Typography fontSize={24} fontWeight={800} color={color}>{nTipos ?? '—'}</Typography>
                      <Typography fontSize={11} color="text.secondary">tipos de documento</Typography>
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Paper>

      </Box>

      {/* Dialogs */}
      <DialogNuevaCategoria open={catOpen} onClose={() => setCatOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['dms-categorias-cfg'] })} />
      <DialogNuevoTipo open={tipoOpen} onClose={() => setTipoOpen(false)} categoria={catSel} onSaved={() => qc.invalidateQueries({ queryKey: ['dms-tipos-cfg', catSelId] })} />
    </Layout>
  )
}
