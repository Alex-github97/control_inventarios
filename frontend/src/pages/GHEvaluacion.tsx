import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Grid, Tooltip,
  CircularProgress, alpha, Chip, Avatar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Slider, Autocomplete, ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GH_COLOR = '#BE185D'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Colaborador { id: number; nombre: string }

interface EvalDetalle {
  id?: number
  criterio: string
  competencia: string
  calificacion: number
  peso: number
  observacion: string
}

interface Evaluacion {
  id: number
  colaborador_id: number
  colaborador_nombre: string
  evaluador_id: number | null
  evaluador_nombre: string | null
  periodo: string
  tipo_evaluacion: string  // '90' | '180' | '360'
  fecha: string
  notas?: string
  calificacion_total?: number
  estado: string  // PENDIENTE | EN_PROCESO | COMPLETADO
  detalles?: EvalDetalle[]
}

interface CriteriaRow extends EvalDetalle { _key: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tipoChipSx = (tipo: string) => {
  if (tipo === '90') return { bgcolor: '#DBEAFE', color: '#1E40AF' }
  if (tipo === '180') return { bgcolor: '#EDE9FE', color: '#7C3AED' }
  return { bgcolor: alpha(GH_COLOR, 0.1), color: GH_COLOR }
}

const estadoChipSx = (estado: string) => {
  if (estado === 'COMPLETADO') return { bgcolor: '#DCFCE7', color: '#16A34A' }
  if (estado === 'EN_PROCESO') return { bgcolor: '#DBEAFE', color: '#1E40AF' }
  return { bgcolor: '#F3F4F6', color: '#6B7280' }
}

const calBadgeSx = (cal: number) => {
  if (cal >= 9) return { bgcolor: '#DCFCE7', color: '#16A34A' }
  if (cal >= 7) return { bgcolor: '#FEF9C3', color: '#B45309' }
  if (cal >= 5) return { bgcolor: '#FEF3C7', color: '#D97706' }
  return { bgcolor: '#FEE2E2', color: '#DC2626' }
}

const computeAvg = (rows: CriteriaRow[]) => {
  const totalPeso = rows.reduce((s, r) => s + r.peso, 0)
  if (totalPeso === 0) return 0
  return rows.reduce((s, r) => s + r.calificacion * r.peso, 0) / totalPeso
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GHEvaluacion() {
  // Tab
  const [tab, setTab] = useState(0)

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  // Expand / Edit
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
  const [editingEval, setEditingEval] = useState<Evaluacion | null>(null)
  const [createdEvalId, setCreatedEvalId] = useState<number | null>(null)

  // Form fields (tab 1)
  const [formColabId, setFormColabId] = useState<Colaborador | null>(null)
  const [formEvalId, setFormEvalId] = useState<Colaborador | null>(null)
  const [formPeriodo, setFormPeriodo] = useState('')
  const [formTipo, setFormTipo] = useState('90')
  const [formFecha, setFormFecha] = useState('')
  const [formNotas, setFormNotas] = useState('')

  // Criteria rows
  const [criteriaRows, setCriteriaRows] = useState<CriteriaRow[]>([])
  const [nextKey, setNextKey] = useState(0)

  // ─── React Query ────────────────────────────────────────────────────────────

  const qc = useQueryClient()

  const { data: evaluaciones = [], isLoading } = useQuery<Evaluacion[]>({
    queryKey: ['gh-evaluaciones'],
    queryFn: () => api.get('/hcm/evaluaciones').then(r => r.data),
  })

  const { data: colaboradores = [] } = useQuery<Colaborador[]>({
    queryKey: ['gh-colaboradores'],
    queryFn: () => api.get('/hcm/colaboradores').then(r => r.data),
  })

  const createEval = useMutation({
    mutationFn: (d: object) => api.post('/hcm/evaluaciones', d).then(r => r.data),
    onSuccess: (data: Evaluacion) => {
      toast.success('Evaluación creada')
      setCreatedEvalId(data.id)
      qc.invalidateQueries({ queryKey: ['gh-evaluaciones'] })
    },
    onError: () => toast.error('Error al crear evaluación'),
  })

  const updateEval = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) =>
      api.put(`/hcm/evaluaciones/${id}`, d).then(r => r.data),
    onSuccess: () => {
      toast.success('Evaluación actualizada')
      qc.invalidateQueries({ queryKey: ['gh-evaluaciones'] })
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const saveDetalles = useMutation({
    mutationFn: ({ id, detalles }: { id: number; detalles: EvalDetalle[] }) =>
      api.post(`/hcm/evaluaciones/${id}/detalles`, { detalles }).then(r => r.data),
    onSuccess: () => {
      toast.success('Criterios guardados')
      qc.invalidateQueries({ queryKey: ['gh-evaluaciones'] })
    },
    onError: () => toast.error('Error al guardar criterios'),
  })

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCreateEval = () => {
    if (!formColabId) { toast.error('Selecciona un colaborador'); return }
    if (!formPeriodo) { toast.error('Ingresa el período'); return }
    if (!formFecha) { toast.error('Ingresa la fecha'); return }
    const payload: Record<string, unknown> = {
      colaborador_id: formColabId.id,
      periodo: formPeriodo,
      tipo_evaluacion: formTipo,
      fecha: formFecha,
    }
    if (formEvalId) payload.evaluador_id = formEvalId.id
    if (formNotas) payload.notas = formNotas
    if (editingEval) {
      updateEval.mutate({ id: editingEval.id, d: payload })
    } else {
      createEval.mutate(payload)
    }
  }

  const addRow = () => {
    setCriteriaRows(rows => [
      ...rows,
      { _key: nextKey, criterio: '', competencia: '', calificacion: 5, peso: 1, observacion: '' },
    ])
    setNextKey(k => k + 1)
  }

  const removeRow = (idx: number) =>
    setCriteriaRows(rows => rows.filter((_, i) => i !== idx))

  const updateRow = (idx: number, field: string, value: string | number) => {
    setCriteriaRows(rows =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    )
  }

  const handleEditEval = (ev: Evaluacion) => {
    setEditingEval(ev)
    setCreatedEvalId(ev.id)
    setFormColabId(colaboradores.find(c => c.id === ev.colaborador_id) ?? { id: ev.colaborador_id, nombre: ev.colaborador_nombre })
    setFormEvalId(
      ev.evaluador_id != null
        ? colaboradores.find(c => c.id === ev.evaluador_id) ?? { id: ev.evaluador_id, nombre: ev.evaluador_nombre ?? '' }
        : null
    )
    setFormPeriodo(ev.periodo)
    setFormTipo(ev.tipo_evaluacion)
    setFormFecha(ev.fecha)
    setFormNotas(ev.notas ?? '')
    if (ev.detalles && ev.detalles.length > 0) {
      let key = nextKey
      setCriteriaRows(ev.detalles.map(d => ({ ...d, _key: key++ })))
      setNextKey(key)
    } else {
      setCriteriaRows([])
    }
    setTab(1)
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const filtered = evaluaciones.filter(e =>
    (!filterSearch || e.colaborador_nombre.toLowerCase().includes(filterSearch.toLowerCase())) &&
    (!filterTipo || e.tipo_evaluacion === filterTipo) &&
    (!filterPeriodo || e.periodo.includes(filterPeriodo)) &&
    (!filterEstado || e.estado === filterEstado)
  )

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout title="GH — Evaluación de Desempeño">
      {/* Header */}
      <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: alpha(GH_COLOR, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AssessmentIcon sx={{ color: GH_COLOR, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography fontSize={22} fontWeight={800} letterSpacing="-0.03em">
            Evaluación de Desempeño
          </Typography>
          <Typography fontSize={13} color="text.secondary">
            Gestión del desempeño y competencias del personal
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: '1px solid #E5E7EB',
          '& .MuiTabs-indicator': { bgcolor: GH_COLOR },
        }}
      >
        <Tab
          label="Evaluaciones"
          sx={{ textTransform: 'none', fontWeight: 600, '&.Mui-selected': { color: GH_COLOR } }}
        />
        <Tab
          label="Nueva Evaluación"
          sx={{ textTransform: 'none', fontWeight: 600, '&.Mui-selected': { color: GH_COLOR } }}
        />
      </Tabs>

      {/* ── TAB 0: List ── */}
      {tab === 0 && (
        <Box>
          {/* Filter row */}
          <Stack direction="row" gap={1.5} mb={2} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Buscar colaborador..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              sx={{ flex: 2, minWidth: 160 }}
            />
            <TextField
              select
              size="small"
              label="Tipo"
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
              sx={{ flex: 1, minWidth: 110 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="90">90°</MenuItem>
              <MenuItem value="180">180°</MenuItem>
              <MenuItem value="360">360°</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="Período"
              value={filterPeriodo}
              onChange={e => setFilterPeriodo(e.target.value)}
              sx={{ flex: 1, minWidth: 110 }}
            />
            <TextField
              select
              size="small"
              label="Estado"
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              sx={{ flex: 1, minWidth: 130 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
              <MenuItem value="COMPLETADO">Completado</MenuItem>
            </TextField>
          </Stack>

          {/* Table */}
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress sx={{ color: GH_COLOR }} />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                    {['Colaborador', 'Evaluador', 'Período', 'Tipo', 'Fecha', 'Calificación', 'Estado', 'Acciones'].map(h => (
                      <TableCell
                        key={h}
                        sx={{ fontWeight: 700, fontSize: 12, color: '#374151', py: 1.5 }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary', fontSize: 13 }}>
                        No se encontraron evaluaciones.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(ev => {
                      const isExpanded = expandedRowId === ev.id
                      const badgeSx = ev.calificacion_total != null ? calBadgeSx(ev.calificacion_total) : null
                      return (
                        <React.Fragment key={ev.id}>
                          {/* Main row */}
                          <TableRow
                            hover
                            sx={{
                              cursor: 'pointer',
                              bgcolor: isExpanded ? alpha(GH_COLOR, 0.03) : undefined,
                              '&:hover': { bgcolor: alpha(GH_COLOR, 0.04) },
                            }}
                            onClick={() => setExpandedRowId(isExpanded ? null : ev.id)}
                          >
                            {/* Colaborador */}
                            <TableCell sx={{ fontSize: 13 }}>
                              <Stack direction="row" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: alpha(GH_COLOR, 0.15), color: GH_COLOR }}>
                                  {ev.colaborador_nombre.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography fontSize={13} fontWeight={500}>
                                  {ev.colaborador_nombre}
                                </Typography>
                              </Stack>
                            </TableCell>

                            {/* Evaluador */}
                            <TableCell sx={{ fontSize: 13 }}>
                              {ev.evaluador_id == null ? (
                                <Chip
                                  label="Auto"
                                  size="small"
                                  sx={{ bgcolor: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontSize: 11 }}
                                />
                              ) : (
                                <Typography fontSize={13}>{ev.evaluador_nombre}</Typography>
                              )}
                            </TableCell>

                            {/* Período */}
                            <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>{ev.periodo}</TableCell>

                            {/* Tipo */}
                            <TableCell>
                              <Chip
                                label={`${ev.tipo_evaluacion}°`}
                                size="small"
                                sx={{ ...tipoChipSx(ev.tipo_evaluacion), fontWeight: 700, fontSize: 11 }}
                              />
                            </TableCell>

                            {/* Fecha */}
                            <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>{ev.fecha}</TableCell>

                            {/* Calificación */}
                            <TableCell>
                              {ev.calificacion_total != null && badgeSx ? (
                                <Box
                                  display="inline-flex"
                                  alignItems="center"
                                  sx={{
                                    ...badgeSx,
                                    borderRadius: '8px',
                                    px: 1.5,
                                    py: 0.25,
                                    fontWeight: 700,
                                    fontSize: 13,
                                  }}
                                >
                                  {ev.calificacion_total.toFixed(1)}
                                </Box>
                              ) : (
                                <Typography fontSize={12} color="text.secondary">—</Typography>
                              )}
                            </TableCell>

                            {/* Estado */}
                            <TableCell>
                              <Chip
                                label={
                                  ev.estado === 'COMPLETADO' ? 'Completado'
                                  : ev.estado === 'EN_PROCESO' ? 'En Proceso'
                                  : 'Pendiente'
                                }
                                size="small"
                                sx={{ ...estadoChipSx(ev.estado), fontWeight: 600, fontSize: 11 }}
                              />
                            </TableCell>

                            {/* Acciones */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Stack direction="row" gap={0.5}>
                                <Tooltip title={isExpanded ? 'Ocultar detalles' : 'Ver detalles'}>
                                  <IconButton
                                    size="small"
                                    onClick={() => setExpandedRowId(isExpanded ? null : ev.id)}
                                    sx={{ color: isExpanded ? GH_COLOR : '#6B7280' }}
                                  >
                                    <VisibilityIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Editar">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditEval(ev)}
                                    sx={{ color: '#6B7280', '&:hover': { color: GH_COLOR } }}
                                  >
                                    <EditIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>

                          {/* Expandable detail row */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={8} sx={{ py: 0, bgcolor: '#FAFAFA' }}>
                                <Box px={2} py={2}>
                                  {ev.notas && (
                                    <Typography fontSize={12} color="text.secondary" mb={1.5}>
                                      <strong>Notas:</strong> {ev.notas}
                                    </Typography>
                                  )}
                                  {(!ev.detalles || ev.detalles.length === 0) ? (
                                    <Typography fontSize={13} color="text.secondary" fontStyle="italic">
                                      Sin criterios registrados para esta evaluación.
                                    </Typography>
                                  ) : (
                                    <>
                                      <Table size="small" sx={{ bgcolor: 'white', borderRadius: 1 }}>
                                        <TableHead>
                                          <TableRow sx={{ bgcolor: '#F3F4F6' }}>
                                            {['Criterio', 'Competencia', 'Calificación', 'Peso', 'Observación'].map(h => (
                                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#374151', py: 1 }}>
                                                {h}
                                              </TableCell>
                                            ))}
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {ev.detalles.map((d, di) => {
                                            const dBadge = calBadgeSx(d.calificacion)
                                            return (
                                              <TableRow key={d.id ?? di}>
                                                <TableCell sx={{ fontSize: 12 }}>{d.criterio}</TableCell>
                                                <TableCell sx={{ fontSize: 12 }}>{d.competencia}</TableCell>
                                                <TableCell>
                                                  <Box
                                                    display="inline-flex"
                                                    sx={{
                                                      ...dBadge,
                                                      borderRadius: '6px',
                                                      px: 1,
                                                      py: 0.25,
                                                      fontSize: 12,
                                                      fontWeight: 700,
                                                    }}
                                                  >
                                                    {d.calificacion} / 10
                                                  </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 12 }}>{d.peso}</TableCell>
                                                <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>
                                                  {d.observacion || '—'}
                                                </TableCell>
                                              </TableRow>
                                            )
                                          })}
                                        </TableBody>
                                      </Table>

                                      {/* Weighted average summary */}
                                      {(() => {
                                        const detallesAsRows: CriteriaRow[] = ev.detalles!.map((d, i) => ({ ...d, _key: i }))
                                        const avg = computeAvg(detallesAsRows)
                                        const avgBadge = calBadgeSx(avg)
                                        return (
                                          <Box textAlign="right" mt={1.5}>
                                            <Typography fontSize={11} color="text.secondary" mb={0.5}>
                                              Promedio ponderado
                                            </Typography>
                                            <Box
                                              display="inline-flex"
                                              alignItems="center"
                                              sx={{
                                                ...avgBadge,
                                                borderRadius: '10px',
                                                px: 2,
                                                py: 0.5,
                                                border: `1.5px solid ${avgBadge.color}`,
                                              }}
                                            >
                                              <Typography fontSize={16} fontWeight={800} color={avgBadge.color}>
                                                {avg.toFixed(1)} / 10
                                              </Typography>
                                            </Box>
                                          </Box>
                                        )
                                      })()}
                                    </>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ── TAB 1: Form ── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {/* Left panel */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5 }}>
              <Typography fontWeight={700} fontSize={14} mb={2}>Datos de la Evaluación</Typography>
              <Stack gap={1.5}>
                <Autocomplete
                  options={colaboradores}
                  getOptionLabel={o => o.nombre}
                  value={formColabId}
                  onChange={(_, v) => setFormColabId(v)}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  renderInput={params => (
                    <TextField {...params} label="Colaborador *" size="small" />
                  )}
                />
                <Autocomplete
                  options={colaboradores}
                  getOptionLabel={o => o.nombre}
                  value={formEvalId}
                  onChange={(_, v) => setFormEvalId(v)}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  renderInput={params => (
                    <TextField {...params} label="Evaluador (opcional)" size="small" />
                  )}
                />
                <TextField
                  label="Período"
                  placeholder="2026-Q1"
                  size="small"
                  value={formPeriodo}
                  onChange={e => setFormPeriodo(e.target.value)}
                  fullWidth
                />
                {/* Tipo */}
                <Box>
                  <Typography fontSize={12} color="text.secondary" mb={0.5}>
                    Tipo de evaluación
                  </Typography>
                  <ToggleButtonGroup
                    value={formTipo}
                    exclusive
                    onChange={(_, v) => { if (v) setFormTipo(v) }}
                    size="small"
                  >
                    <ToggleButton value="90" sx={{ textTransform: 'none', fontSize: 12 }}>90°</ToggleButton>
                    <ToggleButton value="180" sx={{ textTransform: 'none', fontSize: 12 }}>180°</ToggleButton>
                    <ToggleButton value="360" sx={{ textTransform: 'none', fontSize: 12 }}>360°</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <TextField
                  label="Fecha"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={formFecha}
                  onChange={e => setFormFecha(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Notas"
                  multiline
                  rows={3}
                  size="small"
                  value={formNotas}
                  onChange={e => setFormNotas(e.target.value)}
                  fullWidth
                />
                <Button
                  fullWidth
                  variant="contained"
                  disabled={createEval.isPending || updateEval.isPending}
                  startIcon={
                    (createEval.isPending || updateEval.isPending)
                      ? <CircularProgress size={14} color="inherit" />
                      : undefined
                  }
                  sx={{
                    bgcolor: GH_COLOR,
                    '&:hover': { bgcolor: '#9D174D' },
                    textTransform: 'none',
                    mt: 1,
                  }}
                  onClick={handleCreateEval}
                >
                  {editingEval ? 'Actualizar Evaluación' : 'Crear Evaluación'}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Right panel */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5 }}>
              <Typography fontWeight={700} fontSize={14} mb={2}>Criterios de Evaluación</Typography>
              {!createdEvalId ? (
                <Typography color="text.secondary" fontSize={13}>
                  Primero crea la evaluación para agregar criterios.
                </Typography>
              ) : (
                <Stack gap={1.5}>
                  {criteriaRows.map((row, idx) => (
                    <Paper key={row._key} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 1, p: 1.5 }}>
                      <Stack gap={1}>
                        <Stack direction="row" gap={1}>
                          <TextField
                            size="small"
                            label="Criterio"
                            value={row.criterio}
                            onChange={e => updateRow(idx, 'criterio', e.target.value)}
                            sx={{ flex: 2 }}
                          />
                          <TextField
                            size="small"
                            label="Competencia"
                            value={row.competencia}
                            onChange={e => updateRow(idx, 'competencia', e.target.value)}
                            sx={{ flex: 2 }}
                          />
                          <TextField
                            size="small"
                            label="Peso"
                            type="number"
                            value={row.peso}
                            onChange={e => updateRow(idx, 'peso', Number(e.target.value))}
                            inputProps={{ min: 0.1, max: 3, step: 0.1 }}
                            sx={{ flex: 0.8 }}
                          />
                          <IconButton size="small" color="error" onClick={() => removeRow(idx)}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Stack>
                        <Box px={1}>
                          <Typography fontSize={11} color="text.secondary">
                            Calificación: {row.calificacion}
                          </Typography>
                          <Slider
                            value={row.calificacion}
                            min={0}
                            max={10}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                            onChange={(_, v) => updateRow(idx, 'calificacion', v as number)}
                            sx={{ color: GH_COLOR }}
                          />
                        </Box>
                        <TextField
                          size="small"
                          label="Observación"
                          value={row.observacion}
                          onChange={e => updateRow(idx, 'observacion', e.target.value)}
                          fullWidth
                        />
                      </Stack>
                    </Paper>
                  ))}

                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addRow}
                    variant="outlined"
                    sx={{
                      textTransform: 'none',
                      color: GH_COLOR,
                      borderColor: alpha(GH_COLOR, 0.4),
                      alignSelf: 'flex-start',
                      '&:hover': { borderColor: GH_COLOR, bgcolor: alpha(GH_COLOR, 0.04) },
                    }}
                  >
                    Agregar Criterio
                  </Button>

                  {criteriaRows.length > 0 && (() => {
                    const avg = computeAvg(criteriaRows)
                    const badgeSx = calBadgeSx(avg)
                    return (
                      <Box
                        textAlign="center"
                        py={1.5}
                        sx={{ borderTop: '1px solid #E5E7EB', mt: 1 }}
                      >
                        <Typography fontSize={12} color="text.secondary" mb={0.5}>
                          Promedio ponderado
                        </Typography>
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          justifyContent="center"
                          sx={{
                            ...badgeSx,
                            borderRadius: '12px',
                            px: 3,
                            py: 1,
                            border: `2px solid ${badgeSx.color}`,
                          }}
                        >
                          <Typography fontSize={22} fontWeight={800} color={badgeSx.color}>
                            {avg.toFixed(1)} / 10
                          </Typography>
                        </Box>
                      </Box>
                    )
                  })()}

                  <Button
                    fullWidth
                    variant="contained"
                    disabled={saveDetalles.isPending || criteriaRows.length === 0}
                    startIcon={
                      saveDetalles.isPending
                        ? <CircularProgress size={14} color="inherit" />
                        : undefined
                    }
                    sx={{
                      bgcolor: GH_COLOR,
                      '&:hover': { bgcolor: '#9D174D' },
                      textTransform: 'none',
                    }}
                    onClick={() => saveDetalles.mutate({ id: createdEvalId, detalles: criteriaRows })}
                  >
                    Guardar Criterios
                  </Button>
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Layout>
  )
}
