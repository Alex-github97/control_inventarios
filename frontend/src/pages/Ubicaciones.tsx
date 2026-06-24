import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Grid, CardContent, Chip,
  TextField, InputAdornment, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select,
  MenuItem, IconButton, Tooltip, alpha, Divider,
} from '@mui/material'
import { Add, Search, LocationOn, Edit, DeleteOutline } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'

const TIPO_COLORS: Record<string, { bg: string; color: string; border: string; icon: string }> = {
  BODEGA:           { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', icon: '🏭' },
  PLANTA:           { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: '🏗️' },
  PATIO:            { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: '🅿️' },
  CLIENTE:          { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', icon: '🏢' },
  PROVEEDOR:        { bg: '#FDF2F8', color: '#DB2777', border: '#FBCFE8', icon: '🏪' },
  VEHICULO:         { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', icon: '🚛' },
  TRANSITO:         { bg: '#F0FDF4', color: '#15803D', border: '#86EFAC', icon: '🛣️' },
  DISPOSICION_FINAL:{ bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: '♻️' },
}

const TIPOS = Object.keys(TIPO_COLORS)
const TIPOS_ESTIBA = ['MADERA', 'PLASTICO', 'METAL', 'CARTON', 'MIXTA']

const EMPTY_FORM = {
  codigo: '', nombre: '', tipo: 'BODEGA', descripcion: '',
  ciudad: '', departamento: '', capacidad_estibas: '',
}

interface Ubicacion {
  id: number
  codigo: string
  nombre: string
  tipo: string
  descripcion?: string
  ciudad?: string
  departamento?: string
  capacidad_estibas?: number
  activo: boolean
}

export default function Ubicaciones() {
  const queryClient = useQueryClient()
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [openCreate, setOpenCreate]   = useState(false)
  const [createForm, setCreateForm]   = useState({ ...EMPTY_FORM })
  const [createStock, setCreateStock] = useState<Record<string, string>>({})

  const [editTarget, setEditTarget]   = useState<Ubicacion | null>(null)
  const [editForm, setEditForm]       = useState({ ...EMPTY_FORM })
  const [editStock, setEditStock]     = useState<Record<string, string>>({})

  const [deleteTarget, setDeleteTarget] = useState<Ubicacion | null>(null)

  /* ── Queries ── */
  const { data: ubicaciones, isLoading } = useQuery({
    queryKey: ['ubicaciones', search],
    queryFn: () => apiClient.get<Ubicacion[]>('/ubicaciones', {
      params: { ...(search && { search }) },
    }).then(r => r.data),
  })

  const { data: allStockMin = [] } = useQuery({
    queryKey: ['stock-minimo'],
    queryFn: () => apiClient.get('/estibas/stock-minimo/resumen').then(r => r.data),
    staleTime: 30000,
  })

  /* ── Helpers ── */
  const saveStockMinimos = async (ubicacionId: number, newValues: Record<string, string>) => {
    const existing: any[] = (allStockMin as any[]).filter((c: any) => c.ubicacion_id === ubicacionId)
    for (const tipo of TIPOS_ESTIBA) {
      const raw = newValues[tipo]
      const val = raw ? parseInt(raw) : 0
      const found = existing.find((c: any) => c.tipo_estiba === tipo)
      if (val > 0) {
        if (found) {
          if (val !== found.cantidad_minima) {
            await apiClient.put(`/estibas/stock-minimo/${found.id}`, { cantidad_minima: val })
          }
        } else {
          await apiClient.post('/estibas/stock-minimo', { ubicacion_id: ubicacionId, tipo_estiba: tipo, cantidad_minima: val })
        }
      } else if (found) {
        await apiClient.delete(`/estibas/stock-minimo/${found.id}`)
      }
    }
    queryClient.invalidateQueries({ queryKey: ['stock-minimo'] })
  }

  /* ── Mutations ── */
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/ubicaciones', data).then(r => r.data),
    onSuccess: async (newUb: Ubicacion) => {
      if (createForm.tipo === 'BODEGA') {
        await saveStockMinimos(newUb.id, createStock)
      }
      toast.success('Ubicación creada')
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['ubicaciones-select'] })
      setOpenCreate(false)
      setCreateForm({ ...EMPTY_FORM })
      setCreateStock({})
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al crear'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put(`/ubicaciones/${id}`, data).then(r => r.data),
    onSuccess: async () => {
      if (editForm.tipo === 'BODEGA' && editTarget) {
        await saveStockMinimos(editTarget.id, editStock)
      }
      toast.success('Ubicación actualizada')
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['ubicaciones-select'] })
      setEditTarget(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/ubicaciones/${id}`),
    onSuccess: () => {
      toast.success('Ubicación eliminada')
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      setDeleteTarget(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al eliminar'),
  })

  /* ── Handlers ── */
  const handleCreate = () => {
    createMutation.mutate({
      ...createForm,
      capacidad_estibas: createForm.capacidad_estibas ? parseInt(createForm.capacidad_estibas) : undefined,
    })
  }

  const openEdit = (u: Ubicacion) => {
    setEditTarget(u)
    setEditForm({
      codigo:            u.codigo,
      nombre:            u.nombre,
      tipo:              u.tipo,
      descripcion:       u.descripcion ?? '',
      ciudad:            u.ciudad ?? '',
      departamento:      u.departamento ?? '',
      capacidad_estibas: u.capacidad_estibas?.toString() ?? '',
    })
    if (u.tipo === 'BODEGA') {
      const map: Record<string, string> = {}
      const cached = (allStockMin as any[]).filter((c: any) => c.ubicacion_id === u.id)
      for (const c of cached) map[c.tipo_estiba] = c.cantidad_minima.toString()
      setEditStock(map)
    } else {
      setEditStock({})
    }
  }

  const handleUpdate = () => {
    if (!editTarget) return
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        nombre:            editForm.nombre,
        tipo:              editForm.tipo,
        descripcion:       editForm.descripcion || null,
        ciudad:            editForm.ciudad || null,
        departamento:      editForm.departamento || null,
        capacidad_estibas: editForm.capacidad_estibas ? parseInt(editForm.capacidad_estibas) : null,
      },
    })
  }

  /* ── Sección de stock mínimo (solo para BODEGA) ── */
  const StockMinimoSection = ({
    tipo, stock, setStock,
  }: {
    tipo: string
    stock: Record<string, string>
    setStock: React.Dispatch<React.SetStateAction<Record<string, string>>>
  }) => {
    if (tipo !== 'BODEGA') return null
    return (
      <>
        <Grid item xs={12}>
          <Divider sx={{ my: 0.5 }} />
        </Grid>
        <Grid item xs={12}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
            Alertas de stock mínimo
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: '#94A3B8', mb: 1.5 }}>
            El sistema alertará cuando el stock EN_INVENTARIO de un tipo caiga por debajo del mínimo. Deja vacío para no monitorear ese tipo.
          </Typography>
          <Grid container spacing={1}>
            {TIPOS_ESTIBA.map(t => (
              <Grid item xs={6} sm={4} key={t}>
                <TextField
                  label={t}
                  size="small"
                  type="number"
                  fullWidth
                  value={stock[t] ?? ''}
                  onChange={e => setStock(prev => ({ ...prev, [t]: e.target.value }))}
                  placeholder="Sin mínimo"
                  inputProps={{ min: 1 }}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
      </>
    )
  }

  /* ── Render ── */
  return (
    <Layout title="Ubicaciones">
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar ubicación..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: '#94A3B8' }} />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="outlined" onClick={() => setSearch(searchInput)}>Buscar</Button>
        {search && (
          <Button size="small" onClick={() => { setSearch(''); setSearchInput('') }}>
            Limpiar
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          {ubicaciones?.length ?? 0} ubicaciones
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)}>
          Nueva Ubicación
        </Button>
      </Box>

      {/* Grid de cards */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
              </Grid>
            ))
          : (ubicaciones || []).map((u: Ubicacion) => {
              const tc = TIPO_COLORS[u.tipo] || { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0', icon: '📦' }
              const stockConfigs = (allStockMin as any[]).filter((c: any) => c.ubicacion_id === u.id)
              return (
                <Grid item xs={12} sm={6} md={4} key={u.id}>
                  <Card sx={{
                    position: 'relative',
                    border: `1px solid ${tc.border}`,
                    boxShadow: 'none',
                    '&:hover': { boxShadow: `0 6px 20px ${alpha(tc.color, 0.12)}`, borderColor: tc.color },
                    '&:hover .card-actions': { opacity: 1 },
                    transition: 'all 0.2s ease',
                  }}>
                    <Box className="card-actions" sx={{
                      position: 'absolute', top: 8, right: 8,
                      display: 'flex', gap: 0.5,
                      opacity: 0, transition: 'opacity 0.15s ease',
                    }}>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => openEdit(u)}
                          sx={{ bgcolor: '#FFF', width: 28, height: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', '&:hover': { bgcolor: alpha(PRIMARY, 0.08), color: PRIMARY } }}
                        >
                          <Edit sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(u)}
                          sx={{ bgcolor: '#FFF', width: 28, height: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', '&:hover': { bgcolor: '#FEF2F2', color: '#DC2626' } }}
                        >
                          <DeleteOutline sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <CardContent sx={{ pb: '16px !important' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 40, height: 40, borderRadius: '10px',
                          bgcolor: tc.bg, border: `1px solid ${tc.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}>
                          {tc.icon}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, pr: 6 }} noWrap>
                            {u.nombre}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', mt: 0.25 }}>
                            {u.codigo}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: u.capacidad_estibas || stockConfigs.length ? 1 : 0 }}>
                        <Chip
                          label={u.tipo.replace(/_/g, ' ')}
                          size="small"
                          sx={{ bgcolor: tc.bg, color: tc.color, fontWeight: 700, fontSize: 10.5, border: `1px solid ${tc.border}`, height: 20 }}
                        />
                        {u.ciudad && (
                          <Chip label={u.ciudad} size="small" variant="outlined"
                            sx={{ fontSize: 10.5, height: 20, color: '#64748B', borderColor: '#E2E8F0' }} />
                        )}
                      </Box>

                      {u.capacidad_estibas && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <LocationOn sx={{ fontSize: 13, color: '#94A3B8' }} />
                          <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                            Cap. {u.capacidad_estibas.toLocaleString('es-CO')} estibas
                          </Typography>
                        </Box>
                      )}

                      {/* Indicador de alertas de stock configuradas */}
                      {stockConfigs.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                          {stockConfigs.map((c: any) => (
                            <Chip
                              key={c.tipo_estiba}
                              label={`${c.tipo_estiba} ≥${c.cantidad_minima}`}
                              size="small"
                              sx={{
                                fontSize: 10, height: 18,
                                bgcolor: c.stock_actual < c.cantidad_minima ? '#FFF7ED' : '#F0FDF4',
                                color:   c.stock_actual < c.cantidad_minima ? '#C2410C' : '#16A34A',
                                border:  `1px solid ${c.stock_actual < c.cantidad_minima ? '#FED7AA' : '#BBF7D0'}`,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
      </Grid>

      {/* ── Diálogo: Crear ── */}
      <Dialog open={openCreate} onClose={() => { setOpenCreate(false); setCreateStock({}) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva Ubicación</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Código *"
                value={createForm.codigo}
                onChange={e => setCreateForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                inputProps={{ maxLength: 20 }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo *</InputLabel>
                <Select value={createForm.tipo} label="Tipo *"
                  onChange={e => setCreateForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(t => (
                    <MenuItem key={t} value={t}>{TIPO_COLORS[t].icon} {t.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Nombre *"
                value={createForm.nombre}
                onChange={e => setCreateForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Ciudad"
                value={createForm.ciudad}
                onChange={e => setCreateForm(f => ({ ...f, ciudad: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Departamento"
                value={createForm.departamento}
                onChange={e => setCreateForm(f => ({ ...f, departamento: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Capacidad (estibas)" type="number"
                value={createForm.capacidad_estibas}
                onChange={e => setCreateForm(f => ({ ...f, capacidad_estibas: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Descripción" multiline rows={2}
                value={createForm.descripcion}
                onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </Grid>
            <StockMinimoSection tipo={createForm.tipo} stock={createStock} setStock={setCreateStock} />
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setOpenCreate(false); setCreateStock({}) }} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear Ubicación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Editar ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Editar Ubicación</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Código" disabled value={editForm.codigo} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo *</InputLabel>
                <Select value={editForm.tipo} label="Tipo *"
                  onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(t => (
                    <MenuItem key={t} value={t}>{TIPO_COLORS[t].icon} {t.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Nombre *"
                value={editForm.nombre}
                onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Ciudad"
                value={editForm.ciudad}
                onChange={e => setEditForm(f => ({ ...f, ciudad: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Departamento"
                value={editForm.departamento}
                onChange={e => setEditForm(f => ({ ...f, departamento: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Capacidad (estibas)" type="number"
                value={editForm.capacidad_estibas}
                onChange={e => setEditForm(f => ({ ...f, capacidad_estibas: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Descripción" multiline rows={2}
                value={editForm.descripcion}
                onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </Grid>
            <StockMinimoSection tipo={editForm.tipo} stock={editStock} setStock={setEditStock} />
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditTarget(null)} disabled={updateMutation.isPending}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleUpdate} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Confirmar eliminar ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Eliminar ubicación</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#64748B', fontSize: 14 }}>
            ¿Estás seguro de que quieres eliminar{' '}
            <strong style={{ color: '#1E293B' }}>{deleteTarget?.nombre}</strong>?
            <br /><br />
            Esta acción la desactivará del sistema. Las estibas que tengan
            esta ubicación asignada no se verán afectadas.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, boxShadow: 'none' }}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
