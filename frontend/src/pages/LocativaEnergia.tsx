import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, alpha, Tab, Tabs,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, Edit as EditIcon,
  Bolt as EnergiaIcon, Warning as AlertaIcon, Close as CloseIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ML_COLOR = '#0D9488'
const ENERGIA_COLOR = '#7C3AED'

interface Sede { id: number; nombre: string }

interface Medidor {
  id: number
  codigo: string
  descripcion: string | null
  tipo_energia: string
  unidad: string
  linea_base_mensual: number | null
  sede_id: number | null
  sede_nombre: string | null
  activo: boolean
}

interface LecturaEnergia {
  id: number
  medidor_id: number
  medidor_codigo: string | null
  fecha_lectura: string
  lectura: number
  consumo_periodo: number | null
  anomalo: boolean
  observaciones: string | null
}

const TIPOS_ENERGIA = ['ELECTRICA', 'GAS', 'AGUA', 'COMBUSTIBLE', 'VAPOR', 'AIRE_COMPRIMIDO']
const UNIDADES: Record<string, string> = {
  ELECTRICA: 'kWh', GAS: 'm³', AGUA: 'm³', COMBUSTIBLE: 'L', VAPOR: 'kg', AIRE_COMPRIMIDO: 'm³',
}

const EMPTY_MEDIDOR = {
  codigo: '', descripcion: '', tipo_energia: 'ELECTRICA', linea_base_mensual: '', sede_id: '',
}

const EMPTY_LECTURA = {
  medidor_id: '', fecha_lectura: '', lectura: '', observaciones: '',
}

export default function LocativaEnergia() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [openMedidor, setOpenMedidor] = useState(false)
  const [openLectura, setOpenLectura] = useState(false)
  const [editingMedidor, setEditingMedidor] = useState<Medidor | null>(null)
  const [formM, setFormM] = useState<typeof EMPTY_MEDIDOR>({ ...EMPTY_MEDIDOR })
  const [formL, setFormL] = useState<typeof EMPTY_LECTURA>({ ...EMPTY_LECTURA })

  const { data: medidores = [], isLoading: loadingMedidores } = useQuery<Medidor[]>({
    queryKey: ['locativa-medidores'],
    queryFn: () => api.get('/locativa/medidores/').then(r => r.data),
  })

  const { data: lecturas = [], isLoading: loadingLecturas } = useQuery<LecturaEnergia[]>({
    queryKey: ['locativa-lecturas'],
    queryFn: () => api.get('/locativa/lecturas/').then(r => r.data),
  })

  const { data: sedes = [] } = useQuery<Sede[]>({
    queryKey: ['locativa-sedes'],
    queryFn: () => api.get('/locativa/sedes/').then(r => r.data),
  })

  const crearMedidor = useMutation({
    mutationFn: (data: any) => api.post('/locativa/medidores/', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-medidores'] }); setOpenMedidor(false); toast.success('Medidor creado') },
    onError: () => toast.error('Error al crear medidor'),
  })

  const actualizarMedidor = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/locativa/medidores/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-medidores'] }); setOpenMedidor(false); toast.success('Medidor actualizado') },
    onError: () => toast.error('Error al actualizar medidor'),
  })

  const crearLectura = useMutation({
    mutationFn: (data: any) => api.post('/locativa/lecturas/', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-lecturas'] }); setOpenLectura(false); toast.success('Lectura registrada') },
    onError: () => toast.error('Error al registrar lectura'),
  })

  const handleOpenMedidor = (m?: Medidor) => {
    setEditingMedidor(m ?? null)
    setFormM(m ? {
      codigo: m.codigo, descripcion: m.descripcion ?? '', tipo_energia: m.tipo_energia,
      linea_base_mensual: String(m.linea_base_mensual ?? ''), sede_id: String(m.sede_id ?? ''),
    } : { ...EMPTY_MEDIDOR })
    setOpenMedidor(true)
  }

  const handleSaveMedidor = () => {
    const payload: any = {
      ...formM,
      linea_base_mensual: formM.linea_base_mensual ? Number(formM.linea_base_mensual) : null,
      sede_id: formM.sede_id ? Number(formM.sede_id) : null,
    }
    if (editingMedidor) actualizarMedidor.mutate({ id: editingMedidor.id, data: payload })
    else crearMedidor.mutate(payload)
  }

  const handleSaveLectura = () => {
    const payload: any = {
      medidor_id: Number(formL.medidor_id),
      fecha_lectura: formL.fecha_lectura,
      lectura: Number(formL.lectura),
      observaciones: formL.observaciones || null,
    }
    crearLectura.mutate(payload)
  }

  const fM = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormM(prev => ({ ...prev, [k]: e.target.value }))
  const fL = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormL(prev => ({ ...prev, [k]: e.target.value }))

  const anomalas = lecturas.filter(l => l.anomalo)
  const totalConsumo = lecturas.reduce((s, l) => s + (l.consumo_periodo ?? 0), 0)

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Gestión de Energía</Typography>
            <Typography variant="body2" color="text.secondary">ISO 50001 — Seguimiento y anomalías</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenMedidor()}
              sx={{ borderColor: ENERGIA_COLOR, color: ENERGIA_COLOR, '&:hover': { borderColor: '#6D28D9', bgcolor: alpha(ENERGIA_COLOR, 0.05) }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
            >
              Nuevo medidor
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setFormL({ ...EMPTY_LECTURA }); setOpenLectura(true) }}
              sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
            >
              Registrar lectura
            </Button>
          </Stack>
        </Stack>

        {/* Summary cards */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
              <Typography fontSize={28} fontWeight={800} color={ENERGIA_COLOR}>{medidores.length}</Typography>
              <Typography fontSize={12} color="text.secondary">Medidores activos</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
              <Typography fontSize={28} fontWeight={800} color={ML_COLOR}>{lecturas.length}</Typography>
              <Typography fontSize={12} color="text.secondary">Total lecturas</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid #FEE2E2', borderRadius: '14px', p: 2.5 }}>
              <Typography fontSize={28} fontWeight={800} color="#DC2626">{anomalas.length}</Typography>
              <Typography fontSize={12} color="text.secondary">Lecturas anómalas</Typography>
              <Typography fontSize={11} color="text.secondary">&gt;150% línea base</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
              <Typography fontSize={28} fontWeight={800} color={ENERGIA_COLOR}>{totalConsumo.toFixed(0)}</Typography>
              <Typography fontSize={12} color="text.secondary">Consumo total registrado</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: ML_COLOR }, '& .MuiTabs-indicator': { bgcolor: ML_COLOR } }}>
          <Tab label={`Medidores (${medidores.length})`} />
          <Tab label={`Lecturas (${lecturas.length})`} />
          <Tab label={`Anomalías (${anomalas.length})`} />
        </Tabs>

        {tab === 0 && (
          loadingMedidores ? (
            <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: ML_COLOR }} /></Box>
          ) : (
            <Grid container spacing={2}>
              {medidores.map(m => (
                <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box>
                        <Typography fontWeight={700} fontSize={14}>{m.codigo}</Typography>
                        {m.descripcion && <Typography fontSize={12} color="text.secondary">{m.descripcion}</Typography>}
                      </Box>
                      <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenMedidor(m)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                    <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" gap={0.5}>
                      <Chip label={m.tipo_energia} size="small" sx={{ bgcolor: alpha(ENERGIA_COLOR, 0.1), color: ENERGIA_COLOR, fontWeight: 600, fontSize: 11 }} />
                      <Chip label={UNIDADES[m.tipo_energia] ?? m.unidad} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                    </Stack>
                    {m.sede_nombre && <Typography fontSize={12} color="text.secondary">📍 {m.sede_nombre}</Typography>}
                    {m.linea_base_mensual != null && (
                      <Typography fontSize={12} color="text.secondary">Línea base: {m.linea_base_mensual} {UNIDADES[m.tipo_energia] ?? m.unidad}/mes</Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
              {medidores.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Box textAlign="center" py={8} color="text.secondary">
                    <EnergiaIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                    <Typography>No hay medidores registrados</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )
        )}

        {tab === 1 && (
          loadingLecturas ? (
            <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: ML_COLOR }} /></Box>
          ) : (
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      {['Medidor', 'Fecha', 'Lectura', 'Consumo período', 'Anómalo', 'Observaciones'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lecturas.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: l.anomalo ? '#FFF7F7' : undefined }}>
                        <td style={{ padding: '10px 16px', fontSize: 13 }}>{l.medidor_codigo ?? l.medidor_id}</td>
                        <td style={{ padding: '10px 16px', fontSize: 13 }}>{l.fecha_lectura}</td>
                        <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{l.lectura}</td>
                        <td style={{ padding: '10px 16px', fontSize: 13 }}>{l.consumo_periodo?.toFixed(2) ?? '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {l.anomalo ? <Chip label="ANÓMALO" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: 11 }} /> : <Chip label="Normal" size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontSize: 11 }} />}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#6B7280' }}>{l.observaciones ?? '—'}</td>
                      </tr>
                    ))}
                    {lecturas.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>No hay lecturas registradas</td></tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )
        )}

        {tab === 2 && (
          <Grid container spacing={2}>
            {anomalas.map(l => (
              <Grid key={l.id} size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ border: '1px solid #FEE2E2', borderRadius: '14px', p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <AlertaIcon sx={{ fontSize: 18, color: '#DC2626' }} />
                    <Typography fontWeight={700} fontSize={14} color="#DC2626">Consumo anómalo detectado</Typography>
                  </Stack>
                  <Typography fontSize={13}>Medidor: <strong>{l.medidor_codigo ?? l.medidor_id}</strong></Typography>
                  <Typography fontSize={13}>Fecha: <strong>{l.fecha_lectura}</strong></Typography>
                  <Typography fontSize={13}>Consumo período: <strong>{l.consumo_periodo?.toFixed(2) ?? '—'}</strong></Typography>
                  {l.observaciones && <Typography fontSize={12} color="text.secondary" mt={0.5}>{l.observaciones}</Typography>}
                </Paper>
              </Grid>
            ))}
            {anomalas.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Box textAlign="center" py={8} color="text.secondary">
                  <EnergiaIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                  <Typography>Sin anomalías detectadas</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {/* Dialog medidor */}
        <Dialog open={openMedidor} onClose={() => setOpenMedidor(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingMedidor ? 'Editar medidor' : 'Nuevo medidor'}
            <IconButton onClick={() => setOpenMedidor(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Código *" value={formM.codigo} onChange={fM('codigo')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Tipo de energía" value={formM.tipo_energia} onChange={fM('tipo_energia')}>
                  {TIPOS_ENERGIA.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Descripción" value={formM.descripcion} onChange={fM('descripcion')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" type="number" label="Línea base mensual" value={formM.linea_base_mensual} onChange={fM('linea_base_mensual')} helperText={`${UNIDADES[formM.tipo_energia] ?? ''}/mes`} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Sede" value={formM.sede_id} onChange={fM('sede_id')}>
                  <MenuItem value="">Sin sede</MenuItem>
                  {sedes.map((s: Sede) => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpenMedidor(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveMedidor} disabled={!formM.codigo || crearMedidor.isPending} sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
              {crearMedidor.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog lectura */}
        <Dialog open={openLectura} onClose={() => setOpenLectura(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Registrar lectura
            <IconButton onClick={() => setOpenLectura(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Medidor *" value={formL.medidor_id} onChange={fL('medidor_id')}>
                  {medidores.map((m: Medidor) => <MenuItem key={m.id} value={m.id}>{m.codigo} — {m.tipo_energia}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" type="date" label="Fecha lectura *" value={formL.fecha_lectura} onChange={fL('fecha_lectura')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" type="number" label="Lectura *" value={formL.lectura} onChange={fL('lectura')} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Observaciones" value={formL.observaciones} onChange={fL('observaciones')} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpenLectura(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveLectura} disabled={!formL.medidor_id || !formL.lectura || !formL.fecha_lectura || crearLectura.isPending} sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
              {crearLectura.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
