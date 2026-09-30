import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip,
  Stack, alpha, Divider, IconButton, Button, TextField, MenuItem,
  Switch, FormControlLabel, InputAdornment, Avatar, Rating,
  List, ListItem, ListItemText, ListItemSecondaryAction, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip,
  Alert, LinearProgress, Checkbox, Autocomplete,
} from '@mui/material'
import { useAuthStore } from '@/store/authStore'
import Grid from '@mui/material/Grid2'
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  NotificationsActive as AlertIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Sync as SyncIcon,
  Warning as WarnIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ConfiguracionLubricacion } from '@/pages/EAMLubricacionConfig'
import { CatalogoVehiculos } from '@/components/CatalogoVehiculos'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'
import { CatalogoCMMS, CATALOGOS_CMMS } from '@/components/catalogo/CatalogoCMMS'
import { CargueCatalogoEAM } from '@/components/catalogo/CargueCatalogoEAM'
import { EsquemaLlantasPreview } from '@/components/EsquemaLlantasPreview'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'

import { COLOR_MODULO } from '@/config/marca'
const EAM_COLOR = COLOR_MODULO

// ── Tipos de Trabajo — catálogo rico ─────────────────────────────────────────

type CatTrabajo = 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'INSPECCION' | 'EMERGENCIA'

interface TipoTrabajoConfig {
  id: number
  nombre: string
  categoria: CatTrabajo
  duracion: string
  requiereTaller: boolean
  requiereMateriales: boolean
  sistema: string
  subsistema: string
}

const CAT_COLOR: Record<CatTrabajo, string> = {
  PREVENTIVO: '#16A34A',
  CORRECTIVO: '#DC2626',
  PREDICTIVO: '#3B82F6',
  INSPECCION: '#F59E0B',
  EMERGENCIA: '#7F1D1D',
}

const CATEGORIAS_TRABAJO: CatTrabajo[] = ['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'INSPECCION', 'EMERGENCIA']

// ── Catalogos mock ────────────────────────────────────────────────────────────

interface Contratista {
  id: number
  nombre: string
  tipo: 'TALLER' | 'PROVEEDOR' | 'TECNICO_EXTERNO'
  especialidad: string
  ciudad: string
  calificacion: number
  activo: boolean
}


const EMPTY_TIPO: TipoTrabajoConfig = { id: 0, nombre: '', categoria: 'PREVENTIVO', duracion: '1h', requiereTaller: false, requiereMateriales: false, sistema: '', subsistema: '' }

interface CentroCosto {
  id: number
  codigo: string
  nombre: string
  ciudad: string
  plataforma: string
}

const EMPTY_CC: CentroCosto = { id: 0, codigo: '', nombre: '', ciudad: '', plataforma: '' }

interface EsquemaVehiculoCfg { id: number; codigo?: string | null; nombre: string; tipo_activo?: string | null; numero_ejes: number; layout?: number[] | null; tiene_repuesto: boolean; cantidad_repuestos: number }
interface TipoActivoCfg { id: number; codigo: string; nombre: string; usa_llantas: boolean }
// `layout` = cantidad de llantas de cada eje, una fila editable por eje (no un
// solo "N.º de ejes" global) — así se puede representar cualquier combinación
// real (uniforme, direccional+dual, combos cabezote+trailer, motos, etc.)
const EMPTY_ESQUEMA = { codigo: '', nombre: '', tipo_activo: '', layout: ['2', '4'] as string[], tiene_repuesto: true, cantidad_repuestos: '1' }
const totalLlantas = (layout?: number[] | null) => (layout ?? []).reduce((a, b) => a + b, 0)

interface ContratistaAPI {
  id: number
  nombre: string
  nit?: string | null
  tipo?: string | null
  especialidad?: string | null
  contacto?: string | null
  telefono?: string | null
  email?: string | null
  ciudad?: string | null
  calificacion?: number | null
  activo: boolean
}

const CONTRATISTA_VACIO = {
  nombre: '', nit: '', tipo: '', especialidad: '', contacto: '',
  telefono: '', email: '', ciudad: '', calificacion: 5,
}

const colorTipoContratista = (tipo?: string | null): string => {
  const t = (tipo ?? '').toLowerCase()
  if (t.includes('taller')) return '#2563EB'
  if (t.includes('proveedor')) return '#16A34A'
  if (t.includes('laboratorio')) return '#7C3AED'
  if (t.includes('obra')) return '#B45309'
  return '#0891B2'
}

/**
 * Contratistas del CMMS.
 *
 * Antes era una maqueta: la lista venía de una constante y los botones no
 * hacían nada. Ahora usa la API y la especialidad depende del tipo, porque un
 * taller no ofrece las mismas especialidades que un laboratorio.
 */
function ContratistasSection() {
  const qc = useQueryClient()
  const [verInactivos, setVerInactivos] = useState(false)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: ContratistaAPI | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...CONTRATISTA_VACIO })
  // Id del tipo elegido: hace falta para acotar las especialidades a ese tipo
  const [tipoId, setTipoId] = useState<number | null>(null)
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      nombre: it.nombre, nit: it.nit ?? '', tipo: it.tipo ?? '',
      especialidad: it.especialidad ?? '', contacto: it.contacto ?? '',
      telefono: it.telefono ?? '', email: it.email ?? '', ciudad: it.ciudad ?? '',
      calificacion: it.calificacion ?? 5,
    } : { ...CONTRATISTA_VACIO })
    setTipoId(null)
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: contratistas = [], isLoading } = useQuery<ContratistaAPI[]>({
    queryKey: ['eam-contratistas', verInactivos],
    queryFn: () => apiClient.get('/eam/contratistas', {
      params: { incluir_inactivos: verInactivos },
    }).then(r => r.data),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['eam-contratistas'] })
  const err = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')

  const mutGuardar = useMutation({
    mutationFn: () => {
      const cuerpo = {
        nombre: form.nombre.trim(),
        nit: form.nit.trim() || null,
        tipo: form.tipo || null,
        especialidad: form.especialidad || null,
        contacto: form.contacto.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        ciudad: form.ciudad || null,
        calificacion: Number(form.calificacion) || 5,
      }
      return dlg.item
        ? apiClient.put(`/eam/contratistas/${dlg.item.id}`, cuerpo).then(r => r.data)
        : apiClient.post('/eam/contratistas', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Contratista actualizado' : 'Contratista agregado')
      invalidar()
      setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      apiClient.put(`/eam/contratistas/${id}/estado`, { activo }).then(r => r.data),
    onSuccess: (_d, v) => {
      toast.success(v.activo ? 'Contratista reactivado' : 'Contratista desactivado')
      invalidar()
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/eam/contratistas/${id}`),
    onSuccess: () => {
      toast.success('Contratista eliminado. Si tenía órdenes de trabajo, quedó desactivado.')
      invalidar()
    },
    onError: err,
  })

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography variant="caption" color="grey.500">
            {contratistas.length} contratista(s)
          </Typography>
          <FormControlLabel
            control={<Switch size="small" checked={verInactivos}
              onChange={e => setVerInactivos(e.target.checked)} />}
            label={<Typography variant="caption">Ver inactivos</Typography>}
          />
        </Stack>
        <Button startIcon={<AddIcon />} variant="contained"
          onClick={() => setDlg({ abierto: true, item: null })}
          sx={{ textTransform: 'none', background: EAM_COLOR, '&:hover': { background: '#1A1A1A' } }}>
          Agregar Contratista
        </Button>
      </Stack>

      {!isLoading && contratistas.length === 0 && (
        <Alert severity="info">
          No hay contratistas registrados. Agregue el primero con el botón de arriba.
        </Alert>
      )}

      <Grid container spacing={2}>
        {contratistas.map(c => (
          <Grid key={c.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card sx={{
              background: '#FFFFFF',
              border: `1px solid ${alpha(c.activo ? colorTipoContratista(c.tipo) : '#4B5563', 0.3)}`,
              opacity: c.activo ? 1 : 0.6,
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Avatar sx={{ width: 40, height: 40, background: alpha(colorTipoContratista(c.tipo), 0.15) }}>
                      <BuildIcon sx={{ color: colorTipoContratista(c.tipo) }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} color="#1E293B" noWrap>{c.nombre}</Typography>
                      <Typography variant="caption" color="grey.500">
                        {[c.ciudad, c.nit].filter(Boolean).join(' · ') || '—'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Tooltip title={c.activo ? 'Activo — clic para desactivar' : 'Inactivo — clic para reactivar'}>
                    <IconButton size="small"
                      onClick={() => mutEstado.mutate({ id: c.id, activo: !c.activo })}>
                      {c.activo
                        ? <ActiveIcon sx={{ color: '#1A1A1A', fontSize: 18 }} />
                        : <InactiveIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />}
                    </IconButton>
                  </Tooltip>
                </Stack>

                {c.tipo && (
                  <Chip label={c.tipo} size="small" sx={{
                    background: alpha(colorTipoContratista(c.tipo), 0.12),
                    color: colorTipoContratista(c.tipo), fontWeight: 600, fontSize: 10, mb: 1,
                  }} />
                )}

                <Typography variant="caption" color="grey.500" display="block" mb={1}>
                  {c.especialidad ?? 'Sin especialidad'}
                </Typography>
                {(c.contacto || c.telefono) && (
                  <Typography variant="caption" color="grey.500" display="block" mb={1}>
                    {[c.contacto, c.telefono].filter(Boolean).join(' · ')}
                  </Typography>
                )}

                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Rating value={c.calificacion ?? 0} precision={0.5} readOnly size="small"
                      sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' },
                            '& .MuiRating-iconEmpty': { color: '#E5E7EB' } }} />
                    <Typography variant="caption" color="grey.500">{c.calificacion ?? '—'}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" sx={{ color: 'grey.500' }}
                      onClick={() => setDlg({ abierto: true, item: c })}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#EF4444' }}
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el contratista "${c.nombre}"?`)) mutBorrar.mutate(c.id)
                      }}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {dlg.item ? `Editar ${dlg.item.nombre}` : 'Nuevo contratista'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="Nombre / razón social *" size="small" fullWidth autoFocus
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="NIT" size="small" fullWidth value={form.nit}
                onChange={e => setForm(f => ({ ...f, nit: e.target.value }))} />
            </Grid>

            {/* Jerarquía: la especialidad depende del tipo */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectorCatalogo
                modulo="EAM" tipo="TIPO_CONTRATISTA" label="Tipo de contratista"
                valor={form.tipo}
                onChange={(v, item) => {
                  // Cambiar el tipo invalida la especialidad elegida
                  setForm(f => ({ ...f, tipo: v, especialidad: '' }))
                  setTipoId(item?.id ?? null)
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectorCatalogo
                modulo="EAM" tipo="ESPECIALIDAD_CONTRATISTA" label="Especialidad"
                valor={form.especialidad}
                onChange={v => setForm(f => ({ ...f, especialidad: v }))}
                padreId={tipoId}
                deshabilitado={!tipoId}
                ayuda={!tipoId
                  ? (dlg.item && form.especialidad
                      ? 'Vuelva a elegir el tipo para cambiarla'
                      : 'Elija el tipo de contratista primero')
                  : undefined}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectorCatalogo
                modulo="GLOBAL" tipo="CIUDAD" label="Ciudad"
                valor={form.ciudad}
                onChange={v => setForm(f => ({ ...f, ciudad: v }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Persona de contacto" size="small" fullWidth value={form.contacto}
                onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Teléfono" size="small" fullWidth value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Correo" size="small" fullWidth value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="grey.500" display="block" mb={0.5}>
                Calificación
              </Typography>
              <Rating value={Number(form.calificacion)} precision={0.5}
                onChange={(_e, v) => setForm(f => ({ ...f, calificacion: v ?? 0 }))}
                sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
          <Button variant="contained" disabled={!form.nombre.trim() || mutGuardar.isPending}
            onClick={() => mutGuardar.mutate()}
            sx={{ background: EAM_COLOR, '&:hover': { background: '#1A1A1A' } }}>
            {mutGuardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Umbrales de aviso. Antes eran siete valores que vivían en el navegador y no
   llegaban a ningún cálculo, mientras garantías avisaba a 90 días y el tablero
   a 30. Ahora son los que el servidor lee, y cada uno dice quién lo usa. La
   profundidad mínima de llantas y el stock mínimo se configuran en sus
   módulos (Llantas → Configuración, Inventario), que es donde se aplican.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ParametroEAM { clave: string; valor: number; defecto: number; min: number; max: number; descripcion: string; lo_usan: string }

function UmbralesSection() {
  const qc = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['eam-parametros'], queryFn: () => apiClient.get<ParametroEAM[]>('/eam/parametros').then(r => r.data) })
  const [v, setV] = useState<Record<string, string>>({})
  const valor = (p: ParametroEAM) => v[p.clave] ?? String(p.valor)
  const malo = (p: ParametroEAM) => { const n = Number(valor(p)); return valor(p) === '' || !Number.isFinite(n) || n < p.min || n > p.max }
  const guardar = async () => {
    try {
      await apiClient.put('/eam/parametros', Object.fromEntries(data.map(p => [p.clave, Number(valor(p))])))
      toast.success('Umbrales guardados'); setV({}); qc.invalidateQueries({ queryKey: ['eam-parametros'] })
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'No se pudo guardar') }
  }
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>Cuántos días antes se avisa. Cada umbral dice qué pantalla lo usa. La profundidad mínima de llantas y el stock mínimo se configuran en sus módulos, que es donde se aplican.</Typography>
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        {data.map(p => (
          <Paper key={p.clave} elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <TextField fullWidth size="small" type="number" label={p.descripcion} value={valor(p)} error={malo(p)}
              onChange={e => setV(x => ({ ...x, [p.clave]: e.target.value }))}
              helperText={malo(p) ? `Entre ${p.min} y ${p.max}` : `Lo usa: ${p.lo_usan} · por defecto ${p.defecto} días`} />
          </Paper>
        ))}
      </Stack>
      <Button variant="contained" sx={{ mt: 2, bgcolor: EAM_COLOR }} disabled={!data.length || data.some(malo)} onClick={guardar}>Guardar umbrales</Button>
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Integraciones. Antes: ocho tarjetas con «ACTIVO» y horas de sincronización
   inventadas (HCM, WMS, QMS, ERP, GPS…). La única conexión que existe es con
   TMS; lo demás es parte del propio CMMS o no está conectado, y se dice así.
   ═══════════════════════════════════════════════════════════════════════════ */

function IntegracionesSection() {
  const modulos = useAuthStore(s => s.modulos)
  const tieneTMS = modulos.includes('*') || modulos.includes('tms')
  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E5E7EB', borderRadius: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Typography fontWeight={700}>TMS · Transporte</Typography>
          <Chip size="small" label={tieneTMS ? 'contratado' : 'no contratado'} sx={{ bgcolor: tieneTMS ? alpha('#16A34A', 0.12) : '#F1F5F9', color: tieneTMS ? '#16A34A' : '#64748B', fontWeight: 700 }} />
        </Stack>
        <Typography variant="body2" color="text.secondary">Los vehículos registrados en TMS aparecen en la lista combinada de vehículos del CMMS (llantas, combustible, lubricación) y se pueden reflejar como activos para llevarles mantenimiento. Sin TMS, los vehículos se registran directamente como activos.</Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E5E7EB', borderRadius: 2, mb: 2 }}>
        <Typography fontWeight={700} mb={0.5}>Parte del propio CMMS</Typography>
        <Typography variant="body2" color="text.secondary">Flota, llantas, combustible, lubricación, checklists e inventario de repuestos no son integraciones: son módulos del CMMS y comparten los mismos activos y órdenes de trabajo. Los repuestos de una OT cerrada descuentan el inventario automáticamente.</Typography>
      </Paper>
      <Alert severity="info">Recursos humanos, bodega (WMS), documentos, calidad, riesgos, contabilidad y telemetría GPS no están conectados hoy con el CMMS. Antes esta pantalla los mostraba como «activos» con horas de sincronización inventadas.</Alert>
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Disponibilidad. Antes: once activos inventados y horas guardadas solo en el
   navegador, que ningún cálculo leía. Ahora son los activos reales y sus horas
   programadas por mes, que son la base de la disponibilidad en Confiabilidad
   (un montacargas de un turno no se mide como si trabajara 24 horas).
   ═══════════════════════════════════════════════════════════════════════════ */

interface ActivoHoras { id: number; codigo: string; nombre: string; tipo_activo: string | null; centro_costo: string | null; horas_programadas_mes: number | null }

function DisponibilidadSection() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: ['eam-disponibilidad-activos'], queryFn: () => apiClient.get<ActivoHoras[]>('/eam/disponibilidad-activos').then(r => r.data) })
  const [sel, setSel] = useState<number[]>([])
  const [horas, setHoras] = useState('176')
  const [tipo, setTipo] = useState('Todos')
  const tipos = Array.from(new Set(data.map(a => a.tipo_activo ?? 'Sin tipo'))).sort()
  const filas = data.filter(a => tipo === 'Todos' || (a.tipo_activo ?? 'Sin tipo') === tipo)
  const aplicar = async (h: number | null) => {
    const ids = sel.length ? sel : filas.map(a => a.id)
    try {
      await apiClient.put('/eam/disponibilidad-activos', { activo_ids: ids, horas_programadas_mes: h })
      toast.success(`${ids.length} activo(s) actualizados`); setSel([]); qc.invalidateQueries({ queryKey: ['eam-disponibilidad-activos'] })
    } catch (e: any) { toast.error(typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : 'Revise las horas') }
  }
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>Horas al mes que cada activo debe estar disponible. Es la base del cálculo de disponibilidad en Confiabilidad. Referencia: continuo 720 h · dos turnos ≈ 352 h · un turno ≈ 176 h. Vacío = continuo.</Typography>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap" useFlexGap>
        <TextField select size="small" label="Tipo de activo" value={tipo} onChange={e => { setTipo(e.target.value); setSel([]) }} sx={{ minWidth: 180 }}>
          <MenuItem value="Todos">Todos</MenuItem>{tipos.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField size="small" type="number" label="Horas al mes" value={horas} onChange={e => setHoras(e.target.value)} sx={{ width: 140 }} />
        <Button variant="contained" sx={{ bgcolor: EAM_COLOR }} disabled={!(Number(horas) > 0 && Number(horas) <= 744)} onClick={() => aplicar(Number(horas))}>
          Aplicar a {sel.length ? `${sel.length} seleccionado(s)` : `los ${filas.length} de la lista`}
        </Button>
        <Button onClick={() => aplicar(null)} disabled={!filas.length}>Volver a continuo</Button>
      </Stack>
      {isLoading && <LinearProgress />}
      <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'auto', maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>
            <TableCell padding="checkbox"><Checkbox size="small" checked={!!filas.length && sel.length === filas.length} indeterminate={sel.length > 0 && sel.length < filas.length} onChange={e => setSel(e.target.checked ? filas.map(a => a.id) : [])} inputProps={{ 'aria-label': 'Seleccionar todos' }} /></TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Activo</TableCell><TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell><TableCell sx={{ fontWeight: 700 }}>Centro de costo</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>Horas al mes</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {filas.map(a => (
              <TableRow key={a.id} hover>
                <TableCell padding="checkbox"><Checkbox size="small" checked={sel.includes(a.id)} onChange={e => setSel(s => e.target.checked ? [...s, a.id] : s.filter(x => x !== a.id))} inputProps={{ 'aria-label': `Seleccionar ${a.codigo}` }} /></TableCell>
                <TableCell><b>{a.codigo}</b> · {a.nombre}</TableCell><TableCell>{a.tipo_activo ?? '—'}</TableCell><TableCell>{a.centro_costo ?? '—'}</TableCell>
                <TableCell align="right">{a.horas_programadas_mes != null ? a.horas_programadas_mes : <Typography component="span" fontSize={12} color="text.secondary">720 (continuo)</Typography>}</TableCell>
              </TableRow>
            ))}
            {!isLoading && !filas.length && <TableRow><TableCell colSpan={5} sx={{ color: 'text.secondary' }}>Sin activos registrados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

export default function EAMConfig() {
  // `?seccion=lubricacion` abre esa pestaña directamente. Sin esto, quien
  // llegue desde la pantalla de lubricación aterrizaría en «Catálogos» y
  // tendría que adivinar dónde quedó su configuración.
  const [parametrosUrl] = useSearchParams()
  const SECCIONES: Record<string, number> = {
    catalogos: 0, contratistas: 1, umbrales: 2, integraciones: 3,
    disponibilidad: 4, lubricacion: 5,
  }
  const [tab, setTab] = useState(
    SECCIONES[parametrosUrl.get('seccion') ?? ''] ?? 0)
  const [catSearch, setCatSearch] = useState<Record<string, string>>({})

  // Esquemas de vehículo (categorías de ejes/llantas) — catálogo real, consumido
  // por Activos (alta/vinculación de vehículos) y por Neumáticos (asignación).
  const [esquemas, setEsquemas] = useState<EsquemaVehiculoCfg[]>([])
  const [tiposActivoCfg, setTiposActivoCfg] = useState<TipoActivoCfg[]>([])
  const [esquemaDialog, setEsquemaDialog] = useState(false)
  const [esquemaEditingId, setEsquemaEditingId] = useState<number | null>(null)
  const [esquemaForm, setEsquemaForm] = useState({ ...EMPTY_ESQUEMA })

  const cargarEsquemas = async () => {
    const r = await apiClient.get('/eam/neumaticos/esquemas')
    setEsquemas(r.data)
  }
  useEffect(() => {
    cargarEsquemas()
    apiClient.get('/eam/tipos-activo').then(r => setTiposActivoCfg(r.data))
  }, [])

  const abrirNuevoEsquema = () => { setEsquemaEditingId(null); setEsquemaForm({ ...EMPTY_ESQUEMA, layout: [...EMPTY_ESQUEMA.layout] }); setEsquemaDialog(true) }
  const abrirEditarEsquema = (e: EsquemaVehiculoCfg) => {
    setEsquemaEditingId(e.id)
    const layout = e.layout && e.layout.length ? e.layout.map(String) : Array.from({ length: e.numero_ejes || 1 }, (_, i) => (i === 0 ? '2' : '4'))
    setEsquemaForm({ codigo: e.codigo ?? '', nombre: e.nombre, tipo_activo: e.tipo_activo ?? '', layout, tiene_repuesto: e.tiene_repuesto, cantidad_repuestos: String(e.cantidad_repuestos) })
    setEsquemaDialog(true)
  }
  const agregarEje = () => setEsquemaForm(f => ({ ...f, layout: [...f.layout, '4'] }))
  const quitarEje = (i: number) => setEsquemaForm(f => ({ ...f, layout: f.layout.filter((_, idx) => idx !== i) }))
  const cambiarLlantasEje = (i: number, v: string) => setEsquemaForm(f => ({ ...f, layout: f.layout.map((x, idx) => idx === i ? v : x) }))
  const guardarEsquema = async () => {
    const layoutNum = esquemaForm.layout.map(x => Number(x) || 0)
    const payload = {
      codigo: esquemaForm.codigo || undefined,
      nombre: esquemaForm.nombre,
      tipo_activo: esquemaForm.tipo_activo || undefined,
      numero_ejes: layoutNum.length,
      layout: layoutNum,
      tiene_repuesto: esquemaForm.tiene_repuesto,
      cantidad_repuestos: esquemaForm.tiene_repuesto ? (Number(esquemaForm.cantidad_repuestos) || 1) : 0,
    }
    if (esquemaEditingId) await apiClient.put(`/eam/neumaticos/esquemas/${esquemaEditingId}`, payload)
    else await apiClient.post('/eam/neumaticos/esquemas', payload)
    await cargarEsquemas()
    setEsquemaDialog(false)
  }
  const eliminarEsquema = async (id: number) => {
    await apiClient.delete(`/eam/neumaticos/esquemas/${id}`)
    await cargarEsquemas()
  }

  // Tipos de Trabajo — contra la API. Antes esto era estado local sembrado con
  // una constante: lo que se creaba se perdía al recargar la página.
  const qcConfig = useQueryClient()
  const { data: tiposTrabajo = [] } = useQuery<TipoTrabajoConfig[]>({
    queryKey: ['eam-tipos-trabajo-completo'],
    queryFn: () => apiClient.get('/eam/catalogos/tipos-trabajo-completo').then(r =>
      r.data.map((x: any) => ({
        id: x.id, nombre: x.nombre, categoria: x.categoria ?? 'PREVENTIVO',
        duracion: x.duracion ?? '', sistema: x.sistema ?? '', subsistema: x.subsistema ?? '',
        requiereTaller: !!x.requiere_taller, requiereMateriales: !!x.requiere_materiales,
      }))),
  })
  const [tipoDialog, setTipoDialog] = useState(false)
  const [tipoEditing, setTipoEditing] = useState<TipoTrabajoConfig>(EMPTY_TIPO)
  const [tipoSearch, setTipoSearch] = useState('')

  const openNewTipo = () => { setTipoEditing({ ...EMPTY_TIPO, id: 0 }); setTipoDialog(true) }
  const openEditTipo = (t: TipoTrabajoConfig) => { setTipoEditing({ ...t }); setTipoDialog(true) }

  const cuerpoTipo = (t: TipoTrabajoConfig) => ({
    nombre: t.nombre, categoria: t.categoria, duracion: t.duracion || null,
    sistema: t.sistema || null, subsistema: t.subsistema || null,
    requiere_taller: t.requiereTaller, requiere_materiales: t.requiereMateriales,
  })
  const errorApi = (e: any) => {
    const d = e?.response?.data?.detail
    toast.error(typeof d === 'string' ? d : 'No se pudo guardar')
  }

  const saveTipo = async () => {
    try {
      const existe = tiposTrabajo.some(t => t.id === tipoEditing.id)
      if (existe) {
        await apiClient.put(`/eam/catalogos/tipos-trabajo-completo/${tipoEditing.id}`,
          cuerpoTipo(tipoEditing))
      } else {
        await apiClient.post('/eam/catalogos/tipos-trabajo-completo', cuerpoTipo(tipoEditing))
      }
      qcConfig.invalidateQueries({ queryKey: ['eam-tipos-trabajo-completo'] })
      setTipoDialog(false)
    } catch (e) { errorApi(e) }
  }
  const deleteTipo = async (id: number) => {
    try {
      await apiClient.delete(`/eam/catalogos/tipos-trabajo-completo/${id}`)
      qcConfig.invalidateQueries({ queryKey: ['eam-tipos-trabajo-completo'] })
    } catch (e) { errorApi(e) }
  }

  // Centros de Costo — contra la API, por lo mismo.
  const { data: centrosCosto = [] } = useQuery<CentroCosto[]>({
    queryKey: ['eam-centros-costo'],
    queryFn: () => apiClient.get('/eam/catalogos/centros-costo').then(r => r.data),
  })
  const [ccDialog, setCcDialog] = useState(false)
  const [ccEditing, setCcEditing] = useState<CentroCosto>(EMPTY_CC)
  const [ccSearch, setCcSearch] = useState('')

  const openNewCC = () => { setCcEditing({ ...EMPTY_CC, id: 0 }); setCcDialog(true) }
  const openEditCC = (c: CentroCosto) => { setCcEditing({ ...c }); setCcDialog(true) }
  const saveCC = async () => {
    try {
      const cuerpo = {
        codigo: ccEditing.codigo, nombre: ccEditing.nombre,
        ciudad: ccEditing.ciudad || null, plataforma: ccEditing.plataforma || null,
      }
      if (centrosCosto.some(c => c.id === ccEditing.id)) {
        await apiClient.put(`/eam/catalogos/centros-costo/${ccEditing.id}`, cuerpo)
      } else {
        await apiClient.post('/eam/catalogos/centros-costo', cuerpo)
      }
      qcConfig.invalidateQueries({ queryKey: ['eam-centros-costo'] })
      setCcDialog(false)
    } catch (e) { errorApi(e) }
  }
  const deleteCC = async (id: number) => {
    try {
      await apiClient.delete(`/eam/catalogos/centros-costo/${id}`)
      qcConfig.invalidateQueries({ queryKey: ['eam-centros-costo'] })
    } catch (e) { errorApi(e) }
  }

  const filteredCC = centrosCosto.filter((c) =>
    c.nombre.toLowerCase().includes(ccSearch.toLowerCase()) ||
    c.codigo.toLowerCase().includes(ccSearch.toLowerCase()) ||
    c.ciudad.toLowerCase().includes(ccSearch.toLowerCase())
  )

  const filteredTipos = tiposTrabajo.filter((t) =>
    t.nombre.toLowerCase().includes(tipoSearch.toLowerCase()) ||
    t.categoria.toLowerCase().includes(tipoSearch.toLowerCase())
  )
  // ── IA de Lubricación: dataset de entrenamiento (ejemplos etiquetados few-shot) ──
  const IA_GRUPOS: { titulo: string; campos: [string, string][] }[] = [
    { titulo: 'Identificación', campos: [['activo', 'Activo'], ['componente', 'Componente'], ['lubricante', 'Lubricante'], ['fecha', 'Fecha'], ['horas', 'Horas / km'], ['laboratorio', 'Laboratorio'], ['muestra_id', 'N.º muestra']] },
    { titulo: 'Metales de desgaste (ppm)', campos: [['fe', 'Hierro Fe'], ['cr', 'Cromo Cr'], ['pb', 'Plomo Pb'], ['cu', 'Cobre Cu'], ['sn', 'Estaño Sn'], ['al', 'Aluminio Al'], ['ni', 'Níquel Ni'], ['mo', 'Molibdeno Mo']] },
    { titulo: 'Contaminación', campos: [['si', 'Silicio Si'], ['na', 'Sodio Na'], ['k', 'Potasio K'], ['agua', 'Agua %'], ['combustible', 'Combustible %'], ['hollin', 'Hollín %'], ['glicol', 'Glicol']] },
    { titulo: 'Aditivos (ppm)', campos: [['ca', 'Calcio Ca'], ['mg', 'Magnesio Mg'], ['zn', 'Zinc Zn'], ['p', 'Fósforo P'], ['b', 'Boro B'], ['ba', 'Bario Ba']] },
    { titulo: 'Propiedades y salud del aceite', campos: [['viscosidad', 'Visc. 40°C (cSt)'], ['visc100', 'Visc. 100°C (cSt)'], ['indice_viscosidad', 'Índice viscosidad'], ['tbn', 'TBN (mgKOH/g)'], ['tan', 'TAN (mgKOH/g)'], ['oxidacion', 'Oxidación'], ['nitracion', 'Nitración'], ['sulfatacion', 'Sulfatación']] },
    { titulo: 'Conteo de partículas', campos: [['iso4406', 'Código ISO 4406'], ['pq', 'Índice PQ']] },
    { titulo: 'Diagnóstico', campos: [['severidad', 'Estado / severidad'], ['recomendacion', 'Recomendación']] },
  ]
  const [iaSinon, setIaSinon] = useState<Record<string, string>>({})
  const [iaSaving, setIaSaving] = useState(false)
  const [iaMsg, setIaMsg] = useState('')

  const cargarConfig = async () => {
    try {
      const r = await apiClient.get('/lubricacion/config')
      const sin: Record<string, string[]> = r.data?.sinonimos ?? {}
      const asText: Record<string, string> = {}
      Object.keys(sin).forEach((k) => { asText[k] = (sin[k] || []).join(', ') })
      setIaSinon(asText)
    } catch { /* servidor sin OCR configurado aún */ }
  }
  useEffect(() => { if (tab === 5) cargarConfig() }, [tab])

  const guardarConfig = async () => {
    setIaSaving(true); setIaMsg('')
    try {
      const sinonimos: Record<string, string[]> = {}
      Object.keys(iaSinon).forEach((k) => {
        sinonimos[k] = iaSinon[k].split(',').map((s) => s.trim()).filter(Boolean)
      })
      await apiClient.put('/lubricacion/config', { sinonimos })
      setIaMsg('Diccionario guardado ✓')
    } catch (err: any) {
      setIaMsg(err?.response?.data?.detail || 'No se pudo guardar el diccionario')
    } finally { setIaSaving(false) }
  }
  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(EAM_COLOR, 0.15), color: EAM_COLOR }}>
            <SettingsIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1E293B">Configuración EAM</Typography>
            <Typography variant="body2" color="grey.400">Catálogos, contratistas, umbrales de aviso, integraciones y horas programadas</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR } }}>
            {['Catálogos', 'Contratistas', 'Umbrales de aviso', 'Integraciones', 'Disponibilidad', 'Lubricación'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* Tab 0: Catálogos */}
        {tab === 0 && (
          <Grid container spacing={2}>

            {/* ── Catálogo de vehículos: tipo > marca > línea > modelo ── */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}` }}>
                <CardContent>
                  <Box mb={2}>
                    <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                      Catálogo de vehículos y equipos
                    </Typography>
                    <Typography variant="caption" color="grey.500">
                      Tipo → marca → línea → modelo, con motores y combustibles. Es lo que se
                      ofrece al crear un activo.
                    </Typography>
                  </Box>
                  <CatalogoVehiculos color={EAM_COLOR} />
                </CardContent>
              </Card>
            </Grid>

            {/* ── Tipos de Trabajo — card especial con CRUD ── */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}` }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="#1E293B">Tipos de Trabajo</Typography>
                      <Typography variant="caption" color="grey.500">{tiposTrabajo.length} tipos configurados — categorías, duración y requisitos</Typography>
                      <Box sx={{ mt: 1 }}>
                        <CargueCatalogoEAM ruta="tipos-trabajo" color={EAM_COLOR} />
                      </Box>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} variant="contained"
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#1A1A1A' }, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      onClick={openNewTipo}
                    >
                      Agregar tipo
                    </Button>
                  </Stack>

                  {/* Buscador */}
                  <TextField
                    fullWidth size="small" placeholder="Buscar por nombre o categoría..."
                    value={tipoSearch}
                    onChange={(e) => setTipoSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'grey.600', fontSize: 16 }} /></InputAdornment> }}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: alpha(EAM_COLOR, 0.4) }, fontSize: 13 } }}
                  />

                  {/* Cabecera */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 130px 80px 1fr 36px 36px', gap: 1, px: 1, py: 0.5, bgcolor: alpha(EAM_COLOR, 0.05), borderRadius: '6px', mb: 0.5 }}>
                    {['Nombre', 'Categoría', 'Duración', 'Atributos', '', ''].map((h) => (
                      <Typography key={h} fontSize={10} fontWeight={700} color="#64748B" letterSpacing="0.4px">{h.toUpperCase()}</Typography>
                    ))}
                  </Box>

                  {/* Filas */}
                  <Stack spacing={0.5}>
                    {filteredTipos.map((t) => (
                      <Box key={t.id} sx={{
                        display: 'grid', gridTemplateColumns: '1fr 130px 80px 1fr 36px 36px',
                        gap: 1, px: 1, py: 0.75, alignItems: 'center',
                        borderRadius: '8px', border: `1px solid #E5E7EB`,
                        '&:hover': { bgcolor: alpha('#fff', 0.02) },
                      }}>
                        <Typography fontSize={13} color="#1E293B" fontWeight={500}>{t.nombre}</Typography>

                        <Chip
                          label={t.categoria}
                          size="small"
                          sx={{ bgcolor: alpha(CAT_COLOR[t.categoria], 0.15), color: CAT_COLOR[t.categoria], fontWeight: 700, fontSize: 10, height: 20, border: `1px solid ${alpha(CAT_COLOR[t.categoria], 0.3)}`, width: 'fit-content' }}
                        />

                        <Typography fontSize={12} color="grey.400">{t.duracion}</Typography>

                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {t.requiereTaller && (
                            <Chip label="Taller" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', fontSize: 9, height: 18, border: '1px solid rgba(245,158,11,0.2)' }} />
                          )}
                          {t.requiereMateriales && (
                            <Chip label="Repuestos" size="small" sx={{ bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6', fontSize: 9, height: 18, border: '1px solid rgba(59,130,246,0.2)' }} />
                          )}
                          {!t.requiereTaller && !t.requiereMateriales && (
                            <Typography fontSize={11} color="grey.600">Sin requisitos</Typography>
                          )}
                        </Stack>

                        <IconButton size="small" sx={{ color: 'grey.500', '&:hover': { color: EAM_COLOR } }} onClick={() => openEditTipo(t)}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ color: 'grey.600', '&:hover': { color: '#EF4444' } }} onClick={() => deleteTipo(t.id)}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Diálogo crear/editar tipo de trabajo */}
            <Dialog open={tipoDialog} onClose={() => setTipoDialog(false)} maxWidth="sm" fullWidth
              PaperProps={{ sx: { border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '14px' } }}
            >
              <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                {tipoEditing.id && tiposTrabajo.find(t => t.id === tipoEditing.id) ? 'Editar tipo de trabajo' : 'Nuevo tipo de trabajo'}
                <IconButton size="small" onClick={() => setTipoDialog(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth size="small" label="Nombre del trabajo"
                    value={tipoEditing.nombre}
                    onChange={(e) => setTipoEditing((p) => ({ ...p, nombre: e.target.value }))}
                    
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      select fullWidth size="small" label="Categoría"
                      value={tipoEditing.categoria}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, categoria: e.target.value as CatTrabajo }))}
                      sx={{ '& .MuiSvgIcon-root': { color: 'grey.500' } }}
                    >
                      {CATEGORIAS_TRABAJO.map((c) => (
                        <MenuItem key={c} value={c}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CAT_COLOR[c] }} />
                            <span>{c}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      fullWidth size="small" label="Duración estimada"
                      value={tipoEditing.duracion}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, duracion: e.target.value }))}
                      placeholder="Ej: 2h, 4h, Variable"
                      
                    />
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth size="small" label="Sistema del activo"
                      value={tipoEditing.sistema}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, sistema: e.target.value }))}
                      placeholder="Ej: Motor, Eléctrico, Hidráulico"
                      
                    />
                    <TextField
                      fullWidth size="small" label="Subsistema del activo"
                      value={tipoEditing.subsistema}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, subsistema: e.target.value }))}
                      placeholder="Ej: Lubricación, Circuitos, Transmisión"
                      
                    />
                  </Stack>

                  <Stack direction="row" spacing={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tipoEditing.requiereTaller}
                          onChange={(e) => setTipoEditing((p) => ({ ...p, requiereTaller: e.target.checked }))}
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#F59E0B' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#F59E0B' } }}
                        />
                      }
                      label={<Typography fontSize={13} color="grey.300">Requiere taller externo</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tipoEditing.requiereMateriales}
                          onChange={(e) => setTipoEditing((p) => ({ ...p, requiereMateriales: e.target.checked }))}
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#3B82F6' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3B82F6' } }}
                        />
                      }
                      label={<Typography fontSize={13} color="grey.300">Requiere repuestos</Typography>}
                    />
                  </Stack>

                  {/* Preview del badge */}
                  {tipoEditing.nombre && (
                    <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.03), borderRadius: '8px', border: `1px solid #E5E7EB` }}>
                      <Typography fontSize={11} color="grey.500" mb={0.75}>Vista previa de badges:</Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        <Chip label={tipoEditing.categoria} size="small" sx={{ bgcolor: alpha(CAT_COLOR[tipoEditing.categoria], 0.15), color: CAT_COLOR[tipoEditing.categoria], fontWeight: 700, fontSize: 10, height: 20 }} />
                        <Chip label={`⏱ ${tipoEditing.duracion || '?'}`} size="small" sx={{ bgcolor: alpha('#fff', 0.05), color: 'text.secondary', fontSize: 10, height: 20 }} />
                        {tipoEditing.requiereTaller && <Chip label="Requiere taller" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', fontSize: 10, height: 20 }} />}
                        {tipoEditing.requiereMateriales && <Chip label="Requiere repuestos" size="small" sx={{ bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6', fontSize: 10, height: 20 }} />}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => setTipoDialog(false)} sx={{ color: 'grey.400' }}>Cancelar</Button>
                <Button
                  variant="contained" onClick={saveTipo}
                  disabled={!tipoEditing.nombre.trim()}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#1A1A1A' }, fontWeight: 700, borderRadius: '8px' }}
                >
                  Guardar
                </Button>
              </DialogActions>
            </Dialog>

            {/* ── Centros de Costo — card especial con CRUD ── */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}` }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="#1E293B">Centros de Costo</Typography>
                      <Typography variant="caption" color="grey.500">{centrosCosto.length} centros configurados — asociados a plataformas y ciudades</Typography>
                      <Box sx={{ mt: 1 }}>
                        <CargueCatalogoEAM ruta="centros-costo" color={EAM_COLOR} />
                      </Box>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} variant="contained"
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#1A1A1A' }, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      onClick={openNewCC}
                    >
                      Agregar centro
                    </Button>
                  </Stack>
                  <TextField
                    fullWidth size="small" placeholder="Buscar por código, nombre o ciudad..."
                    value={ccSearch} onChange={(e) => setCcSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'grey.600', fontSize: 16 }} /></InputAdornment> }}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { fontSize: 13 } }}
                  />
                  {/* Header */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 1fr 90px', gap: 1, px: 1, pb: 0.5, borderBottom: '1px solid #E5E7EB', mb: 0.5 }}>
                    {['Código', 'Nombre', 'Ciudad', 'Plataforma', ''].map((h) => (
                      <Typography key={h} fontSize={10} fontWeight={700} color="#64748B" letterSpacing="0.04em" textTransform="uppercase">{h}</Typography>
                    ))}
                  </Box>
                  <Stack spacing={0.25}>
                    {filteredCC.map((c) => (
                      <Box key={c.id} sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 1fr 90px', gap: 1, px: 1, py: 0.75, borderRadius: '6px', '&:hover': { bgcolor: alpha('#fff', 0.03) }, alignItems: 'center' }}>
                        <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>{c.codigo}</Typography>
                        <Typography fontSize={12} color="#1E293B" noWrap>{c.nombre}</Typography>
                        <Typography fontSize={12} color="#64748B" noWrap>{c.ciudad}</Typography>
                        <Typography fontSize={12} color="#64748B" noWrap>{c.plataforma}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => openEditCC(c)} sx={{ color: EAM_COLOR, '&:hover': { bgcolor: alpha(EAM_COLOR, 0.1) } }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" onClick={() => deleteCC(c.id)} sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Stack>
                      </Box>
                    ))}
                    {filteredCC.length === 0 && (
                      <Typography fontSize={12} color="#64748B" textAlign="center" py={2}>Sin resultados</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Dialog Centros de Costo */}
            <Dialog open={ccDialog} onClose={() => setCcDialog(false)} maxWidth="sm" fullWidth
              PaperProps={{ sx: { border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '14px' } }}
            >
              <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                {ccEditing.id && centrosCosto.find((c) => c.id === ccEditing.id) ? 'Editar centro de costo' : 'Nuevo centro de costo'}
                <IconButton size="small" onClick={() => setCcDialog(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth size="small" label="Código"
                      value={ccEditing.codigo}
                      onChange={(e) => setCcEditing((p) => ({ ...p, codigo: e.target.value }))}
                      placeholder="Ej: CC-007"
                      
                    />
                    <TextField
                      fullWidth size="small" label="Nombre del centro de costo"
                      value={ccEditing.nombre}
                      onChange={(e) => setCcEditing((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Flota Cali"
                      
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    {/* Texto libre con sugerencias de lo ya registrado: antes eran
                        seis ciudades y cinco «plataformas» fijas, y una empresa con
                        sede en Pereira no podía registrar su centro de costo. */}
                    <Autocomplete
                      freeSolo fullWidth
                      options={Array.from(new Set(centrosCosto.map(c => c.ciudad).filter(Boolean))).sort()}
                      inputValue={ccEditing.ciudad ?? ''}
                      onInputChange={(_e, v) => setCcEditing((p) => ({ ...p, ciudad: v }))}
                      renderInput={(params) => <TextField {...params} size="small" label="Ciudad" />}
                    />
                    <Autocomplete
                      freeSolo fullWidth
                      options={Array.from(new Set(centrosCosto.map(c => c.plataforma).filter(Boolean))).sort()}
                      inputValue={ccEditing.plataforma ?? ''}
                      onInputChange={(_e, v) => setCcEditing((p) => ({ ...p, plataforma: v }))}
                      renderInput={(params) => <TextField {...params} size="small" label="Plataforma o sede" />}
                    />
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => setCcDialog(false)} sx={{ color: 'grey.400' }}>Cancelar</Button>
                <Button
                  variant="contained" onClick={saveCC}
                  disabled={!ccEditing.codigo.trim() || !ccEditing.nombre.trim()}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#1A1A1A' }, fontWeight: 700, borderRadius: '8px' }}
                >
                  Guardar
                </Button>
              </DialogActions>
            </Dialog>

            {/* Actividades, repuestos, fallas, causas y soluciones: cada uno
                tiene su tabla y las OTs los referencian por id. */}
            {CATALOGOS_CMMS.map(def => (
              <Grid key={def.ruta} size={{ xs: 12, md: 6 }}>
                <CatalogoCMMS def={def} color={EAM_COLOR} />
              </Grid>
            ))}

            {/* ── Esquemas de vehículo — categorías de ejes/llantas, catálogo real ── */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}` }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="#1E293B">Esquemas de vehículo (ejes / llantas)</Typography>
                      <Typography variant="caption" color="grey.500">
                        {esquemas.length} categorías configuradas — se pre-configuran aquí una sola vez; en Activos y en Neumáticos solo se le asigna una a cada vehículo
                      </Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} variant="contained"
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#1A1A1A' }, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      onClick={abrirNuevoEsquema}
                    >
                      Agregar categoría
                    </Button>
                  </Stack>

                  <TextField
                    fullWidth size="small" placeholder="Buscar por nombre o código..."
                    value={catSearch.esquemas ?? ''}
                    onChange={(e) => setCatSearch(s => ({ ...s, esquemas: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'grey.600', fontSize: 16 }} /></InputAdornment> }}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: alpha(EAM_COLOR, 0.4) }, fontSize: 13 } }}
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1.4fr 1fr 90px 90px 90px 36px 36px', gap: 1, px: 1, py: 0.5, bgcolor: alpha(EAM_COLOR, 0.05), borderRadius: '6px', mb: 0.5 }}>
                    {['Código', 'Nombre', 'Tipo de activo', 'Ejes', 'Llantas', 'Repuesto', '', ''].map((h) => (
                      <Typography key={h} fontSize={10} fontWeight={700} color="#64748B" letterSpacing="0.4px">{h.toUpperCase()}</Typography>
                    ))}
                  </Box>

                  <Stack spacing={0.5} sx={{ maxHeight: 480, overflowY: 'auto' }}>
                    {esquemas
                      .filter(e => {
                        const q = (catSearch.esquemas ?? '').toLowerCase()
                        if (!q) return true
                        return e.nombre.toLowerCase().includes(q) || (e.codigo ?? '').toLowerCase().includes(q)
                      })
                      .map((e) => (
                      <Box key={e.id} sx={{
                        display: 'grid', gridTemplateColumns: '70px 1.4fr 1fr 90px 90px 90px 36px 36px',
                        gap: 1, px: 1, py: 0.75, alignItems: 'center',
                        borderRadius: '8px', border: '1px solid #E5E7EB',
                      }}>
                        <Typography fontSize={11} color="grey.500" fontFamily="monospace">{e.codigo ?? '—'}</Typography>
                        <Tooltip
                          placement="right" arrow
                          title={<EsquemaLlantasPreview
                            layout={e.layout} numeroEjes={e.numero_ejes}
                            tieneRepuesto={e.tiene_repuesto} cantidadRepuestos={e.cantidad_repuestos}
                            nombre={e.nombre}
                          />}
                          componentsProps={{ tooltip: { sx: { bgcolor: '#0F172A', maxWidth: 'none' } }, arrow: { sx: { color: '#0F172A' } } }}
                        >
                          <Typography fontSize={13} color="#1E293B" fontWeight={500} sx={{ cursor: 'help', width: 'fit-content' }}>{e.nombre}</Typography>
                        </Tooltip>
                        <Typography fontSize={12} color="grey.500">{tiposActivoCfg.find(t => t.codigo === e.tipo_activo)?.nombre ?? (e.tipo_activo ? e.tipo_activo : 'Cualquiera')}</Typography>
                        <Typography fontSize={12} color="grey.500">{e.numero_ejes}</Typography>
                        <Typography fontSize={12} color="grey.500" fontWeight={600}>{e.layout?.length ? totalLlantas(e.layout) : e.numero_ejes * 2}</Typography>
                        <Chip label={e.tiene_repuesto ? `Sí (${e.cantidad_repuestos})` : 'No'} size="small" sx={{ bgcolor: alpha(e.tiene_repuesto ? EAM_COLOR : '#94A3B8', 0.12), color: e.tiene_repuesto ? EAM_COLOR : '#64748B', fontSize: 10, height: 20, width: 'fit-content' }} />
                        <IconButton size="small" sx={{ color: 'grey.500', '&:hover': { color: EAM_COLOR } }} onClick={() => abrirEditarEsquema(e)}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ color: 'grey.600', '&:hover': { color: '#EF4444' } }} onClick={() => eliminarEsquema(e.id)}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))}
                    {esquemas.length === 0 && <Typography fontSize={12} color="grey.500" textAlign="center" py={2}>Sin categorías creadas aún</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Dialog open={esquemaDialog} onClose={() => setEsquemaDialog(false)} maxWidth="sm" fullWidth
              PaperProps={{ sx: { border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '14px' } }}
            >
              <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                {esquemaEditingId ? 'Editar categoría de ejes/llantas' : 'Nueva categoría de ejes/llantas'}
                <IconButton size="small" onClick={() => setEsquemaDialog(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField fullWidth size="small" label="Código (opcional)" placeholder="Ej: esq53"
                      value={esquemaForm.codigo} onChange={(e) => setEsquemaForm(f => ({ ...f, codigo: e.target.value }))} />
                    <TextField fullWidth size="small" label="Nombre *" placeholder="Ej: Tractocamión 3 ejes"
                      value={esquemaForm.nombre} onChange={(e) => setEsquemaForm(f => ({ ...f, nombre: e.target.value }))} />
                  </Stack>
                  <TextField select fullWidth size="small" label="Tipo de activo (opcional)"
                    value={esquemaForm.tipo_activo} onChange={(e) => setEsquemaForm(f => ({ ...f, tipo_activo: e.target.value }))}>
                    <MenuItem value="">Cualquiera</MenuItem>
                    {tiposActivoCfg.map(t => <MenuItem key={t.codigo} value={t.codigo}>{t.nombre}</MenuItem>)}
                  </TextField>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontSize={12} fontWeight={700} color="grey.500">
                        LLANTAS POR EJE — {esquemaForm.layout.length} eje(s), {totalLlantas(esquemaForm.layout.map(x => Number(x) || 0))} llantas en total
                      </Typography>
                      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={agregarEje} sx={{ textTransform: 'none', fontSize: 11.5 }}>Agregar eje</Button>
                    </Stack>
                    <Stack spacing={1}>
                      {esquemaForm.layout.map((cant, i) => (
                        <Stack key={i} direction="row" spacing={1} alignItems="center">
                          <Typography fontSize={12} color="grey.500" sx={{ width: 48 }}>Eje {i + 1}</Typography>
                          <TextField size="small" type="number" label="Llantas" fullWidth value={cant} onChange={(e) => cambiarLlantasEje(i, e.target.value)} />
                          <IconButton size="small" disabled={esquemaForm.layout.length <= 1} sx={{ color: 'grey.500', '&:hover': { color: '#EF4444' } }} onClick={() => quitarEje(i)}>
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControlLabel sx={{ whiteSpace: 'nowrap' }} control={<Switch checked={esquemaForm.tiene_repuesto} onChange={(e) => setEsquemaForm(f => ({ ...f, tiene_repuesto: e.target.checked }))} />} label="Tiene repuesto" />
                    {esquemaForm.tiene_repuesto && (
                      <TextField fullWidth size="small" type="number" label="Cant. repuestos"
                        value={esquemaForm.cantidad_repuestos} onChange={(e) => setEsquemaForm(f => ({ ...f, cantidad_repuestos: e.target.value }))} />
                    )}
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => setEsquemaDialog(false)} sx={{ color: 'grey.400' }}>Cancelar</Button>
                <Button
                  variant="contained" onClick={guardarEsquema}
                  disabled={!esquemaForm.nombre.trim() || esquemaForm.layout.length === 0 || esquemaForm.layout.some(x => !x || Number(x) <= 0)}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#1A1A1A' }, fontWeight: 700, borderRadius: '8px' }}
                >
                  Guardar
                </Button>
              </DialogActions>
            </Dialog>
          </Grid>
        )}

        {/* Tab 1: Contratistas */}
        {tab === 1 && <ContratistasSection />}

        {/* Tab 2: Umbrales de aviso (los que algún cálculo lee) */}
        {tab === 2 && <UmbralesSection />}

        {/* Tab 3: Integraciones reales con otros módulos */}
        {tab === 3 && <IntegracionesSection />}

        {/* Tab 4: Horas programadas por activo (base de la disponibilidad) */}
        {tab === 4 && <DisponibilidadSection />}

        {/* ── Tab 5: OCR de Lubricación (diccionario del motor propio de lectura) ── */}
        {tab === 5 && (
          <ConfiguracionLubricacion panelOcr={
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 0.5 }}>
                  Diccionario del lector de boletines (OCR local)
                </Typography>
                <Typography fontSize={12.5} color="#64748B" mb={2}>
                  El lector es un motor propio que corre en el servidor (sin IA externa): OCR local (Tesseract /
                  extracción de PDF) + reglas. Para cada parámetro define las palabras o sinónimos que el motor debe
                  buscar en el boletín, separadas por coma. Ajustarlas mejora la lectura con tus formatos de laboratorio.
                  La lectura se usa en Lubricación → Laboratorio de Aceites → "Leer boletín".
                </Typography>

                {IA_GRUPOS.map((g) => (
                  <Box key={g.titulo} sx={{ mb: 3 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: EAM_COLOR, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25 }}>
                      {g.titulo}
                    </Typography>
                    <Stack spacing={1.5}>
                      {g.campos.map(([k, label]) => (
                        <TextField key={k} fullWidth size="small" label={`${label} — sinónimos`}
                          value={iaSinon[k] ?? ''}
                          onChange={(e) => setIaSinon((d) => ({ ...d, [k]: e.target.value }))}
                          placeholder="p. ej. hierro, fe, iron" helperText=" " />
                      ))}
                    </Stack>
                  </Box>
                ))}

                <Stack direction="row" alignItems="center" spacing={2} mt={1}>
                  <Button variant="contained" onClick={guardarConfig} disabled={iaSaving}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#1A1A1A' }, fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}>
                    {iaSaving ? 'Guardando…' : 'Guardar diccionario'}
                  </Button>
                  {iaMsg && <Typography fontSize={12.5} color={iaMsg.includes('✓') ? '#16A34A' : '#DC2626'}>{iaMsg}</Typography>}
                </Stack>
              </CardContent>
            </Card>
          } />
        )}

      </Box>
    </Layout>
  )
}
