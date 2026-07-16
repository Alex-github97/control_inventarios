import { useState } from 'react'
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Paper, Chip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Stack, ToggleButton, ToggleButtonGroup, Tooltip, InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add as AddIcon, DirectionsCar, Search as SearchIcon, Download } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'

export interface VehiculoCombinado {
  origen: string; flota: string; id: number; placa?: string; tipo?: string
  marca?: string; modelo?: string; anio?: number; numero_ejes?: number
  capacidad_kg?: number; estado?: string; motor_marca?: string
  motor_linea?: string; motor_cc?: number; propietario?: string
}

const EMPTY = {
  codigo: '', nombre: '', placa: '', tipo_activo: 'VEHICULO', marca: '', modelo: '',
  anio: '', numero_ejes: '', tiene_repuesto: true, motor_marca: '', motor_linea: '',
  motor_cc: '', responsable: '', sede: '',
}

/**
 * Tabla unificada de vehículos: flota PROPIA (activos del CMMS/EAM) + flota EXTERNA (TMS).
 * `color` adapta el acento al módulo host. Si `permitirCrear`, muestra el alta de flota propia (CMMS).
 */
export function VehiculosCombinados({
  color = '#32AC5C', colorDark = '#27884A', permitirCrear = false,
}: { color?: string; colorDark?: string; permitirCrear?: boolean }) {
  const qc = useQueryClient()
  const [flota, setFlota] = useState<'TODAS' | 'PROPIA' | 'EXTERNA'>('TODAS')
  const [search, setSearch] = useState('')
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })

  const { data: vehiculos = [], isLoading } = useQuery<VehiculoCombinado[]>({
    queryKey: ['vehiculos-combinados'],
    queryFn: () => api.get('/eam/vehiculos-combinados').then(r => r.data),
  })

  const mutCrear = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/eam/activos', payload),
    onSuccess: () => {
      toast.success('Vehículo de flota propia registrado')
      qc.invalidateQueries({ queryKey: ['vehiculos-combinados'] })
      setNuevoOpen(false); setForm({ ...EMPTY })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo registrar'),
  })

  const filtered = vehiculos.filter(v => {
    if (flota !== 'TODAS' && v.flota !== flota) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return [v.placa, v.marca, v.modelo, v.tipo, v.propietario].some(x => (x ?? '').toLowerCase().includes(q))
    }
    return true
  })

  const columnas = [
    { key: 'flota', header: 'Flota' }, { key: 'placa', header: 'Placa' },
    { key: 'tipo', header: 'Tipo' }, { key: 'marca', header: 'Marca' },
    { key: 'modelo', header: 'Modelo' }, { key: 'anio', header: 'Año' },
    { key: 'numero_ejes', header: 'Ejes' }, { key: 'motor_marca', header: 'Motor' },
    { key: 'motor_cc', header: 'CC' }, { key: 'propietario', header: 'Responsable/Propietario' },
  ]

  const exportar = (tipo: 'pdf' | 'excel') => {
    const opts = {
      archivo: 'flota-vehiculos', titulo: 'Flota de vehículos (propia + externa)',
      columnas, filas: filtered, color,
    }
    tipo === 'pdf' ? exportarPDF(opts) : exportarExcel(opts)
  }

  const propias = vehiculos.filter(v => v.flota === 'PROPIA').length
  const externas = vehiculos.filter(v => v.flota === 'EXTERNA').length

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup size="small" exclusive value={flota} onChange={(_, v) => v && setFlota(v)}>
          <ToggleButton value="TODAS" sx={{ textTransform: 'none' }}>Todas ({vehiculos.length})</ToggleButton>
          <ToggleButton value="PROPIA" sx={{ textTransform: 'none' }}>Propia ({propias})</ToggleButton>
          <ToggleButton value="EXTERNA" sx={{ textTransform: 'none' }}>Externa ({externas})</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          size="small" placeholder="Buscar placa, marca, modelo…" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240, flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
        />
        <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('pdf')} sx={{ textTransform: 'none' }}>PDF</Button>
        <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('excel')} sx={{ textTransform: 'none' }}>Excel</Button>
        {permitirCrear && (
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setNuevoOpen(true)}
            sx={{ bgcolor: color, '&:hover': { bgcolor: colorDark }, textTransform: 'none', fontWeight: 700 }}>
            Nuevo vehículo (flota propia)
          </Button>
        )}
      </Stack>

      <Typography fontSize={12} color="#94A3B8" mb={1}>
        Flota propia = registrada en el CMMS · Flota externa = vehículos del TMS · vista unificada de solo lectura
      </Typography>

      <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid ${color}40`, borderRadius: '14px', overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columnas.map(c => <TableCell key={c.key} sx={{ fontWeight: 700, fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>{c.header}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(v => (
              <TableRow key={`${v.origen}-${v.id}`} hover>
                <TableCell>
                  <Chip size="small" label={v.flota === 'PROPIA' ? 'Propia' : 'Externa'}
                    sx={{ fontWeight: 700, fontSize: 10, bgcolor: v.flota === 'PROPIA' ? `${color}22` : '#3B82F622', color: v.flota === 'PROPIA' ? colorDark : '#2563EB' }} />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{v.placa ?? '—'}</TableCell>
                <TableCell>{v.tipo ?? '—'}</TableCell>
                <TableCell>{v.marca ?? '—'}</TableCell>
                <TableCell>{v.modelo ?? '—'}</TableCell>
                <TableCell>{v.anio ?? '—'}</TableCell>
                <TableCell>{v.numero_ejes ?? '—'}</TableCell>
                <TableCell>{v.motor_marca ? `${v.motor_marca}${v.motor_linea ? ` ${v.motor_linea}` : ''}` : '—'}</TableCell>
                <TableCell>{v.motor_cc ? `${v.motor_cc.toLocaleString()} cc` : '—'}</TableCell>
                <TableCell>{v.propietario ?? '—'}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={columnas.length} align="center">
                <Typography color="text.secondary" py={3}>{isLoading ? 'Cargando…' : 'Sin vehículos registrados'}</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Alta de vehículo de flota propia (CMMS) */}
      <Dialog open={nuevoOpen} onClose={() => setNuevoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsCar sx={{ color }} /> Nuevo vehículo · Flota propia
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Código *" size="small" fullWidth value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Placa" size="small" fullWidth value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} /></Grid>
            <Grid size={{ xs: 12 }}><TextField label="Nombre / descripción *" size="small" fullWidth value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Tipo" size="small" fullWidth value={form.tipo_activo} onChange={e => setForm(f => ({ ...f, tipo_activo: e.target.value }))}>
                {['VEHICULO', 'MONTACARGAS', 'MAQUINARIA'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField label="Marca" size="small" fullWidth value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField label="Modelo" size="small" fullWidth value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField label="Año" type="number" size="small" fullWidth value={form.anio} onChange={e => setForm(f => ({ ...f, anio: e.target.value }))} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField label="N.º de ejes" type="number" size="small" fullWidth value={form.numero_ejes} onChange={e => setForm(f => ({ ...f, numero_ejes: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}><Typography fontSize={12} fontWeight={700} color="#94A3B8" mt={1}>MOTOR</Typography></Grid>
            <Grid size={{ xs: 12, sm: 5 }}><TextField label="Marca del motor" size="small" fullWidth value={form.motor_marca} onChange={e => setForm(f => ({ ...f, motor_marca: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Línea del motor" size="small" fullWidth value={form.motor_linea} onChange={e => setForm(f => ({ ...f, motor_linea: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 3 }}><TextField label="Cilindraje (cc)" type="number" size="small" fullWidth value={form.motor_cc} onChange={e => setForm(f => ({ ...f, motor_cc: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Responsable" size="small" fullWidth value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Sede" size="small" fullWidth value={form.sede} onChange={e => setForm(f => ({ ...f, sede: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNuevoOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!form.codigo || !form.nombre || mutCrear.isPending}
            onClick={() => mutCrear.mutate({
              codigo: form.codigo, nombre: form.nombre, tipo_activo: form.tipo_activo,
              placa: form.placa || undefined, marca: form.marca || undefined, modelo: form.modelo || undefined,
              anio: form.anio ? Number(form.anio) : undefined,
              numero_ejes: form.numero_ejes ? Number(form.numero_ejes) : undefined,
              motor_marca: form.motor_marca || undefined, motor_linea: form.motor_linea || undefined,
              motor_cc: form.motor_cc ? Number(form.motor_cc) : undefined,
              responsable: form.responsable || undefined, sede: form.sede || undefined,
            })}
            sx={{ bgcolor: color, '&:hover': { bgcolor: colorDark } }}>Registrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
