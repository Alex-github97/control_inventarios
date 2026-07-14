import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, alpha, Tab, Tabs,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ReportProblem as RiesgoIcon, Close as CloseIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ML_COLOR = '#0D9488'

interface Activo { id: number; tag: string; nombre: string }

interface Riesgo {
  id: number
  codigo: string
  descripcion: string
  categoria: string | null
  probabilidad: number | null
  impacto_personas: number | null
  impacto_operacional: number | null
  impacto_financiero: number | null
  impacto_ambiental: number | null
  nivel_inherente: number | null
  aceptabilidad: string | null
  estado_riesgo: string
  activo_id: number | null
  activo_nombre: string | null
}

const CATEGORIAS = ['SEGURIDAD', 'OPERACIONAL', 'FINANCIERO', 'AMBIENTAL', 'LEGAL', 'REPUTACIONAL']
const ESTADOS = ['IDENTIFICADO', 'EN_TRATAMIENTO', 'CONTROLADO', 'CERRADO']

const ACEPT_COLOR: Record<string, string> = {
  INACEPTABLE: '#DC2626',
  TOLERABLE: '#D97706',
  ACEPTABLE: '#16A34A',
}

const ACEPTABILIDAD_LABEL: Record<string, string> = {
  INACEPTABLE: 'Inaceptable',
  TOLERABLE: 'Tolerable',
  ACEPTABLE: 'Aceptable',
}

const CELL_COLOR = (val: number): string => {
  if (val >= 15) return '#DC2626'
  if (val >= 6) return '#D97706'
  return '#16A34A'
}

const EMPTY = {
  descripcion: '', categoria: 'OPERACIONAL', estado_riesgo: 'IDENTIFICADO',
  probabilidad: '3', impacto_personas: '3', impacto_operacional: '3',
  impacto_financiero: '3', impacto_ambiental: '3', activo_id: '',
}

const SCALE = [1, 2, 3, 4, 5]

export default function LocativaRiesgos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Riesgo | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY })

  const TAB_ACEPT = [null, 'INACEPTABLE', 'TOLERABLE', 'ACEPTABLE']

  const { data: riesgos = [], isLoading } = useQuery<Riesgo[]>({
    queryKey: ['locativa-riesgos'],
    queryFn: () => api.get('/locativa/riesgos/').then(r => r.data),
  })

  const { data: activos = [] } = useQuery<Activo[]>({
    queryKey: ['locativa-activos'],
    queryFn: () => api.get('/locativa/activos/').then(r => r.data),
  })

  const crear = useMutation({
    mutationFn: (data: any) => api.post('/locativa/riesgos/', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-riesgos'] }); handleClose(); toast.success('Riesgo registrado') },
    onError: () => toast.error('Error al registrar riesgo'),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/locativa/riesgos/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-riesgos'] }); handleClose(); toast.success('Riesgo actualizado') },
    onError: () => toast.error('Error al actualizar riesgo'),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/locativa/riesgos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-riesgos'] }); toast.success('Riesgo eliminado') },
    onError: () => toast.error('Error al eliminar riesgo'),
  })

  const handleOpen = (r?: Riesgo) => {
    setEditing(r ?? null)
    setForm(r ? {
      descripcion: r.descripcion, categoria: r.categoria ?? 'OPERACIONAL',
      estado_riesgo: r.estado_riesgo,
      probabilidad: String(r.probabilidad ?? 3),
      impacto_personas: String(r.impacto_personas ?? 3),
      impacto_operacional: String(r.impacto_operacional ?? 3),
      impacto_financiero: String(r.impacto_financiero ?? 3),
      impacto_ambiental: String(r.impacto_ambiental ?? 3),
      activo_id: String(r.activo_id ?? ''),
    } : { ...EMPTY })
    setOpen(true)
  }

  const handleClose = () => { setOpen(false); setEditing(null) }

  const handleSave = () => {
    const payload: any = {
      descripcion: form.descripcion,
      categoria: form.categoria,
      estado_riesgo: form.estado_riesgo,
      probabilidad: Number(form.probabilidad),
      impacto_personas: Number(form.impacto_personas),
      impacto_operacional: Number(form.impacto_operacional),
      impacto_financiero: Number(form.impacto_financiero),
      impacto_ambiental: Number(form.impacto_ambiental),
      activo_id: form.activo_id ? Number(form.activo_id) : null,
    }
    if (editing) actualizar.mutate({ id: editing.id, data: payload })
    else crear.mutate(payload)
  }

  const filtered = riesgos.filter(r => {
    const acept = TAB_ACEPT[tab]
    if (acept && r.aceptabilidad !== acept) return false
    return true
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  // Precompute matrix values for the heatmap
  const matrixCount: Record<string, number> = {}
  riesgos.forEach(r => {
    if (r.probabilidad && r.nivel_inherente) {
      const impMax = Math.max(
        r.impacto_personas ?? 0, r.impacto_operacional ?? 0,
        r.impacto_financiero ?? 0, r.impacto_ambiental ?? 0,
      )
      const key = `${r.probabilidad}-${impMax}`
      matrixCount[key] = (matrixCount[key] ?? 0) + 1
    }
  })

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Registro de Riesgos</Typography>
            <Typography variant="body2" color="text.secondary">ISO 31000 — Matriz 5×5</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Nuevo riesgo
          </Button>
        </Stack>

        {/* Heatmap 5×5 */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, mb: 3 }}>
          <Typography fontWeight={700} fontSize={14} mb={1.5}>Mapa de calor — Impacto × Probabilidad</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
            {/* Y-axis label */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 70, flexShrink: 0 }} />
              {SCALE.map(imp => (
                <Box key={imp} sx={{ width: 60, textAlign: 'center' }}>
                  <Typography fontSize={11} color="text.secondary" fontWeight={600}>Imp {imp}</Typography>
                </Box>
              ))}
            </Stack>
            {[5, 4, 3, 2, 1].map(prob => (
              <Stack key={prob} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 70, flexShrink: 0 }}>
                  <Typography fontSize={11} color="text.secondary" fontWeight={600}>Prob {prob}</Typography>
                </Box>
                {SCALE.map(imp => {
                  const val = prob * imp
                  const bg = CELL_COLOR(val)
                  const count = matrixCount[`${prob}-${imp}`] ?? 0
                  return (
                    <Tooltip key={imp} title={`Nivel ${val}: ${count} riesgo(s)`}>
                      <Box sx={{
                        width: 60, height: 44, borderRadius: '8px',
                        bgcolor: alpha(bg, 0.15), border: `1px solid ${alpha(bg, 0.35)}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'default',
                      }}>
                        <Typography fontSize={13} fontWeight={700} color={bg}>{val}</Typography>
                        {count > 0 && <Typography fontSize={10} color={bg} fontWeight={600}>×{count}</Typography>}
                      </Box>
                    </Tooltip>
                  )
                })}
              </Stack>
            ))}
          </Box>
        </Paper>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: ML_COLOR }, '& .MuiTabs-indicator': { bgcolor: ML_COLOR } }}>
          <Tab label={`Todos (${riesgos.length})`} />
          <Tab label={`Inaceptables (${riesgos.filter(r => r.aceptabilidad === 'INACEPTABLE').length})`} />
          <Tab label={`Tolerables (${riesgos.filter(r => r.aceptabilidad === 'TOLERABLE').length})`} />
          <Tab label={`Aceptables (${riesgos.filter(r => r.aceptabilidad === 'ACEPTABLE').length})`} />
        </Tabs>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: ML_COLOR }} /></Box>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(r => {
              const color = ACEPT_COLOR[r.aceptabilidad ?? ''] ?? '#6B7280'
              return (
                <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper elevation={0} sx={{ border: `1px solid ${alpha(color, 0.25)}`, borderRadius: '14px', p: 2.5, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={700} fontSize={14}>{r.descripcion}</Typography>
                        <Typography fontSize={11} color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.codigo}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpen(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => { if (window.confirm('¿Eliminar riesgo?')) eliminar.mutate(r.id) }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" gap={0.5}>
                      {r.aceptabilidad && (
                        <Chip label={ACEPTABILIDAD_LABEL[r.aceptabilidad]} size="small" sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 700, fontSize: 11 }} />
                      )}
                      {r.categoria && <Chip label={r.categoria} size="small" variant="outlined" sx={{ fontSize: 11 }} />}
                    </Stack>

                    <Grid container spacing={1} mb={1}>
                      <Grid size={{ xs: 6 }}>
                        <Typography fontSize={12} color="text.secondary">Probabilidad</Typography>
                        <Typography fontWeight={700} color={color}>{r.probabilidad ?? '—'}/5</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography fontSize={12} color="text.secondary">Nivel inherente</Typography>
                        <Typography fontWeight={700} color={color}>{r.nivel_inherente ?? '—'}/25</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography fontSize={12} color="text.secondary">Imp. personas</Typography>
                        <Typography fontWeight={600} fontSize={13}>{r.impacto_personas ?? '—'}/5</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography fontSize={12} color="text.secondary">Imp. operacional</Typography>
                        <Typography fontWeight={600} fontSize={13}>{r.impacto_operacional ?? '—'}/5</Typography>
                      </Grid>
                    </Grid>

                    {r.activo_nombre && <Typography fontSize={12} color="text.secondary">⚙️ {r.activo_nombre}</Typography>}
                  </Paper>
                </Grid>
              )
            })}
            {filtered.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Box textAlign="center" py={8} color="text.secondary">
                  <RiesgoIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                  <Typography>No hay riesgos en este nivel</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {/* Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editing ? `Editar riesgo — ${editing.codigo}` : 'Nuevo riesgo'}
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Descripción del riesgo *" value={form.descripcion} onChange={f('descripcion')} multiline rows={2} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Categoría" value={form.categoria} onChange={f('categoria')}>
                  {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Estado" value={form.estado_riesgo} onChange={f('estado_riesgo')}>
                  {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Activo" value={form.activo_id} onChange={f('activo_id')}>
                  <MenuItem value="">Sin activo</MenuItem>
                  {activos.map((a: Activo) => <MenuItem key={a.id} value={a.id}>{a.tag} — {a.nombre}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                  ISO 31000 — Valoración del riesgo (1=mínimo, 5=máximo)
                </Typography>
              </Grid>
              {[
                { k: 'probabilidad', label: 'Probabilidad' },
                { k: 'impacto_personas', label: 'Impacto personas' },
                { k: 'impacto_operacional', label: 'Impacto operacional' },
                { k: 'impacto_financiero', label: 'Impacto financiero' },
                { k: 'impacto_ambiental', label: 'Impacto ambiental' },
              ].map(({ k, label }) => (
                <Grid key={k} size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth size="small" select label={label} value={(form as any)[k]} onChange={f(k)}>
                    {SCALE.map(v => <MenuItem key={v} value={String(v)}>{v}</MenuItem>)}
                  </TextField>
                </Grid>
              ))}

              {/* Preview */}
              {form.probabilidad && form.impacto_personas && (
                <Grid size={{ xs: 12 }}>
                  {(() => {
                    const maxImp = Math.max(Number(form.impacto_personas), Number(form.impacto_operacional), Number(form.impacto_financiero), Number(form.impacto_ambiental))
                    const nivel = Number(form.probabilidad) * maxImp
                    const acept = nivel >= 15 ? 'INACEPTABLE' : nivel >= 6 ? 'TOLERABLE' : 'ACEPTABLE'
                    const color = ACEPT_COLOR[acept]
                    return (
                      <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.25)}` }}>
                        <Typography fontSize={13} fontWeight={700} color={color}>
                          Nivel inherente calculado: {nivel}/25 — {ACEPTABILIDAD_LABEL[acept]}
                        </Typography>
                      </Box>
                    )
                  })()}
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!form.descripcion || crear.isPending || actualizar.isPending}
              sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {crear.isPending || actualizar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
