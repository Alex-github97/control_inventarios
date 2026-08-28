import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
  Stepper,
  Step,
  StepLabel,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  Avatar,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Description,
  Add,
  Search,
  Visibility,
  History,
  Download,
  CheckCircle,
  Cancel,
  Schedule,
  FilterList,
  CloudUpload,
} from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'

import { COLOR_MODULO } from '@/config/marca'
const DMS_COLOR = COLOR_MODULO

// ─── Estado config ────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  BORRADOR:    { label: 'Borrador',    bg: '#F3F4F6',              color: '#6B7280' },
  EN_REVISION: { label: 'En Revisión', bg: alpha('#D97706', 0.12), color: '#D97706' },
  APROBADO:    { label: 'Aprobado',    bg: alpha('#2563EB', 0.12), color: '#2563EB' },
  PUBLICADO:   { label: 'Publicado',   bg: alpha('#16A34A', 0.12), color: '#16A34A' },
  OBSOLETO:    { label: 'Obsoleto',    bg: alpha('#DC2626', 0.12), color: '#DC2626' },
  ARCHIVADO:   { label: 'Archivado',   bg: alpha('#92400E', 0.12), color: '#92400E' },
}

const TODOS_ESTADOS = ['BORRADOR', 'EN_REVISION', 'APROBADO', 'PUBLICADO', 'OBSOLETO', 'ARCHIVADO']

// Siguiente transición rápida permitida (espejo del backend _TRANSICIONES_VALIDAS)
const SIGUIENTE_ESTADO: Record<string, { estado: string; label: string } | undefined> = {
  BORRADOR:    { estado: 'EN_REVISION', label: 'Enviar a revisión' },
  EN_REVISION: { estado: 'APROBADO',    label: 'Aprobar' },
  APROBADO:    { estado: 'PUBLICADO',   label: 'Publicar' },
}

function EstadoChip({ estado, onClick }: { estado: string; onClick?: () => void }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <Chip
      label={cfg.label}
      size="small"
      onClick={onClick}
      sx={{ fontSize: 10, fontWeight: 700, bgcolor: cfg.bg, color: cfg.color, cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { opacity: 0.85 } : {} }}
    />
  )
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Documento {
  id: number
  codigo: string
  nombre: string
  categoria: string
  estado: string
  version: string
  vigenciaHasta: string
  vigente: boolean
  propietario: string
}

interface DocApi {
  id: number
  codigo: string
  nombre: string
  estado: string
  tipo_nombre?: string | null
  propietario_nombre?: string | null
  version_actual?: string | null
  fecha_vigencia_fin?: string | null
  created_at?: string | null
}

const fmtFecha = (s?: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const mapDoc = (d: DocApi): Documento => ({
  id: d.id,
  codigo: d.codigo,
  nombre: d.nombre,
  categoria: d.tipo_nombre || '—',
  estado: d.estado,
  version: d.version_actual ? `v${String(d.version_actual).replace(/^v/i, '')}` : 'v1.0',
  vigenciaHasta: fmtFecha(d.fecha_vigencia_fin),
  vigente: !d.fecha_vigencia_fin || new Date(d.fecha_vigencia_fin) >= new Date(new Date().toDateString()),
  propietario: d.propietario_nombre || '—',
})

async function descargarBlob(url: string, fallbackName: string) {
  try {
    const resp = await apiClient.get(url, { responseType: 'blob' })
    const cd = resp.headers['content-disposition'] as string | undefined
    const m = cd && /filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i.exec(cd)
    const nombre = m ? decodeURIComponent(m[1]) : fallbackName
    const blobUrl = window.URL.createObjectURL(resp.data)
    const a = document.createElement('a')
    a.href = blobUrl; a.download = nombre
    document.body.appendChild(a); a.click(); a.remove()
    window.URL.revokeObjectURL(blobUrl)
  } catch (e: any) {
    toast.error(e.response?.status === 404 ? 'El documento no tiene archivo cargado' : 'No se pudo descargar')
  }
}

// ─── Dialog: Ver Documento ────────────────────────────────────────────────────

function DialogVerDocumento({ doc, open, onClose }: { doc: Documento | null; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState(0)

  const { data: versiones = [], isLoading: loadingVers } = useQuery<any[]>({
    queryKey: ['dms-versiones', doc?.id],
    queryFn: () => apiClient.get(`/dms/documentos/${doc!.id}/versiones`).then((r) => r.data),
    enabled: open && !!doc && tab === 1,
  })
  const { data: firmas = [], isLoading: loadingFirmas } = useQuery<any[]>({
    queryKey: ['dms-firmas', doc?.id],
    queryFn: () => apiClient.get(`/dms/firmas`, { params: { documento_id: doc!.id } }).then((r) => r.data),
    enabled: open && !!doc && tab === 2,
  })
  const { data: instancias = [], isLoading: loadingFlujo } = useQuery<any[]>({
    queryKey: ['dms-instancias', doc?.id],
    queryFn: () => apiClient.get(`/dms/instancias`, { params: { documento_id: doc!.id } }).then((r) => r.data),
    enabled: open && !!doc && tab === 3,
  })

  if (!doc) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography fontWeight={700} fontSize={16}>{doc.nombre}</Typography>
            <Typography fontSize={12} color="text.secondary" fontFamily="monospace">{doc.codigo}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" startIcon={<Download sx={{ fontSize: 16 }} />} onClick={() => descargarBlob(`/dms/documentos/${doc.id}/download`, doc.nombre)} sx={{ color: DMS_COLOR, fontSize: 12 }}>Descargar</Button>
            <EstadoChip estado={doc.estado} />
          </Stack>
        </Stack>
      </DialogTitle>
      <Box sx={{ borderBottom: '1px solid #E5E7EB', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: 12, minHeight: 40 } }}>
          <Tab label="Información" />
          <Tab label="Versiones" />
          <Tab label="Firmas" />
          <Tab label="Flujo" />
        </Tabs>
      </Box>
      <DialogContent sx={{ p: 3, minHeight: 220 }}>
        {tab === 0 && (
          <Grid container spacing={2}>
            {[
              ['Código', doc.codigo], ['Categoría / Tipo', doc.categoria], ['Estado', ESTADO_CONFIG[doc.estado]?.label ?? doc.estado],
              ['Versión', doc.version], ['Propietario', doc.propietario], ['Vigencia hasta', doc.vigenciaHasta],
            ].map(([label, value]) => (
              <Grid key={label} size={{ xs: 12, sm: 6 }}>
                <Typography fontSize={11} color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>{label}</Typography>
                <Typography fontSize={13} mt={0.25}>{value}</Typography>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 1 && (
          loadingVers ? <Box textAlign="center" py={4}><CircularProgress size={26} /></Box>
          : versiones.length === 0 ? <EmptyState texto="Este documento aún no tiene versiones con archivo cargado." />
          : (
            <Stack spacing={1.5}>
              {versiones.map((v) => (
                <Box key={v.id} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip label={`v${v.numero_version}`} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR }} />
                    <Box>
                      <Typography fontSize={12} fontWeight={600}>{v.nombre_archivo || v.comentario || 'Versión'}</Typography>
                      <Typography fontSize={11} color="text.secondary">
                        {fmtFecha(v.created_at)}{v.tamanio_bytes ? ` · ${(v.tamanio_bytes / 1024).toFixed(0)} KB` : ''}{v.hash_md5 ? ` · ${v.hash_md5.slice(0, 8)}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                  <Tooltip title="Descargar esta versión">
                    <IconButton size="small" onClick={() => descargarBlob(`/dms/versiones/${v.id}/download`, v.nombre_archivo || doc.nombre)} sx={{ color: DMS_COLOR }}><Download sx={{ fontSize: 18 }} /></IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )
        )}

        {tab === 2 && (
          loadingFirmas ? <Box textAlign="center" py={4}><CircularProgress size={26} /></Box>
          : firmas.length === 0 ? <EmptyState texto="No hay firmas solicitadas para este documento." />
          : (
            <Stack spacing={2}>
              {firmas.map((f) => {
                const firmado = f.estado === 'FIRMADO'
                return (
                  <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: firmado ? alpha('#16A34A', 0.15) : '#F3F4F6', color: firmado ? '#16A34A' : '#9CA3AF' }}>
                      {firmado ? <CheckCircle sx={{ fontSize: 20 }} /> : <Schedule sx={{ fontSize: 20 }} />}
                    </Avatar>
                    <Box flex={1}>
                      <Typography fontSize={13} fontWeight={600}>Firmante #{f.firmante_id}</Typography>
                      <Typography fontSize={11} color="text.secondary">{f.tipo_firma} · orden {f.orden}</Typography>
                    </Box>
                    <Box textAlign="right">
                      <Chip label={firmado ? 'Firmado' : f.estado === 'RECHAZADO' ? 'Rechazado' : 'Pendiente'} size="small"
                        sx={{ fontSize: 10, fontWeight: 700, bgcolor: firmado ? alpha('#16A34A', 0.1) : f.estado === 'RECHAZADO' ? alpha('#DC2626', 0.1) : '#F3F4F6', color: firmado ? '#16A34A' : f.estado === 'RECHAZADO' ? '#DC2626' : '#9CA3AF' }} />
                      {f.fecha_firma && <Typography fontSize={10} color="text.disabled" mt={0.25}>{fmtFecha(f.fecha_firma)}</Typography>}
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          )
        )}

        {tab === 3 && (
          loadingFlujo ? <Box textAlign="center" py={4}><CircularProgress size={26} /></Box>
          : instancias.length === 0 ? <EmptyState texto="Este documento no tiene flujos de aprobación en curso." />
          : (
            <Stack spacing={1.5}>
              {instancias.map((it) => (
                <Box key={it.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: it.estado === 'COMPLETADO' ? alpha('#16A34A', 0.12) : it.estado === 'EN_CURSO' ? alpha(DMS_COLOR, 0.12) : '#F3F4F6' }}>
                    {it.estado === 'COMPLETADO' ? <CheckCircle sx={{ fontSize: 18, color: '#16A34A' }} /> : it.estado === 'CANCELADO' ? <Cancel sx={{ fontSize: 18, color: '#DC2626' }} /> : <Schedule sx={{ fontSize: 18, color: DMS_COLOR }} />}
                  </Box>
                  <Box flex={1}>
                    <Typography fontSize={13} fontWeight={600}>Instancia #{it.id}</Typography>
                    <Typography fontSize={11} color="text.secondary">Paso actual: {it.paso_actual ?? '—'} · iniciada {fmtFecha(it.created_at)}</Typography>
                  </Box>
                  <Chip label={it.estado} size="small" sx={{ fontSize: 10, fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR }} />
                </Box>
              ))}
            </Stack>
          )
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
      <Description sx={{ fontSize: 40, color: '#D1D5DB', mb: 1 }} />
      <Typography fontSize={13}>{texto}</Typography>
    </Box>
  )
}

// ─── Dialog: Nuevo Documento ─────────────────────────────────────────────────

const PASOS = ['Información básica', 'Archivo y vigencia']

function DialogNuevoDocumento({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [paso, setPaso] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState<{ codigo: string; nombre: string; descripcion: string; tipo_documento_id: string; carpeta_id: string; es_confidencial: boolean; desde: string; hasta: string; archivo: File | null }>(
    { codigo: '', nombre: '', descripcion: '', tipo_documento_id: '', carpeta_id: '', es_confidencial: false, desde: '', hasta: '', archivo: null }
  )
  const fileRef = React.useRef<HTMLInputElement>(null)

  const { data: tipos = [] } = useQuery<any[]>({ queryKey: ['dms-tipos'], queryFn: () => apiClient.get('/dms/tipos-documento').then((r) => r.data), enabled: open })
  const { data: carpetas = [] } = useQuery<any[]>({ queryKey: ['dms-carpetas-nuevo'], queryFn: () => apiClient.get('/dms/carpetas').then((r) => r.data), enabled: open })

  const reset = () => { setPaso(0); setForm({ codigo: '', nombre: '', descripcion: '', tipo_documento_id: '', carpeta_id: '', es_confidencial: false, desde: '', hasta: '', archivo: null }) }

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); setPaso(0); return }
    setGuardando(true)
    try {
      const payload: any = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        es_confidencial: form.es_confidencial,
      }
      if (form.codigo.trim()) payload.codigo = form.codigo.trim()
      if (form.tipo_documento_id) payload.tipo_documento_id = Number(form.tipo_documento_id)
      if (form.carpeta_id) payload.carpeta_id = Number(form.carpeta_id)
      if (form.desde) payload.fecha_vigencia_inicio = form.desde
      if (form.hasta) payload.fecha_vigencia_fin = form.hasta

      const doc = (await apiClient.post('/dms/documentos', payload)).data
      if (form.archivo) {
        const fd = new FormData(); fd.append('file', form.archivo)
        await apiClient.post(`/dms/documentos/${doc.id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      toast.success('Documento creado')
      reset(); onSaved(); onClose()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'No se pudo crear el documento')
    } finally { setGuardando(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo Documento</DialogTitle>
      <DialogContent>
        <Stepper activeStep={paso} sx={{ mb: 3 }}>
          {PASOS.map((label) => (
            <Step key={label}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 12 } }}>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {paso === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Código (opcional — se genera automático)" size="small" fullWidth placeholder="DOC-2026-XXXXXX"
                value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Nombre *" size="small" fullWidth required
                value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Tipo de documento</InputLabel>
                <Select label="Tipo de documento" value={form.tipo_documento_id} onChange={(e) => setForm((p) => ({ ...p, tipo_documento_id: String(e.target.value) }))}>
                  <MenuItem value="">— Sin tipo —</MenuItem>
                  {tipos.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Carpeta</InputLabel>
                <Select label="Carpeta" value={form.carpeta_id} onChange={(e) => setForm((p) => ({ ...p, carpeta_id: String(e.target.value) }))}>
                  <MenuItem value="">— Sin carpeta —</MenuItem>
                  {carpetas.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Descripción" size="small" fullWidth multiline rows={2}
                value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel control={<Switch size="small" checked={form.es_confidencial} onChange={(e) => setForm((p) => ({ ...p, es_confidencial: e.target.checked }))} />} label={<Typography fontSize={13}>Documento confidencial</Typography>} />
            </Grid>
          </Grid>
        )}

        {paso === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Vigencia — Desde" size="small" fullWidth type="date" InputLabelProps={{ shrink: true }}
                value={form.desde} onChange={(e) => setForm((p) => ({ ...p, desde: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Vigencia — Hasta" size="small" fullWidth type="date" InputLabelProps={{ shrink: true }}
                value={form.hasta} onChange={(e) => setForm((p) => ({ ...p, hasta: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setForm((p) => ({ ...p, archivo: f })) }} />
              <Box
                onClick={() => fileRef.current?.click()}
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                onDrop={(e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setForm((p) => ({ ...p, archivo: f })) }}
                sx={{ border: `2px dashed ${form.archivo ? DMS_COLOR : alpha(DMS_COLOR, 0.4)}`, borderRadius: '12px', p: 3, textAlign: 'center', bgcolor: alpha(DMS_COLOR, form.archivo ? 0.06 : 0.03), cursor: 'pointer', '&:hover': { borderColor: DMS_COLOR } }}
              >
                <CloudUpload sx={{ fontSize: 36, color: alpha(DMS_COLOR, 0.5), mb: 1 }} />
                {form.archivo
                  ? <><Typography fontSize={13} color={DMS_COLOR} fontWeight={700} noWrap>{form.archivo.name}</Typography><Typography fontSize={11} color="text.secondary" mt={0.25}>{(form.archivo.size / 1024).toFixed(0)} KB — clic para cambiar</Typography></>
                  : <><Typography fontSize={13} color={DMS_COLOR} fontWeight={600}>Seleccionar archivo</Typography><Typography fontSize={11} color="text.secondary" mt={0.25}>PDF, DOCX, XLSX, JPG — opcional</Typography></>
                }
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }} disabled={guardando}>Cancelar</Button>
        {paso > 0 && <Button onClick={() => setPaso((p) => p - 1)} disabled={guardando}>Anterior</Button>}
        {paso < PASOS.length - 1
          ? <Button variant="contained" onClick={() => setPaso((p) => p + 1)} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>Siguiente</Button>
          : <Button variant="contained" onClick={guardar} disabled={guardando} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        }
      </DialogActions>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DMSDocumentos() {
  const qc = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [estadosFiltro, setEstadosFiltro] = useState<string[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [verDoc, setVerDoc] = useState<Documento | null>(null)

  const { data: raw = [], isLoading } = useQuery<DocApi[]>({
    queryKey: ['dms-documentos'],
    queryFn: () => apiClient.get('/dms/documentos', { params: { per_page: 200 } }).then((r) => r.data),
  })

  const documentos = useMemo(() => raw.map(mapDoc), [raw])
  const categorias = useMemo(() => Array.from(new Set(documentos.map((d) => d.categoria).filter((c) => c && c !== '—'))), [documentos])

  const toggleEstado = (e: string) => setEstadosFiltro((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])

  const filtered = documentos.filter((d) => {
    const b = busqueda.toLowerCase()
    const matchBusqueda = busqueda === '' || d.nombre.toLowerCase().includes(b) || d.codigo.toLowerCase().includes(b)
    const matchEstado = estadosFiltro.length === 0 || estadosFiltro.includes(d.estado)
    const matchCat = categoriaFiltro === '' || d.categoria === categoriaFiltro
    return matchBusqueda && matchEstado && matchCat
  })

  const cambiarEstado = async (doc: Documento, nuevo: string) => {
    try {
      await apiClient.put(`/dms/documentos/${doc.id}/estado`, { estado: nuevo })
      toast.success(`Documento → ${ESTADO_CONFIG[nuevo]?.label ?? nuevo}`)
      qc.invalidateQueries({ queryKey: ['dms-documentos'] })
      qc.invalidateQueries({ queryKey: ['dms-kpis'] })
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'No se pudo cambiar el estado')
    }
  }

  return (
    <Layout title="DMS — Documentos">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(DMS_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Description sx={{ color: DMS_COLOR, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontSize={20} fontWeight={800}>Gestión de Documentos</Typography>
              <Typography fontSize={12} color="text.secondary">Repositorio centralizado de documentos empresariales</Typography>
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<Add />} onClick={() => setNuevoOpen(true)}
            sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px', fontSize: 13 }}>
            Nuevo Documento
          </Button>
        </Stack>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ fontSize: 18, color: 'text.disabled', mr: 0.5 }} /> }}
              sx={{ minWidth: 260 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Categoría</InputLabel>
              <Select label="Categoría" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {categorias.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />
              {TODOS_ESTADOS.map((e) => {
                const cfg = ESTADO_CONFIG[e]
                const activo = estadosFiltro.includes(e)
                return (
                  <Chip key={e} label={cfg.label} size="small" onClick={() => toggleEstado(e)}
                    sx={{ fontSize: 10, fontWeight: 700, cursor: 'pointer', bgcolor: activo ? cfg.bg : '#F9FAFB', color: activo ? cfg.color : '#9CA3AF', border: `1px solid ${activo ? cfg.color : '#E5E7EB'}` }} />
                )
              })}
            </Box>
          </Stack>
        </Paper>

        {/* ── Tabla ─────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1.25, bgcolor: '#FAFAFA' } }}>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Categoría / Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell>Vigencia</TableCell>
                  <TableCell>Propietario</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5 }}><CircularProgress size={26} /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>
                      {documentos.length === 0 ? 'Aún no hay documentos. Crea el primero con “Nuevo Documento”.' : 'No se encontraron documentos con los filtros aplicados'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((doc) => {
                  const sig = SIGUIENTE_ESTADO[doc.estado]
                  return (
                    <TableRow key={doc.id} hover sx={{ '& td': { fontSize: 12, py: 1 } }}>
                      <TableCell sx={{ fontWeight: 700, color: DMS_COLOR, fontFamily: 'monospace', fontSize: 11 }}>{doc.codigo}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography fontSize={12} noWrap fontWeight={500}>{doc.nombre}</Typography>
                      </TableCell>
                      <TableCell><Typography fontSize={11} color="text.secondary">{doc.categoria}</Typography></TableCell>
                      <TableCell>
                        <EstadoChip estado={doc.estado} />
                        {sig && (
                          <Typography fontSize={10} color={DMS_COLOR} mt={0.25} sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() => cambiarEstado(doc, sig.estado)}>
                            → {sig.label}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={doc.version} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(DMS_COLOR, 0.08), color: DMS_COLOR, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={doc.vigente ? 'Vigente' : 'Vencido'} size="small"
                          sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: doc.vigente ? alpha('#16A34A', 0.1) : alpha('#DC2626', 0.1), color: doc.vigente ? '#16A34A' : '#DC2626' }} />
                        {doc.vigenciaHasta !== '—' && <Typography fontSize={10} color="text.disabled" mt={0.25}>hasta {doc.vigenciaHasta}</Typography>}
                      </TableCell>
                      <TableCell>{doc.propietario}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          <Tooltip title="Ver documento"><IconButton size="small" onClick={() => setVerDoc(doc)}><Visibility sx={{ fontSize: 16, color: DMS_COLOR }} /></IconButton></Tooltip>
                          <Tooltip title="Ver versiones"><IconButton size="small" onClick={() => setVerDoc(doc)}><History sx={{ fontSize: 16, color: '#6B7280' }} /></IconButton></Tooltip>
                          <Tooltip title="Descargar"><IconButton size="small" onClick={() => descargarBlob(`/dms/documentos/${doc.id}/download`, doc.nombre)}><Download sx={{ fontSize: 16, color: '#2563EB' }} /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #F3F4F6' }}>
            <Typography fontSize={12} color="text.secondary">{filtered.length} de {documentos.length} documentos</Typography>
          </Box>
        </Paper>

      </Box>

      {/* Dialogs */}
      <DialogNuevoDocumento open={nuevoOpen} onClose={() => setNuevoOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['dms-documentos'] })} />
      <DialogVerDocumento doc={verDoc} open={!!verDoc} onClose={() => setVerDoc(null)} />
    </Layout>
  )
}
