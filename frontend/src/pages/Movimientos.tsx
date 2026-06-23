import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, ButtonGroup, Menu, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination,
  Chip, Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, Autocomplete, alpha,
} from '@mui/material'
import { Add, Search, SwapHoriz, ArrowDropDown, UploadFile } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { StatusChip } from '@/components/common/StatusChip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'

const TIPOS_MOVIMIENTO = [
  'CARGA', 'DESCARGA', 'TRANSFERENCIA', 'RETORNO', 'RECEPCION',
  'REPARACION', 'BAJA', 'DISPOSICION_FINAL', 'INVENTARIO',
]

const TIPO_COLORS: Record<string, string> = {
  CARGA: '#3B82F6', DESCARGA: '#32AC5C', TRANSFERENCIA: '#8B5CF6',
  RETORNO: '#F59E0B', BAJA: '#EF4444', REPARACION: '#F97316', RECEPCION: '#06B6D4',
}

export default function Movimientos() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [openDialog, setOpenDialog] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [form, setForm] = useState({ tipo: 'CARGA', ubicacion_destino_id: '', observaciones: '' })
  const [estibaSearch, setEstibaSearch] = useState('')
  const [selectedEstiba, setSelectedEstiba] = useState<any>(null)

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['movimientos-recientes', page],
    queryFn: () => apiClient.get('/movimientos/recientes', { params: { limit: pageSize } }).then((r: any) => r.data),
  })

  const { data: ubicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => apiClient.get('/ubicaciones').then((r: any) => r.data),
  })

  const { data: estibasEncontradas } = useQuery({
    queryKey: ['estibas-search', estibaSearch],
    queryFn: () => apiClient.get('/estibas', { params: { search: estibaSearch, page_size: 20 } }).then((r: any) => r.data.items ?? []),
    enabled: estibaSearch.length >= 2,
  })

  const handleClose = () => {
    setOpenDialog(false)
    setEstibaSearch('')
    setSelectedEstiba(null)
    setForm({ tipo: 'CARGA', ubicacion_destino_id: '', observaciones: '' })
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/movimientos', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Movimiento registrado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['movimientos-recientes'] })
      handleClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error registrando movimiento'),
  })

  const handleSubmit = () => {
    if (!selectedEstiba || !form.tipo) {
      toast.error('Selecciona una estiba y un tipo de movimiento')
      return
    }
    createMutation.mutate({
      estiba_id: selectedEstiba.id,
      tipo: form.tipo,
      ubicacion_destino_id: form.ubicacion_destino_id ? parseInt(form.ubicacion_destino_id) : undefined,
      observaciones: form.observaciones,
    })
  }

  return (
    <Layout title="Movimientos">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Registro de todos los movimientos de estibas
        </Typography>
        <ButtonGroup variant="contained" disableElevation>
          <Button startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            Registrar Movimiento
          </Button>
          <Button
            size="small" sx={{ px: 0.75 }}
            onClick={e => setMenuAnchor(e.currentTarget)}
          >
            <ArrowDropDown />
          </Button>
        </ButtonGroup>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ elevation: 3, sx: { mt: 0.5, minWidth: 230, borderRadius: '10px' } }}
        >
          <MenuItem onClick={() => { setMenuAnchor(null); navigate('/movimientos/cargue-masivo') }}
            sx={{ py: 1.25, px: 2 }}>
            <UploadFile sx={{ fontSize: 18, mr: 1.5, color: PRIMARY }} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>
                Cargue Masivo
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                Importar movimientos desde Excel (.xlsx)
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Box>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estiba</TableCell>
                <TableCell>Destino</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : (Array.isArray(movimientos) ? movimientos : []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>#{m.id}</Typography></TableCell>
                  <TableCell>
                    <Chip label={m.tipo} size="small"
                      sx={{ bgcolor: TIPO_COLORS[m.tipo] || '#64748B', color: '#FFF', fontWeight: 700, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>#{m.estiba_id}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{m.ubicacion_destino ?? '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{m.usuario}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {format(new Date(m.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Registrar Movimiento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={estibasEncontradas ?? []}
                getOptionLabel={(o: any) => `${o.codigo_interno} — ${o.estado}`}
                inputValue={estibaSearch}
                onInputChange={(_: any, v: string) => setEstibaSearch(v)}
                onChange={(_: any, v: any) => setSelectedEstiba(v)}
                noOptionsText={estibaSearch.length < 2 ? 'Escriba al menos 2 caracteres' : 'No se encontraron estibas'}
                renderInput={(params: any) => (
                  <TextField {...params} label="Buscar estiba por código" size="small" required
                    placeholder="Ej: PRUEBA-001"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Movimiento</InputLabel>
                <Select value={form.tipo} label="Tipo de Movimiento" onChange={(e: any) => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS_MOVIMIENTO.map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Ubicación Destino</InputLabel>
                <Select value={form.ubicacion_destino_id} label="Ubicación Destino" onChange={(e: any) => setForm({ ...form, ubicacion_destino_id: e.target.value })}>
                  <MenuItem value="">Sin ubicación</MenuItem>
                  {(ubicaciones || []).map((u: any) => <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Observaciones" size="small" multiline rows={2}
                value={form.observaciones} onChange={(e: any) => setForm({ ...form, observaciones: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending || !selectedEstiba}>
            {createMutation.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
