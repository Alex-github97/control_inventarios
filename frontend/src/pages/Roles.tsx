import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Grid, Chip, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControlLabel, Checkbox,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip, alpha,
} from '@mui/material'
import { Add, Edit, Delete, AdminPanelSettings, Check, Close, Group } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  estibas: 'Estibas',
  movimientos: 'Movimientos',
  manifiestos: 'Manifiestos',
  vehiculos: 'Vehículos',
  ubicaciones: 'Ubicaciones',
  proveedores: 'Proveedores',
  alertas: 'Alertas',
  danos: 'Daños',
  trazabilidad: 'Trazabilidad',
  mantenimiento: 'Mantenimiento',
  costos: 'Costos',
  consultas: 'Consultas',
  usuarios: 'Usuarios',
}

const MODULOS = Object.keys(MODULE_LABELS)
const DEFAULT_PERMISOS = Object.fromEntries(MODULOS.map(m => [m, false]))

const PRESET_COLORS = [
  '#DC2626', '#D97706', '#2563EB', '#7C3AED', '#6B7280',
  '#32AC5C', '#0891B2', '#DB2777', '#EA580C', '#4F46E5',
]

const emptyForm = {
  nombre: '', label: '', descripcion: '', color: '#4F46E5',
  permisos: { ...DEFAULT_PERMISOS },
}

interface RolDialogProps {
  open: boolean
  title: string
  form: any
  setForm: (f: any) => void
  onClose: () => void
  onSave: () => void
  loading: boolean
  esNuevo: boolean
  esSistema?: boolean
}

function RolDialog({ open, title, form, setForm, onClose, onSave, loading, esNuevo, esSistema }: RolDialogProps) {
  const permisos: Record<string, boolean> = { ...DEFAULT_PERMISOS, ...(form.permisos || {}) }

  const togglePermiso = (mod: string) => {
    setForm({ ...form, permisos: { ...permisos, [mod]: !permisos[mod] } })
  }

  const toggleAll = (value: boolean) => {
    setForm({ ...form, permisos: Object.fromEntries(MODULOS.map(m => [m, value])) })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {!esSistema && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Nombre interno (sin espacios)"
                value={form.nombre || ''}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                helperText="Se guardará en mayúsculas. Ej: JEFE_BODEGA"
                disabled={!esNuevo && esSistema}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={esSistema ? 12 : 6}>
            <TextField
              fullWidth size="small" label="Etiqueta visible"
              value={form.label || ''}
              onChange={e => setForm({ ...form, label: e.target.value })}
              helperText="Nombre que verán los usuarios"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" label="Descripción" multiline rows={2}
              value={form.descripcion || ''}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
            />
          </Grid>

          {/* Color */}
          <Grid item xs={12}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1 }}>
              Color identificador
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {PRESET_COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  sx={{
                    width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    border: form.color === c ? '3px solid #1E293B' : '2px solid transparent',
                    boxShadow: form.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
              <Box
                sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f00, #0f0, #00f)',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                }}
              >
                <input
                  type="color"
                  value={form.color || '#4F46E5'}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
              </Box>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: form.color, border: '2px solid #E2E8F0' }} />
            </Box>
          </Grid>

          {/* Permisos */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Permisos por módulo</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={() => toggleAll(true)} sx={{ fontSize: 11, color: PRIMARY }}>
                  Activar todos
                </Button>
                <Button size="small" onClick={() => toggleAll(false)} sx={{ fontSize: 11, color: '#94A3B8' }}>
                  Desactivar todos
                </Button>
              </Box>
            </Box>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5 }}>
              <Grid container>
                {MODULOS.map(mod => (
                  <Grid item xs={6} sm={4} md={3} key={mod}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={permisos[mod] ?? false}
                          onChange={() => togglePermiso(mod)}
                          sx={{
                            color: '#CBD5E1',
                            '&.Mui-checked': { color: form.color || PRIMARY },
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: 12 }}>{MODULE_LABELS[mod]}</Typography>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained" disabled={loading} onClick={onSave}
          sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' } }}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Roles() {
  const queryClient = useQueryClient()
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<any>(null)
  const [openDelete, setOpenDelete] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get('/roles/').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (body: any) => apiClient.post('/roles/', body).then(r => r.data),
    onSuccess: () => {
      toast.success('Rol creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpenCreate(false)
      setForm(emptyForm)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al crear el rol'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      apiClient.put(`/roles/${id}`, body).then(r => r.data),
    onSuccess: () => {
      toast.success('Rol actualizado')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpenEdit(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al actualizar el rol'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success('Rol eliminado')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpenDelete(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al eliminar el rol'),
  })

  const openEditDialog = (rol: any) => {
    setOpenEdit({
      ...rol,
      permisos: { ...DEFAULT_PERMISOS, ...(rol.permisos || {}) },
    })
  }

  const handleCreate = () => {
    if (!form.nombre?.trim()) {
      toast.error('El nombre interno del rol es obligatorio')
      return
    }
    createMutation.mutate({
      nombre: form.nombre,
      label: form.label || form.nombre,
      descripcion: form.descripcion,
      color: form.color,
      permisos: form.permisos,
    })
  }

  const handleEdit = () => {
    if (!openEdit) return
    editMutation.mutate({
      id: openEdit.id,
      body: {
        nombre: openEdit.es_sistema ? undefined : openEdit.nombre,
        label: openEdit.label,
        descripcion: openEdit.descripcion,
        color: openEdit.color,
        permisos: openEdit.permisos,
      },
    })
  }

  if (isLoading) {
    return (
      <Layout title="Roles y Permisos">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress sx={{ color: PRIMARY }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout title="Roles y Permisos">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Administra los roles y permisos de acceso al sistema
        </Typography>
        <Button
          variant="contained" startIcon={<Add />}
          onClick={() => { setForm({ ...emptyForm, permisos: { ...DEFAULT_PERMISOS } }); setOpenCreate(true) }}
          sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' } }}
        >
          Nuevo Rol
        </Button>
      </Box>

      {/* Cards de roles */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {roles.map((rol: any) => (
          <Grid item xs={12} sm={6} md={4} key={rol.id}>
            <Card sx={{
              p: 2.5, borderRadius: '12px',
              border: `1px solid ${alpha(rol.color || '#6B7280', 0.2)}`,
              borderTop: `4px solid ${rol.color || '#6B7280'}`,
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AdminPanelSettings sx={{ color: rol.color || '#6B7280', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{rol.label || rol.nombre}</Typography>
                  {rol.es_sistema && (
                    <Chip
                      label="Sistema" size="small"
                      sx={{ fontSize: 9, height: 16, bgcolor: alpha(rol.color || '#6B7280', 0.1), color: rol.color || '#6B7280' }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Editar permisos">
                    <IconButton size="small" onClick={() => openEditDialog(rol)} sx={{ color: '#64748B' }}>
                      <Edit sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  {!rol.es_sistema && (
                    <Tooltip title="Eliminar rol">
                      <IconButton
                        size="small" onClick={() => setOpenDelete(rol)}
                        sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.06) } }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Typography sx={{ fontSize: 12, color: '#64748B', mb: 1.5, minHeight: 32 }}>
                {rol.descripcion || '—'}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                  {MODULOS.filter(m => rol.permisos?.[m]).slice(0, 5).map(m => (
                    <Chip
                      key={m} label={MODULE_LABELS[m]} size="small"
                      sx={{ fontSize: 9, height: 18, bgcolor: alpha(rol.color || '#6B7280', 0.1), color: rol.color || '#6B7280', fontWeight: 700 }}
                    />
                  ))}
                  {MODULOS.filter(m => rol.permisos?.[m]).length > 5 && (
                    <Chip
                      label={`+${MODULOS.filter(m => rol.permisos?.[m]).length - 5} más`} size="small"
                      sx={{ fontSize: 9, height: 18, bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Tooltip title={`${rol.total_usuarios} usuario(s) con este rol`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Group sx={{ fontSize: 13, color: '#94A3B8' }} />
                    <Typography sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>
                      {rol.total_usuarios}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Matriz de permisos */}
      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Matriz de permisos completa</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Módulo</TableCell>
                {roles.map((rol: any) => (
                  <TableCell key={rol.id} align="center" sx={{ fontWeight: 700, minWidth: 110 }}>
                    <Chip
                      label={rol.label || rol.nombre} size="small"
                      sx={{ bgcolor: alpha(rol.color || '#6B7280', 0.12), color: rol.color || '#6B7280', fontWeight: 700, fontSize: 10 }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {MODULOS.map(mod => (
                <TableRow key={mod} hover>
                  <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{MODULE_LABELS[mod]}</TableCell>
                  {roles.map((rol: any) => (
                    <TableCell key={rol.id} align="center">
                      {rol.permisos?.[mod] ? (
                        <Check sx={{ color: PRIMARY, fontSize: 18 }} />
                      ) : (
                        <Close sx={{ color: '#CBD5E1', fontSize: 16 }} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Dialog Crear */}
      <RolDialog
        open={openCreate}
        title="Nuevo Rol"
        form={form}
        setForm={setForm}
        onClose={() => setOpenCreate(false)}
        onSave={handleCreate}
        loading={createMutation.isPending}
        esNuevo
      />

      {/* Dialog Editar */}
      {openEdit && (
        <RolDialog
          open={!!openEdit}
          title={`Editar: ${openEdit.label || openEdit.nombre}`}
          form={openEdit}
          setForm={setOpenEdit}
          onClose={() => setOpenEdit(null)}
          onSave={handleEdit}
          loading={editMutation.isPending}
          esNuevo={false}
          esSistema={openEdit.es_sistema}
        />
      )}

      {/* Dialog Eliminar */}
      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Eliminar Rol</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13 }}>
            ¿Seguro que deseas eliminar el rol <strong>{openDelete?.label || openDelete?.nombre}</strong>?
            Esta acción no se puede deshacer.
          </Typography>
          {openDelete?.total_usuarios > 0 && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: alpha('#EF4444', 0.06), borderRadius: '8px', border: `1px solid ${alpha('#EF4444', 0.2)}` }}>
              <Typography sx={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                ⚠ {openDelete.total_usuarios} usuario(s) tienen este rol. El servidor rechazará la eliminación.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDelete(null)}>Cancelar</Button>
          <Button
            variant="contained" color="error" disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(openDelete.id)}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
