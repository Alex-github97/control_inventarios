import React, { useRef, useState } from 'react'
import {
  Box, Typography, Card, Button, Chip, LinearProgress, Alert, Grid, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Stack, Tooltip, Autocomplete, Tabs, Tab,
} from '@mui/material'
import {
  Upload, Download, CheckCircle, MergeType, InsertDriveFile, Close,
  DirectionsCar, Add as AddIcon, DeleteOutline, AutoFixHigh,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'

const TX_COLOR = '#369E4D'
const TX_DARK = '#1f6130'

interface PreviewTabla { columns: string[]; rows: Record<string, unknown>[]; total: number }
interface MergeResult {
  stats: {
    registros: number
    cruzados: number
    sin_coincidencia: number
    tasa_cruce: number
    tarifa_teorica_calculada?: number
    municipios_origen_cpk?: number
    vehiculos_mapeados?: number
  }
  preview?: { cruzados: PreviewTabla; calculo_por_cpk: PreviewTabla }
  filename: string
  file_base64: string
}

interface MapeoRow { interna: string; sicetac: string }

// Equivalencias tipicas del transporte de carga en Colombia (punto de partida
// editable). La izquierda es como suele nombrarlas la empresa; la derecha, el
// codigo SICETAC. El usuario las ajusta antes de guardar.
const EQUIVALENCIAS_SUGERIDAS: MapeoRow[] = [
  { interna: 'TURBO', sicetac: '2L3 Liviano entre 7.5 y 8 Tonel.' },
  { interna: 'SENCILLO', sicetac: '2' },
  { interna: 'CAMION', sicetac: '2' },
  { interna: 'DOBLETROQUE', sicetac: '3' },
  { interna: 'PATINETA', sicetac: '2S2' },
  { interna: 'TRACTOCAMION', sicetac: '3S2' },
  { interna: 'TRACTOMULA', sicetac: '3S3' },
  { interna: 'MULA', sicetac: '3S3' },
]

// ─── Configuración de mapeo de tipologías de vehículo (interna ↔ SICETAC) ─────
function ConfigVehiculos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<MapeoRow[]>([])
  const [tipos, setTipos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      apiClient.get<Record<string, string>>('/tarifax/mapeo-vehiculos'),
      apiClient.get<string[]>('/tarifax/tipos-sicetac'),
    ]).then(([m, t]) => {
      const dict = (m.data || {}) as Record<string, string>
      const entries = Object.entries(dict)
      setRows(entries.length ? entries.map(([interna, sicetac]) => ({ interna, sicetac: String(sicetac) })) : [{ interna: '', sicetac: '' }])
      setTipos(t.data || [])
    }).catch(() => toast.error('No se pudo cargar la configuración'))
      .finally(() => setLoading(false))
  }, [open])

  const setRow = (i: number, patch: Partial<MapeoRow>) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const addRow = () => setRows(rs => [...rs, { interna: '', sicetac: '' }])
  const delRow = (i: number) => setRows(rs => rs.filter((_, idx) => idx !== i))

  // Precarga las equivalencias tipicas sin pisar las que el usuario ya definio.
  const cargarSugeridas = () => {
    setRows(rs => {
      const base = rs.filter(r => r.interna.trim() || r.sicetac.trim())
      const existentes = new Set(base.map(r => r.interna.trim().toUpperCase()))
      const nuevas = EQUIVALENCIAS_SUGERIDAS.filter(s => !existentes.has(s.interna.toUpperCase()))
      const merged = [...base, ...nuevas]
      return merged.length ? merged : [{ interna: '', sicetac: '' }]
    })
    toast.success('Equivalencias sugeridas cargadas · revísalas y guarda')
  }

  const guardar = async () => {
    const mapeo: Record<string, string> = {}
    for (const r of rows) {
      const k = r.interna.trim(); const v = r.sicetac.trim()
      if (k && v) mapeo[k] = v
    }
    setSaving(true)
    try {
      const res = await apiClient.put('/tarifax/mapeo-vehiculos', { mapeo })
      toast.success(`Configuración guardada (${(res.data as any)?.categorias ?? Object.keys(mapeo).length} categorías)`)
      onClose()
    } catch {
      toast.error('No se pudo guardar')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <DirectionsCar sx={{ color: TX_COLOR }} /> Configuración de tipologías de vehículo
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Asocia la categoría con la que <b>tu empresa</b> nombra los vehículos (ej. TRACTOCAMIÓN, SENCILLO, TURBO)
          con la tipología equivalente en <b>SICETAC</b>. El cruce y el cálculo de CPK usarán esta equivalencia.
        </Alert>
        {loading ? <LinearProgress /> : (
          <Stack spacing={1.25}>
            <Stack direction="row" sx={{ px: 0.5 }}>
              <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Categoría interna</Typography>
              <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Tipología SICETAC</Typography>
              <Box sx={{ width: 36 }} />
            </Stack>
            {rows.map((r, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField size="small" placeholder="TRACTOCAMION" value={r.interna} onChange={e => setRow(i, { interna: e.target.value })} sx={{ flex: 1 }} />
                <Autocomplete
                  size="small" options={tipos} value={r.sicetac || null} freeSolo
                  onChange={(_, v) => setRow(i, { sicetac: v || '' })}
                  onInputChange={(_, v) => setRow(i, { sicetac: v })}
                  sx={{ flex: 1 }}
                  renderInput={(p) => <TextField {...p} placeholder="3S2" />}
                />
                <Tooltip title="Quitar"><IconButton size="small" onClick={() => delRow(i)} sx={{ color: '#DC2626' }}><DeleteOutline sx={{ fontSize: 18 }} /></IconButton></Tooltip>
              </Stack>
            ))}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button startIcon={<AddIcon />} onClick={addRow} sx={{ textTransform: 'none', color: TX_COLOR, fontWeight: 700 }}>Agregar categoría</Button>
              <Button startIcon={<AutoFixHigh />} onClick={cargarSugeridas} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 700 }}>Cargar equivalencias sugeridas</Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Cancelar</Button>
        <Button variant="contained" disabled={saving} onClick={guardar} sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, fontWeight: 700 }}>Guardar configuración</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function TarifaxMotor() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [mapeo, setMapeo] = useState<Record<string, string>>({})
  const [previewTab, setPreviewTab] = useState(0)

  const loadMapeo = React.useCallback(() => {
    apiClient.get<Record<string, string>>('/tarifax/mapeo-vehiculos')
      .then(r => setMapeo(r.data || {})).catch(() => {})
  }, [])
  React.useEffect(() => { loadMapeo() }, [loadMapeo])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await apiClient.get('/tarifax/template', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_cotizacion_tarifax.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo descargar la plantilla')
    }
  }

  const handleProcess = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post<MergeResult>('/tarifax/merge', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      setResult(res.data)
      toast.success('Cruce completado exitosamente')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al procesar el archivo')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadResult = () => {
    if (!result) return
    const bytes = atob(result.file_base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout title="Motor TarifaX">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${TX_COLOR} 0%, ${TX_DARK} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${alpha(TX_COLOR, 0.4)}`,
          }}
        >
          <MergeType sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>
            Motor de Cruce TarifaX
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>
            Cruza tu archivo Excel contra el tarifario interno SICETAC
          </Typography>
        </Box>
        <Button
          variant="outlined" startIcon={<DirectionsCar />} onClick={() => setConfigOpen(true)}
          sx={{ borderColor: alpha(TX_COLOR, 0.4), color: TX_COLOR, fontWeight: 700, textTransform: 'none', borderRadius: '10px', '&:hover': { borderColor: TX_COLOR, bgcolor: alpha(TX_COLOR, 0.06) } }}
        >
          Configurar vehículos
        </Button>
      </Box>

      <ConfigVehiculos open={configOpen} onClose={() => { setConfigOpen(false); loadMapeo() }} />

      {/* Resumen del mapeo de tipologías activo */}
      {Object.keys(mapeo).length === 0 ? (
        <Alert
          severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}
          action={<Button size="small" variant="contained" onClick={() => setConfigOpen(true)} sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, fontWeight: 700, whiteSpace: 'nowrap' }}>Configurar</Button>}
        >
          <strong>Sin equivalencias configuradas.</strong> Si tu archivo usa nombres internos (TRACTOCAMIÓN, SENCILLO…), configúralas para que crucen con SICETAC.
        </Alert>
      ) : (
        <Card sx={{ mb: 2.5, p: 2, border: `1px solid ${alpha(TX_COLOR, 0.2)}`, borderRadius: '12px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>
              <DirectionsCar sx={{ fontSize: 15, color: TX_COLOR, verticalAlign: 'middle', mr: 0.5 }} />
              Equivalencias activas ({Object.keys(mapeo).length})
            </Typography>
            <Button size="small" onClick={() => setConfigOpen(true)} sx={{ textTransform: 'none', color: TX_COLOR, fontWeight: 700 }}>Editar</Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {Object.entries(mapeo).map(([interna, sic]) => (
              <Chip key={interna} size="small" label={`${interna} → ${sic}`} sx={{ bgcolor: alpha(TX_COLOR, 0.08), color: TX_DARK, fontWeight: 600, fontSize: 11 }} />
            ))}
          </Box>
        </Card>
      )}

      {/* Steps */}
      <Box sx={{ display: 'flex', gap: 0, mb: 3, borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        {['Cargar archivo Excel', 'Cruce automático', 'Descargar resultado'].map((step, i) => (
          <Box key={step} sx={{
            flex: 1, px: 2, py: 1.25,
            bgcolor: i === 0 && !file ? TX_COLOR : i === 1 && processing ? TX_COLOR : i === 2 && result ? TX_COLOR : '#F8FAFC',
            borderRight: i < 2 ? '1px solid #E2E8F0' : 'none',
            display: 'flex', alignItems: 'center', gap: 1,
            transition: 'background 0.3s ease',
          }}>
            <Box sx={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              bgcolor: (i === 0 && !file) || (i === 1 && processing) || (i === 2 && result) ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: (i === 0 && !file) || (i === 1 && processing) || (i === 2 && result) ? '#fff' : '#94A3B8' }}>
                {i + 1}
              </Typography>
            </Box>
            <Typography sx={{
              fontSize: 12, fontWeight: 600,
              color: (i === 0 && !file) || (i === 1 && processing) || (i === 2 && result) ? '#fff' : '#64748B',
            }}>
              {step}
            </Typography>
          </Box>
        ))}
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* LEFT: Base interna */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2.5, height: '100%', border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12, color: TX_DARK, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Base Interna (DF1)
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B', mb: 2 }}>
              Datos maestros cargados desde el servidor
            </Typography>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
              bgcolor: alpha(TX_COLOR, 0.06), borderRadius: '10px',
              border: `1px solid ${alpha(TX_COLOR, 0.2)}`,
            }}>
              <InsertDriveFile sx={{ color: TX_COLOR, fontSize: 26 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>
                  TARIFARIO_SICETAC.xlsx
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                  Cargado automáticamente
                </Typography>
              </Box>
              <Chip
                label="Activo"
                size="small"
                icon={<CheckCircle sx={{ fontSize: '12px !important' }} />}
                sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 600, fontSize: 10, height: 22, '& .MuiChip-icon': { color: '#16A34A' } }}
              />
            </Box>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F8FAFC', borderRadius: '8px' }}>
              <Typography sx={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.8 }}>
                <strong style={{ color: '#475569' }}>Cruce por:</strong>{' '}
                <code style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>ORIGEN</code>{' '}
                <code style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>DESTINO</code>{' '}
                <code style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>TIPO_VEHICULO</code>{' '}
                <code style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>CARROCERIA</code>
                <br />
                <strong style={{ color: '#475569' }}>Precio SICETAC:</strong>{' '}
                <code style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>COSTO_TOTAL_VIAJE</code>
                <br />
                <strong style={{ color: '#475569' }}>Cruce:</strong>{' '}
                <code style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>por ruta + categoría de vehículo</code>
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* RIGHT: Upload DF2 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2.5, height: '100%', border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12, color: TX_DARK, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Tu Archivo (DF2)
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B', mb: 2 }}>
              Sube el Excel con los datos a cruzar
            </Typography>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleFileChange}
            />

            {!file ? (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: `2px dashed ${alpha(TX_COLOR, 0.4)}`,
                  borderRadius: '12px',
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: alpha(TX_COLOR, 0.03),
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: alpha(TX_COLOR, 0.07), borderColor: TX_COLOR },
                }}
              >
                <Upload sx={{ fontSize: 32, color: alpha(TX_COLOR, 0.5), mb: 1 }} />
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>
                  Clic para seleccionar archivo
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.5 }}>
                  Formato .xlsx o .xls · Debe incluir ORIGEN, DESTINO, TIPO_VEHICULO y CARROCERIA
                </Typography>
              </Box>
            ) : (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                bgcolor: alpha(TX_COLOR, 0.06), borderRadius: '10px',
                border: `1px solid ${alpha(TX_COLOR, 0.2)}`,
              }}>
                <InsertDriveFile sx={{ color: TX_COLOR, fontSize: 26 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                    {(file.size / 1024).toFixed(0)} KB
                  </Typography>
                </Box>
                <Button
                  size="small"
                  sx={{ minWidth: 0, p: 0.5, color: '#94A3B8', '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.06) } }}
                  onClick={() => {
                    setFile(null)
                    setResult(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <Close fontSize="small" />
                </Button>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                variant="text"
                size="small"
                startIcon={<Download sx={{ fontSize: 14 }} />}
                onClick={handleDownloadTemplate}
                sx={{
                  fontSize: 12, color: TX_COLOR, p: 0.5,
                  '&:hover': { bgcolor: alpha(TX_COLOR, 0.06) },
                  textTransform: 'none',
                }}
              >
                Descargar plantilla de cotización
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Process button */}
      <Box sx={{ mb: 3 }}>
        {processing && (
          <LinearProgress
            sx={{ mb: 1.5, borderRadius: 4, bgcolor: alpha(TX_COLOR, 0.1), '& .MuiLinearProgress-bar': { bgcolor: TX_COLOR } }}
          />
        )}
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={!file || processing}
          onClick={handleProcess}
          startIcon={<MergeType />}
          sx={{
            py: 1.5,
            fontSize: 14,
            fontWeight: 700,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})`,
            boxShadow: `0 4px 14px ${alpha(TX_COLOR, 0.35)}`,
            '&:hover': { boxShadow: `0 6px 20px ${alpha(TX_COLOR, 0.45)}`, background: `linear-gradient(135deg, ${TX_COLOR}, ${TX_DARK})` },
            '&:disabled': { background: '#E2E8F0', boxShadow: 'none', color: '#94A3B8' },
          }}
        >
          {processing ? 'Procesando cruce...' : 'Procesar Cruce de Tarifas'}
        </Button>
      </Box>

      {/* Results */}
      {result && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              { label: 'Registros resultado', value: result.stats.registros.toLocaleString() },
              { label: 'Cruzados correctamente', value: result.stats.cruzados.toLocaleString() },
              { label: 'Sin coincidencia (hoja CPK)', value: result.stats.sin_coincidencia.toLocaleString() },
              { label: 'Tasa de cruce', value: `${result.stats.tasa_cruce}%` },
              { label: 'Vehículos mapeados', value: (result.stats.vehiculos_mapeados ?? 0).toLocaleString() },
              { label: 'Tarifa teórica calculada', value: (result.stats.tarifa_teorica_calculada ?? 0).toLocaleString() },
            ].map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Card sx={{
                  p: 2,
                  border: `1px solid ${alpha(TX_COLOR, 0.2)}`,
                  borderLeft: `4px solid ${TX_COLOR}`,
                  borderRadius: '12px',
                }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                    {stat.label}
                  </Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: TX_DARK, fontFamily: '"Inter", sans-serif', lineHeight: 1 }}>
                    {stat.value}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Alert
            severity="success"
            action={
              <Button
                variant="contained"
                size="small"
                startIcon={<Download />}
                onClick={handleDownloadResult}
                sx={{
                  bgcolor: TX_COLOR,
                  '&:hover': { bgcolor: TX_DARK },
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  borderRadius: '8px',
                }}
              >
                Descargar resultado
              </Button>
            }
            sx={{ borderRadius: '12px', '& .MuiAlert-icon': { color: TX_COLOR }, alignItems: 'center' }}
          >
            <strong>Cruce completado.</strong> Archivo: <code style={{ fontSize: 11 }}>{result.filename}</code>
          </Alert>

          {/* Vista previa de resultados (sin descargar) */}
          {result.preview && (() => {
            const tabla = previewTab === 0 ? result.preview!.cruzados : result.preview!.calculo_por_cpk
            return (
              <Card sx={{ mt: 2.5, border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <Tabs
                  value={previewTab} onChange={(_, v) => setPreviewTab(v)}
                  sx={{ borderBottom: '1px solid #E5E7EB', px: 1, '& .Mui-selected': { color: TX_COLOR }, '& .MuiTabs-indicator': { bgcolor: TX_COLOR } }}
                >
                  <Tab sx={{ textTransform: 'none', fontWeight: 700 }} label={`Cruzados (${result.preview!.cruzados.total})`} />
                  <Tab sx={{ textTransform: 'none', fontWeight: 700 }} label={`Cálculo por CPK (${result.preview!.calculo_por_cpk.total})`} />
                </Tabs>
                {tabla.total === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}><Typography sx={{ fontSize: 13, color: '#64748B' }}>Sin filas en esta hoja.</Typography></Box>
                ) : (
                  <>
                    <Box sx={{ overflowX: 'auto', maxHeight: 380 }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {tabla.columns.map(c => (
                              <th key={c} style={{ position: 'sticky', top: 0, background: '#F8FAFC', textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E7EB' }}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tabla.rows.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              {tabla.columns.map(c => {
                                const val = row[c]
                                const num = typeof val === 'number'
                                return (
                                  <td key={c} style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: '#1E293B', textAlign: num ? 'right' as const : 'left' as const, fontVariantNumeric: 'tabular-nums' }}>
                                    {val === null || val === undefined ? '—' : num ? (val as number).toLocaleString('es-CO') : String(val)}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                    <Box sx={{ px: 2, py: 1, bgcolor: '#F8FAFC', borderTop: '1px solid #E5E7EB' }}>
                      <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                        Mostrando {tabla.rows.length} de {tabla.total.toLocaleString('es-CO')} filas · descarga el Excel para el detalle completo.
                      </Typography>
                    </Box>
                  </>
                )}
              </Card>
            )
          })()}
        </Box>
      )}
    </Layout>
  )
}
