import React, { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  Divider,
  IconButton,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Draw,
  CheckCircle,
  Cancel,
  PictureAsPdf,
  Fingerprint,
  Security,
  Verified,
  Schedule,
  Person,
  QrCode,
  Download,
  Visibility,
  Assignment,
  Search,
  Close,
  Add,
} from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { exportarPDF } from '@/utils/exportar'
import toast from 'react-hot-toast'

import { COLOR_MODULO } from '@/config/marca'
const DMS_COLOR = COLOR_MODULO

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FirmaApi {
  id: number
  documento_id: number
  version_id?: number | null
  firmante_id: number
  tipo_firma: string
  estado: string
  fecha_firma?: string | null
  ip_firma?: string | null
  dispositivo?: string | null
  observaciones?: string | null
  orden: number
  created_at?: string | null
}

interface FirmaVM extends FirmaApi {
  docNombre: string
  firmanteNombre: string
  ordenTexto: string
}

const fmtFechaHora = (s?: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const fmtFecha = (s?: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO')
}
const esHoy = (s?: string | null): boolean => {
  if (!s) return false
  const d = new Date(s); const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}
const estadoLabel = (e: string) => e === 'FIRMADO' ? 'Firmado' : e === 'RECHAZADO' ? 'Rechazado' : 'Pendiente'
const tipoLabel = (t: string) => t === 'ELECTRONICA' ? 'Electrónica' : t === 'DIGITAL' ? 'Digital' : t === 'APROBACION' ? 'Aprobación' : t
// Sello de verificación determinístico (no es un hash criptográfico del archivo)
const selloDe = (f: FirmaApi) => {
  const base = `${f.id}-${f.documento_id}-${f.firmante_id}-${f.fecha_firma ?? ''}`
  let h = 0
  for (let i = 0; i < base.length; i++) { h = (h * 31 + base.charCodeAt(i)) >>> 0 }
  return (h.toString(16).padStart(8, '0') + btoa(base).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).slice(0, 48)
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: alpha(color, 0.2), borderRadius: 2, background: alpha(color, 0.04), height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h3" fontWeight={700} sx={{ color, lineHeight: 1 }}>{value}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{label}</Typography>
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, background: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Firma Dialog (real) ───────────────────────────────────────────────────────

function FirmaDialog({ open, firma, onClose, onDone }: { open: boolean; firma: FirmaVM | null; onClose: () => void; onDone: () => void }) {
  const [observations, setObservations] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [loading, setLoading] = useState(false)

  const reset = () => { setObservations(''); setConfirmado(false) }
  const handleClose = () => { reset(); onClose() }

  const firmar = async () => {
    if (!firma || !confirmado) return
    setLoading(true)
    try {
      await apiClient.put(`/dms/firmas/${firma.id}/firmar`, { observaciones: observations || undefined })
      toast.success('Documento firmado'); reset(); onDone(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo firmar') }
    finally { setLoading(false) }
  }
  const rechazar = async () => {
    if (!firma) return
    setLoading(true)
    try {
      await apiClient.put(`/dms/firmas/${firma.id}/rechazar`, { observaciones: observations || undefined })
      toast.success('Firma rechazada'); reset(); onDone(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo rechazar') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`, color: '#fff', display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
        <Fingerprint />
        <Typography variant="h6" fontWeight={600}>Firma Electrónica</Typography>
        <IconButton onClick={handleClose} sx={{ ml: 'auto', color: '#fff' }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ background: '#f3f4f6', border: '2px dashed #d1d5db', borderRadius: 2, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 3 }}>
          <PictureAsPdf sx={{ fontSize: 48, color: '#ef4444' }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary" textAlign="center">{firma?.docNombre}</Typography>
          <Typography variant="caption" color="text.disabled">Documento a firmar</Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color={DMS_COLOR} sx={{ mb: 1.5 }}>Resumen de la firma</Typography>
          <Stack spacing={1}>
            {[
              { label: 'Documento', value: firma?.docNombre },
              { label: 'Firmante', value: firma?.firmanteNombre },
              { label: 'Tipo de firma', value: firma ? tipoLabel(firma.tipo_firma) : '' },
              { label: 'Orden de firma', value: firma?.ordenTexto },
            ].map(({ label, value }) => (
              <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" fontWeight={600}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <TextField label="Observaciones (opcional)" value={observations} onChange={(e) => setObservations(e.target.value)} multiline rows={3} fullWidth size="small" />

        <Box sx={{ mt: 2, p: 1.5, background: alpha(DMS_COLOR, 0.06), borderRadius: 1, border: `1px solid ${alpha(DMS_COLOR, 0.15)}` }}>
          <Stack direction="row" alignItems="flex-start" gap={1}>
            <Security sx={{ fontSize: 16, color: DMS_COLOR, mt: 0.2 }} />
            <Typography variant="caption" color="text.secondary">
              La firma quedará registrada por el servidor con tu <strong style={{ color: DMS_COLOR }}>IP de origen</strong>, marca de tiempo y un sello de verificación, y generará un evento inmutable en la auditoría.
            </Typography>
          </Stack>
        </Box>

        <Stack direction="row" alignItems="center" gap={1} mt={2}>
          <input id="confirmar-firma" type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
          <Typography component="label" htmlFor="confirmar-firma" variant="body2" sx={{ cursor: 'pointer' }}>
            Confirmo que firmo este documento de forma electrónica.
          </Typography>
        </Stack>

        {loading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={rechazar} variant="outlined" color="error" disabled={loading} startIcon={<Cancel />}>Rechazar</Button>
        <Box flex={1} />
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={loading}>Cancelar</Button>
        <Button onClick={firmar} variant="contained" disabled={!confirmado || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Fingerprint />}
          sx={{ background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`, '&:hover': { background: `linear-gradient(135deg, #0c6478 0%, #0779a0 100%)` } }}>
          {loading ? 'Procesando...' : 'Confirmar Firma'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Certificate Dialog (real) ──────────────────────────────────────────────────

function CertificateDialog({ open, firma, hermanas, onClose }: { open: boolean; firma: FirmaVM | null; hermanas: FirmaVM[]; onClose: () => void }) {
  const sello = firma ? selloDe(firma) : ''
  const codigo = firma ? `ICL-FIRM-${String(firma.id).padStart(6, '0')}` : ''
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: `linear-gradient(135deg, #065f46 0%, #047857 100%)`, color: '#fff', display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
        <Verified />
        <Typography variant="h6" fontWeight={600}>Certificado de Firma</Typography>
        <IconButton onClick={onClose} sx={{ ml: 'auto', color: '#fff' }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <Box sx={{ background: alpha('#10b981', 0.06), borderRadius: 2, p: 2, border: `1px solid ${alpha('#10b981', 0.2)}` }}>
            <Typography variant="caption" color="text.secondary" display="block">Código de verificación</Typography>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#065f46', fontFamily: 'monospace', mt: 0.5 }}>{codigo}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Sello de verificación</Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#374151', background: '#f9fafb', p: 1, borderRadius: 1, display: 'block', border: '1px solid #e5e7eb' }}>{sello}</Typography>
          </Box>

          <Stack direction="row" alignItems="center" gap={3} flexWrap="wrap">
            <Stack direction="row" alignItems="center" gap={1}>
              <Schedule sx={{ fontSize: 18, color: DMS_COLOR }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Marca de tiempo</Typography>
                <Typography variant="body2" fontWeight={600}>{fmtFechaHora(firma?.fecha_firma)}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" gap={1}>
              <Security sx={{ fontSize: 18, color: DMS_COLOR }} />
              <Box>
                <Typography variant="caption" color="text.secondary">IP de origen</Typography>
                <Typography variant="body2" fontWeight={600} fontFamily="monospace">{firma?.ip_firma || '—'}</Typography>
              </Box>
            </Stack>
          </Stack>

          {firma?.observaciones && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Observaciones</Typography>
              <Typography variant="body2">{firma.observaciones}</Typography>
            </Box>
          )}

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={700} color={DMS_COLOR} sx={{ mb: 1.5 }}>Firmantes del documento</Typography>
            <Stack spacing={1}>
              {hermanas.map((f) => (
                <Stack key={f.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.5, background: '#f9fafb', borderRadius: 1 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{f.firmanteNombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{tipoLabel(f.tipo_firma)} • {f.ip_firma || 's/ IP'}</Typography>
                    </Box>
                  </Stack>
                  <Chip label={estadoLabel(f.estado)} size="small" color={f.estado === 'FIRMADO' ? 'success' : f.estado === 'RECHAZADO' ? 'error' : 'warning'} />
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" fontWeight={700} color={DMS_COLOR} sx={{ mb: 1.5 }}>Representación QR</Typography>
            <Box sx={{ width: 120, height: 120, background: '#e5e7eb', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', border: '2px solid #d1d5db' }}>
              <Stack alignItems="center" gap={0.5}><QrCode sx={{ fontSize: 32, color: '#6b7280' }} /><Typography variant="caption" color="text.secondary">QR</Typography></Stack>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button startIcon={<Download />} variant="contained" onClick={() => exportarPDF({
          archivo: `certificado-firma-${codigo}`,
          titulo: 'Certificado de firma electrónica',
          subtitulo: `Código: ${codigo} · Fecha: ${fmtFechaHora(firma?.fecha_firma)} · Sello: ${sello}`,
          color: DMS_COLOR,
          columnas: [{ key: 'orden', header: '#' }, { key: 'firmanteNombre', header: 'Firmante' }, { key: 'tipo_firma', header: 'Tipo' }, { key: 'estadoTxt', header: 'Estado' }, { key: 'ip_firma', header: 'IP' }],
          filas: hermanas.map((h) => ({ orden: h.orden, firmanteNombre: h.firmanteNombre, tipo_firma: tipoLabel(h.tipo_firma), estadoTxt: estadoLabel(h.estado), ip_firma: h.ip_firma || '—' })),
        })} sx={{ background: '#065f46', '&:hover': { background: '#064e3b' } }}>Descargar Certificado</Button>
        <Button onClick={onClose} variant="outlined" color="inherit">Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Solicitar Firma Dialog ─────────────────────────────────────────────────────

function SolicitarDialog({ open, onClose, onDone, documentos, usuarios }: { open: boolean; onClose: () => void; onDone: () => void; documentos: any[]; usuarios: any[] }) {
  const [docId, setDocId] = useState('')
  const [firmanteId, setFirmanteId] = useState('')
  const [tipo, setTipo] = useState('ELECTRONICA')
  const [orden, setOrden] = useState('1')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => { if (open) { setDocId(''); setFirmanteId(''); setTipo('ELECTRONICA'); setOrden('1') } }, [open])

  const guardar = async () => {
    if (!docId || !firmanteId) { toast.error('Selecciona documento y firmante'); return }
    setSaving(true)
    try {
      await apiClient.post('/dms/firmas', { documento_id: Number(docId), firmante_id: Number(firmanteId), tipo_firma: tipo, orden: Number(orden) || 1 })
      toast.success('Solicitud de firma creada'); onDone(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo crear la solicitud') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Solicitar Firma</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mt={0.5}>
          <Grid size={{ xs: 12 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Documento</InputLabel>
              <Select label="Documento" value={docId} onChange={(e) => setDocId(String(e.target.value))}>
                {documentos.map((d) => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Firmante</InputLabel>
              <Select label="Firmante" value={firmanteId} onChange={(e) => setFirmanteId(String(e.target.value))}>
                {usuarios.map((u) => <MenuItem key={u.id} value={String(u.id)}>{`${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.username}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={tipo} onChange={(e) => setTipo(String(e.target.value))}>
                <MenuItem value="Electrónica">Electrónica</MenuItem>
                <MenuItem value="Digital">Digital</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField label="Orden" size="small" fullWidth type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancelar</Button>
        <Button onClick={guardar} variant="contained" disabled={saving} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' } }}>{saving ? 'Guardando…' : 'Solicitar'}</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Tabs ───────────────────────────────────────────────────────────────────────

function TabPendientes({ firmas, loading, onRefetch }: { firmas: FirmaVM[]; loading: boolean; onRefetch: () => void }) {
  const [firmaOpen, setFirmaOpen] = useState(false)
  const [selected, setSelected] = useState<FirmaVM | null>(null)
  const [snackOpen, setSnackOpen] = useState(false)
  const pendientes = firmas.filter((f) => f.estado === 'PENDIENTE')

  if (loading) return <Box textAlign="center" py={5}><CircularProgress size={28} /></Box>
  if (pendientes.length === 0) return <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No hay firmas pendientes.</Typography></Box>

  return (
    <>
      <Grid container spacing={2}>
        {pendientes.map((doc) => (
          <Grid key={doc.id} size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: alpha(DMS_COLOR, 0.15), borderRadius: 2, height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: `0 4px 20px ${alpha(DMS_COLOR, 0.12)}` } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                    <Stack direction="row" gap={1} alignItems="flex-start" flex={1}>
                      <PictureAsPdf sx={{ color: '#ef4444', mt: 0.2, flexShrink: 0 }} />
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={700} lineHeight={1.3}>{doc.docNombre}</Typography>
                        <Typography variant="caption" color="text.secondary">Firmante: {doc.firmanteNombre}</Typography>
                      </Box>
                    </Stack>
                    <Chip label={tipoLabel(doc.tipo_firma)} size="small" sx={{ background: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 600, fontSize: 11 }} />
                  </Stack>
                  <Divider />
                  <Stack spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between">
                      <Stack direction="row" gap={0.5} alignItems="center"><Schedule sx={{ fontSize: 14, color: 'text.secondary' }} /><Typography variant="caption" color="text.secondary">Solicitada</Typography></Stack>
                      <Typography variant="caption" fontWeight={600}>{fmtFecha(doc.created_at)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Stack direction="row" gap={0.5} alignItems="center"><Assignment sx={{ fontSize: 14, color: 'text.secondary' }} /><Typography variant="caption" color="text.secondary">Orden de firma</Typography></Stack>
                      <Typography variant="caption" fontWeight={600}>{doc.ordenTexto}</Typography>
                    </Stack>
                  </Stack>
                  <Button variant="contained" startIcon={<Draw />} fullWidth onClick={() => { setSelected(doc); setFirmaOpen(true) }}
                    sx={{ background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`, '&:hover': { background: `linear-gradient(135deg, #0c6478 0%, #0779a0 100%)` }, mt: 0.5 }}>
                    Firmar / Rechazar
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <FirmaDialog open={firmaOpen} firma={selected} onClose={() => setFirmaOpen(false)} onDone={() => { setSnackOpen(true); onRefetch() }} />
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackOpen(false)} severity="success" variant="filled">Firma registrada. El evento quedó en la auditoría.</Alert>
      </Snackbar>
    </>
  )
}

function TabFirmados({ firmas, loading, porDoc }: { firmas: FirmaVM[]; loading: boolean; porDoc: Map<number, FirmaVM[]> }) {
  const [certOpen, setCertOpen] = useState(false)
  const [selected, setSelected] = useState<FirmaVM | null>(null)
  const resueltas = firmas.filter((f) => f.estado === 'FIRMADO' || f.estado === 'RECHAZADO')

  if (loading) return <Box textAlign="center" py={5}><CircularProgress size={28} /></Box>
  if (resueltas.length === 0) return <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">Aún no hay firmas registradas.</Typography></Box>

  return (
    <>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: alpha(DMS_COLOR, 0.06) }}>
              {['Documento', 'Tipo Firma', 'Firmante', 'Fecha y Hora', 'IP', 'Estado', 'Acciones'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: DMS_COLOR, fontSize: 12, py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {resueltas.map((doc) => (
              <TableRow key={doc.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell><Stack direction="row" alignItems="center" gap={1}><PictureAsPdf sx={{ fontSize: 16, color: '#ef4444' }} /><Typography variant="caption" fontWeight={600}>{doc.docNombre}</Typography></Stack></TableCell>
                <TableCell><Chip label={tipoLabel(doc.tipo_firma)} size="small" sx={{ background: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 600, fontSize: 11 }} /></TableCell>
                <TableCell><Typography variant="caption">{doc.firmanteNombre}</Typography></TableCell>
                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fmtFechaHora(doc.fecha_firma)}</Typography></TableCell>
                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{doc.ip_firma || '—'}</Typography></TableCell>
                <TableCell>
                  <Chip label={estadoLabel(doc.estado)} size="small"
                    icon={doc.estado === 'FIRMADO' ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : <Cancel sx={{ fontSize: '14px !important' }} />}
                    color={doc.estado === 'FIRMADO' ? 'success' : 'error'} />
                </TableCell>
                <TableCell>
                  <Button size="small" startIcon={<Visibility sx={{ fontSize: 14 }} />} onClick={() => { setSelected(doc); setCertOpen(true) }} sx={{ fontSize: 11, color: DMS_COLOR }}>Ver certificado</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <CertificateDialog open={certOpen} firma={selected} hermanas={selected ? (porDoc.get(selected.documento_id) ?? [selected]) : []} onClose={() => setCertOpen(false)} />
    </>
  )
}

function TabPorDocumento({ porDoc, docNombreDe }: { porDoc: Map<number, FirmaVM[]>; docNombreDe: (id: number) => string }) {
  const [search, setSearch] = useState('')
  const grupos = Array.from(porDoc.entries()).map(([docId, fs]) => ({ docId, nombre: docNombreDe(docId), firmas: [...fs].sort((a, b) => a.orden - b.orden) }))
  const filtered = grupos.filter((g) => !search || g.nombre.toLowerCase().includes(search.toLowerCase()))
  const statusColor = (e: string) => e === 'FIRMADO' ? 'success' : e === 'RECHAZADO' ? 'error' : 'warning'

  return (
    <Stack spacing={3}>
      <TextField placeholder="Buscar por nombre de documento..." value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ maxWidth: 480 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> }} />

      {filtered.length === 0 && <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No hay documentos con solicitudes de firma.</Typography></Box>}

      {filtered.map((doc) => {
        const firmados = doc.firmas.filter((f) => f.estado === 'FIRMADO').length
        return (
          <Card key={doc.docId} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                <PictureAsPdf sx={{ color: '#ef4444' }} />
                <Box flex={1}><Typography variant="body1" fontWeight={700}>{doc.nombre}</Typography></Box>
                <Chip label={`${firmados} / ${doc.firmas.length} firmados`} size="small" sx={{ background: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 600 }} />
              </Stack>
              <LinearProgress variant="determinate" value={(firmados / doc.firmas.length) * 100} sx={{ mb: 2, height: 6, borderRadius: 3, background: '#e5e7eb', '& .MuiLinearProgress-bar': { background: DMS_COLOR } }} />
              <Stepper orientation="vertical" nonLinear>
                {doc.firmas.map((f) => (
                  <Step key={f.id} active completed={f.estado === 'FIRMADO'}>
                    <StepLabel icon={
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: f.estado === 'FIRMADO' ? '#10b981' : f.estado === 'RECHAZADO' ? '#ef4444' : alpha(DMS_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.estado === 'PENDIENTE' ? DMS_COLOR : '#fff', fontSize: 13, fontWeight: 700 }}>
                        {f.estado === 'FIRMADO' ? <CheckCircle sx={{ fontSize: 16 }} /> : f.estado === 'RECHAZADO' ? <Cancel sx={{ fontSize: 16 }} /> : f.orden}
                      </Box>
                    }>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600}>{f.firmanteNombre}</Typography>
                        <Typography variant="caption" color="text.secondary">{tipoLabel(f.tipo_firma)}</Typography>
                        <Chip label={estadoLabel(f.estado)} size="small" color={statusColor(f.estado) as 'success' | 'error' | 'warning'} />
                      </Stack>
                    </StepLabel>
                    <StepContent>
                      <TableContainer>
                        <Table size="small">
                          <TableHead><TableRow>{['Fecha Solicitud', 'Fecha Firma', 'IP'].map((h) => <TableCell key={h} sx={{ fontSize: 11, color: 'text.secondary', py: 0.5, pl: 0 }}>{h}</TableCell>)}</TableRow></TableHead>
                          <TableBody><TableRow>
                            <TableCell sx={{ fontSize: 12, py: 0.75, pl: 0 }}>{fmtFecha(f.created_at)}</TableCell>
                            <TableCell sx={{ fontSize: 12, py: 0.75 }}>{f.fecha_firma ? fmtFechaHora(f.fecha_firma) : '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, py: 0.75, fontFamily: 'monospace', color: 'text.secondary' }}>{f.ip_firma ?? '—'}</TableCell>
                          </TableRow></TableBody>
                        </Table>
                      </TableContainer>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DMSFirmas() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)
  const [solicitarOpen, setSolicitarOpen] = useState(false)

  const { data: firmasRaw = [], isLoading } = useQuery<FirmaApi[]>({
    queryKey: ['dms-firmas-all'],
    queryFn: () => apiClient.get('/dms/firmas').then((r) => r.data),
  })
  const { data: usuarios = [] } = useQuery<any[]>({ queryKey: ['usuarios-map'], queryFn: () => apiClient.get('/usuarios/').then((r) => r.data) })
  const { data: documentos = [] } = useQuery<any[]>({ queryKey: ['dms-docs-map'], queryFn: () => apiClient.get('/dms/documentos', { params: { per_page: 200 } }).then((r) => r.data) })

  const userMap = useMemo(() => { const m = new Map<number, string>(); usuarios.forEach((u) => m.set(u.id, `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.username || `Usuario #${u.id}`)); return m }, [usuarios])
  const docMap = useMemo(() => { const m = new Map<number, string>(); documentos.forEach((d) => m.set(d.id, d.nombre)); return m }, [documentos])
  const docNombreDe = (id: number) => docMap.get(id) || `Documento #${id}`

  // Totales por documento para "orden X de N"
  const totalPorDoc = useMemo(() => { const m = new Map<number, number>(); firmasRaw.forEach((f) => m.set(f.documento_id, (m.get(f.documento_id) ?? 0) + 1)); return m }, [firmasRaw])

  const firmas: FirmaVM[] = useMemo(() => firmasRaw.map((f) => ({
    ...f,
    docNombre: docNombreDe(f.documento_id),
    firmanteNombre: userMap.get(f.firmante_id) || `Usuario #${f.firmante_id}`,
    ordenTexto: `${f.orden || 1} de ${totalPorDoc.get(f.documento_id) ?? 1}`,
  })), [firmasRaw, docMap, userMap, totalPorDoc])

  const porDoc = useMemo(() => {
    const m = new Map<number, FirmaVM[]>()
    firmas.forEach((f) => { const arr = m.get(f.documento_id) ?? []; arr.push(f); m.set(f.documento_id, arr) })
    return m
  }, [firmas])

  const kpis = useMemo(() => {
    const pendientes = firmas.filter((f) => f.estado === 'PENDIENTE').length
    const firmadosHoy = firmas.filter((f) => f.estado === 'FIRMADO' && esHoy(f.fecha_firma)).length
    const rechazados = firmas.filter((f) => f.estado === 'RECHAZADO').length
    const firmantesActivos = new Set(firmas.filter((f) => f.estado === 'PENDIENTE').map((f) => f.firmante_id)).size
    return [
      { label: 'Pendientes de Firma', value: pendientes, icon: <Schedule />, color: '#f59e0b' },
      { label: 'Firmados Hoy', value: firmadosHoy, icon: <CheckCircle />, color: '#10b981' },
      { label: 'Rechazados', value: rechazados, icon: <Cancel />, color: '#ef4444' },
      { label: 'Firmantes Activos', value: firmantesActivos, icon: <Person />, color: DMS_COLOR },
    ]
  }, [firmas])

  const refetch = () => { qc.invalidateQueries({ queryKey: ['dms-firmas-all'] }); qc.invalidateQueries({ queryKey: ['dms-auditoria'] }) }

  return (
    <Layout title="Firma Electrónica y Digital">
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Page Header */}
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 3 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Fingerprint sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={700}>Firma Electrónica y Digital</Typography>
            <Typography variant="body2" color="text.secondary">Gestión centralizada de firmas de documentos — ICL Transporte</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setSolicitarOpen(true)} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' } }}>Solicitar Firma</Button>
        </Stack>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}><KpiCard {...kpi} /></Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
          <Box sx={{ borderBottom: '1px solid #e5e7eb' }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 2, '& .MuiTab-root': { fontWeight: 600, fontSize: 13, textTransform: 'none', minHeight: 48 }, '& .Mui-selected': { color: DMS_COLOR }, '& .MuiTabs-indicator': { background: DMS_COLOR } }}>
              <Tab label={<Stack direction="row" alignItems="center" gap={1}><Schedule sx={{ fontSize: 16 }} />Pendientes de Firma<Chip label={String(kpis[0].value)} size="small" sx={{ height: 18, fontSize: 10, background: alpha('#f59e0b', 0.15), color: '#b45309' }} /></Stack>} />
              <Tab label={<Stack direction="row" alignItems="center" gap={1}><Verified sx={{ fontSize: 16 }} />Firmados</Stack>} />
              <Tab label={<Stack direction="row" alignItems="center" gap={1}><Assignment sx={{ fontSize: 16 }} />Por Documento</Stack>} />
            </Tabs>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {activeTab === 0 && <TabPendientes firmas={firmas} loading={isLoading} onRefetch={refetch} />}
            {activeTab === 1 && <TabFirmados firmas={firmas} loading={isLoading} porDoc={porDoc} />}
            {activeTab === 2 && <TabPorDocumento porDoc={porDoc} docNombreDe={docNombreDe} />}
          </Box>
        </Card>
      </Box>

      <SolicitarDialog open={solicitarOpen} onClose={() => setSolicitarOpen(false)} onDone={refetch} documentos={documentos} usuarios={usuarios} />
    </Layout>
  )
}
