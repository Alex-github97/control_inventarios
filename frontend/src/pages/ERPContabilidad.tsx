import React, { useState } from 'react'
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material'
import {
  Add,
  AccountTree,
  Receipt,
  FilterList,
  Search,
  Settings,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import Layout from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ERP_COLOR = '#1A3A6B'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoCuenta = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'EGRESO'
type NaturalezaCuenta = 'DEBITO' | 'CREDITO'
type EstadoCuenta = 'ACTIVA' | 'INACTIVA'

interface Cuenta {
  id: number
  codigo: string
  nombre: string
  tipo: TipoCuenta
  naturaleza: NaturalezaCuenta
  nivel: number
  cuenta_padre_id?: number | null
  es_auxiliar: boolean
  estado: EstadoCuenta
}

type TipoComprobante = 'DIARIO' | 'INGRESO' | 'EGRESO' | 'AJUSTE'
type EstadoComprobante = 'BORRADOR' | 'CONTABILIZADO' | 'ANULADO'

interface LineaComprobante {
  cuenta_id: string
  debito: string
  credito: string
}

interface Comprobante {
  id: number
  numero: string
  tipo: TipoComprobante
  fecha: string
  concepto: string
  total_debito: number
  total_credito: number
  estado: EstadoComprobante
}

type TipoCentroCosto = 'OPERATIVO' | 'ADMINISTRATIVO' | 'COMERCIAL' | 'FINANCIERO'

interface CentroCosto {
  id: number
  codigo: string
  nombre: string
  tipo: TipoCentroCosto
  responsable?: string
  presupuesto_anual?: number
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

const tipoCuentaColor: Record<TipoCuenta, 'primary' | 'error' | 'secondary' | 'success' | 'warning'> = {
  ACTIVO: 'primary',
  PASIVO: 'error',
  PATRIMONIO: 'secondary',
  INGRESO: 'success',
  EGRESO: 'warning',
}

const estadoComprobanteColor: Record<EstadoComprobante, 'default' | 'success' | 'error'> = {
  BORRADOR: 'default',
  CONTABILIZADO: 'success',
  ANULADO: 'error',
}

const formatCurrency = (value?: number) =>
  value != null
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
    : '—'

// ─── New Cuenta Dialog ────────────────────────────────────────────────────────

interface NewCuentaDialogProps {
  open: boolean
  onClose: () => void
}

function NewCuentaDialog({ open, onClose }: NewCuentaDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    tipo: '' as TipoCuenta | '',
    naturaleza: '' as NaturalezaCuenta | '',
    nivel: '',
    cuenta_padre_id: '',
    es_auxiliar: false,
  })

  const mutation = useMutation({
    mutationFn: (data: object) => apiClient.post('/erp/contabilidad/cuentas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-cuentas'] })
      toast.success('Cuenta creada correctamente')
      handleClose()
    },
    onError: () => {
      toast.error('Error al crear la cuenta')
    },
  })

  const handleClose = () => {
    setForm({ codigo: '', nombre: '', tipo: '', naturaleza: '', nivel: '', cuenta_padre_id: '', es_auxiliar: false })
    onClose()
  }

  const handleSubmit = () => {
    if (!form.codigo || !form.nombre || !form.tipo || !form.naturaleza) {
      toast.error('Complete los campos obligatorios')
      return
    }
    mutation.mutate({
      ...form,
      nivel: form.nivel ? Number(form.nivel) : undefined,
      cuenta_padre_id: form.cuenta_padre_id ? Number(form.cuenta_padre_id) : null,
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: ERP_COLOR, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountTree fontSize="small" />
        Nueva Cuenta Contable
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField
              label="Código *"
              fullWidth
              size="small"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              label="Nombre *"
              fullWidth
              size="small"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo *</InputLabel>
              <Select
                label="Tipo *"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCuenta })}
              >
                {(['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'EGRESO'] as TipoCuenta[]).map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Naturaleza *</InputLabel>
              <Select
                label="Naturaleza *"
                value={form.naturaleza}
                onChange={(e) => setForm({ ...form, naturaleza: e.target.value as NaturalezaCuenta })}
              >
                <MenuItem value="DEBITO">DÉBITO</MenuItem>
                <MenuItem value="CREDITO">CRÉDITO</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Nivel"
              fullWidth
              size="small"
              type="number"
              value={form.nivel}
              onChange={(e) => setForm({ ...form, nivel: e.target.value })}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              label="ID Cuenta Padre"
              fullWidth
              size="small"
              type="number"
              value={form.cuenta_padre_id}
              onChange={(e) => setForm({ ...form, cuenta_padre_id: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="checkbox"
                id="es_auxiliar"
                checked={form.es_auxiliar}
                onChange={(e) => setForm({ ...form, es_auxiliar: e.target.checked })}
              />
              <label htmlFor="es_auxiliar" style={{ fontSize: 14, cursor: 'pointer' }}>
                Es cuenta auxiliar
              </label>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── New Comprobante Dialog ───────────────────────────────────────────────────

interface NewComprobanteDialogProps {
  open: boolean
  onClose: () => void
}

function NewComprobanteDialog({ open, onClose }: NewComprobanteDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    numero: '',
    tipo: '' as TipoComprobante | '',
    fecha: '',
    concepto: '',
  })
  const [lineas, setLineas] = useState<LineaComprobante[]>([
    { cuenta_id: '', debito: '', credito: '' },
    { cuenta_id: '', debito: '', credito: '' },
  ])

  const totalDebito = lineas.reduce((s, l) => s + (parseFloat(l.debito) || 0), 0)
  const totalCredito = lineas.reduce((s, l) => s + (parseFloat(l.credito) || 0), 0)
  const balanced = Math.abs(totalDebito - totalCredito) < 0.01

  const mutation = useMutation({
    mutationFn: (data: object) => apiClient.post('/erp/contabilidad/comprobantes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-comprobantes'] })
      toast.success('Comprobante creado correctamente')
      handleClose()
    },
    onError: () => {
      toast.error('Error al crear el comprobante')
    },
  })

  const handleClose = () => {
    setForm({ numero: '', tipo: '', fecha: '', concepto: '' })
    setLineas([
      { cuenta_id: '', debito: '', credito: '' },
      { cuenta_id: '', debito: '', credito: '' },
    ])
    onClose()
  }

  const updateLinea = (index: number, field: keyof LineaComprobante, value: string) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  const addLinea = () => {
    setLineas((prev) => [...prev, { cuenta_id: '', debito: '', credito: '' }])
  }

  const handleSubmit = () => {
    if (!form.numero || !form.tipo || !form.fecha || !form.concepto) {
      toast.error('Complete los campos obligatorios')
      return
    }
    if (!balanced) {
      toast.error('El comprobante no está cuadrado: débito ≠ crédito')
      return
    }
    mutation.mutate({
      ...form,
      lineas: lineas
        .filter((l) => l.cuenta_id)
        .map((l) => ({
          cuenta_id: Number(l.cuenta_id),
          debito: parseFloat(l.debito) || 0,
          credito: parseFloat(l.credito) || 0,
        })),
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: ERP_COLOR, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt fontSize="small" />
        Nuevo Comprobante Contable
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <TextField
              label="Número *"
              fullWidth
              size="small"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
            />
          </Grid>
          <Grid item xs={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo *</InputLabel>
              <Select
                label="Tipo *"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoComprobante })}
              >
                {(['DIARIO', 'INGRESO', 'EGRESO', 'AJUSTE'] as TipoComprobante[]).map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Fecha *"
              fullWidth
              size="small"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Concepto *"
              fullWidth
              size="small"
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Líneas del comprobante
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.06) }}>
              <TableCell>ID Cuenta</TableCell>
              <TableCell align="right">Débito</TableCell>
              <TableCell align="right">Crédito</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineas.map((linea, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="ID cuenta"
                    value={linea.cuenta_id}
                    onChange={(e) => updateLinea(idx, 'cuenta_id', e.target.value)}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    placeholder="0"
                    type="number"
                    value={linea.debito}
                    onChange={(e) => updateLinea(idx, 'debito', e.target.value)}
                    sx={{ width: 140 }}
                    inputProps={{ style: { textAlign: 'right' } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    placeholder="0"
                    type="number"
                    value={linea.credito}
                    onChange={(e) => updateLinea(idx, 'credito', e.target.value)}
                    sx={{ width: 140 }}
                    inputProps={{ style: { textAlign: 'right' } }}
                  />
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>
                <Button size="small" startIcon={<Add />} onClick={addLinea} sx={{ color: ERP_COLOR }}>
                  Agregar línea
                </Button>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700}>
                  {formatCurrency(totalDebito)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700}>
                  {formatCurrency(totalCredito)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: balanced ? alpha('#22c55e', 0.08) : alpha('#ef4444', 0.08), border: `1px solid ${balanced ? '#22c55e' : '#ef4444'}` }}>
          <Typography variant="caption" sx={{ color: balanced ? '#15803d' : '#dc2626', fontWeight: 600 }}>
            {balanced
              ? 'Comprobante cuadrado: débito = crédito'
              : `Diferencia: ${formatCurrency(Math.abs(totalDebito - totalCredito))} — El comprobante debe cuadrar antes de guardar`}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending || !balanced}
          sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── New Centro de Costo Dialog ───────────────────────────────────────────────

interface NewCCDialogProps {
  open: boolean
  onClose: () => void
}

function NewCentroCostoDialog({ open, onClose }: NewCCDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    tipo: '' as TipoCentroCosto | '',
    responsable: '',
    presupuesto_anual: '',
  })

  const mutation = useMutation({
    mutationFn: (data: object) => apiClient.post('/erp/contabilidad/centros-costo', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-centros-costo'] })
      toast.success('Centro de costo creado correctamente')
      handleClose()
    },
    onError: () => {
      toast.error('Error al crear el centro de costo')
    },
  })

  const handleClose = () => {
    setForm({ codigo: '', nombre: '', tipo: '', responsable: '', presupuesto_anual: '' })
    onClose()
  }

  const handleSubmit = () => {
    if (!form.codigo || !form.nombre || !form.tipo) {
      toast.error('Complete los campos obligatorios')
      return
    }
    mutation.mutate({
      ...form,
      presupuesto_anual: form.presupuesto_anual ? Number(form.presupuesto_anual) : undefined,
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: ERP_COLOR, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings fontSize="small" />
        Nuevo Centro de Costo
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField
              label="Código *"
              fullWidth
              size="small"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              label="Nombre *"
              fullWidth
              size="small"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo *</InputLabel>
              <Select
                label="Tipo *"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCentroCosto })}
              >
                {(['OPERATIVO', 'ADMINISTRATIVO', 'COMERCIAL', 'FINANCIERO'] as TipoCentroCosto[]).map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Responsable"
              fullWidth
              size="small"
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Presupuesto Anual"
              fullWidth
              size="small"
              type="number"
              value={form.presupuesto_anual}
              onChange={(e) => setForm({ ...form, presupuesto_anual: e.target.value })}
              InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography> }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ERPContabilidad() {
  const [tabValue, setTabValue] = useState(0)
  const [openNewCuenta, setOpenNewCuenta] = useState(false)
  const [openNewComprobante, setOpenNewComprobante] = useState(false)
  const [openNewCC, setOpenNewCC] = useState(false)
  const [searchCuenta, setSearchCuenta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')

  const { data: cuentas, isLoading: loadingCuentas } = useQuery<Cuenta[]>({
    queryKey: ['erp-cuentas'],
    queryFn: () => apiClient.get('/erp/contabilidad/cuentas').then((r) => r.data),
  })

  const { data: comprobantes, isLoading: loadingComprobantes } = useQuery<Comprobante[]>({
    queryKey: ['erp-comprobantes'],
    queryFn: () => apiClient.get('/erp/contabilidad/comprobantes').then((r) => r.data),
  })

  const { data: centrosCosto, isLoading: loadingCC } = useQuery<CentroCosto[]>({
    queryKey: ['erp-centros-costo'],
    queryFn: () => apiClient.get('/erp/contabilidad/centros-costo').then((r) => r.data),
  })

  const filteredCuentas = (cuentas ?? []).filter((c) => {
    const matchSearch =
      !searchCuenta ||
      c.codigo.toLowerCase().includes(searchCuenta.toLowerCase()) ||
      c.nombre.toLowerCase().includes(searchCuenta.toLowerCase())
    const matchTipo = !filtroTipo || c.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  const filteredComprobantes = (comprobantes ?? []).filter((c) => {
    const matchPeriodo = !filtroPeriodo || c.fecha?.startsWith(filtroPeriodo)
    const matchTipo = !filtroTipo || c.tipo === filtroTipo
    return matchPeriodo && matchTipo
  })

  return (
    <Layout title="ERP — Contabilidad General">
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: ERP_COLOR,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AccountTree sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: ERP_COLOR, lineHeight: 1.2 }}>
                Contabilidad General
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Plan de cuentas, comprobantes y centros de costo
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Configuración contable">
            <IconButton sx={{ color: ERP_COLOR }}>
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tabs */}
        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(ERP_COLOR, 0.03) }}>
            <Tabs
              value={tabValue}
              onChange={(_, v) => { setTabValue(v); setFiltroTipo(''); setSearchCuenta(''); setFiltroPeriodo('') }}
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 },
                '& .Mui-selected': { color: ERP_COLOR },
                '& .MuiTabs-indicator': { bgcolor: ERP_COLOR },
                px: 2,
              }}
            >
              <Tab label="Plan de Cuentas" icon={<AccountTree fontSize="small" />} iconPosition="start" />
              <Tab label="Comprobantes" icon={<Receipt fontSize="small" />} iconPosition="start" />
              <Tab label="Centros de Costo" icon={<Settings fontSize="small" />} iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>

            {/* ── TAB 0: Plan de Cuentas ─────────────────────────────────────── */}
            {tabValue === 0 && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Buscar código o nombre..."
                    value={searchCuenta}
                    onChange={(e) => setSearchCuenta(e.target.value)}
                    InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
                    sx={{ width: 260 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FilterList fontSize="small" /> Tipo
                      </Box>
                    </InputLabel>
                    <Select
                      label="Tipo"
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {(['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'EGRESO'] as TipoCuenta[]).map((t) => (
                        <MenuItem key={t} value={t}>{t}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ ml: 'auto' }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setOpenNewCuenta(true)}
                      sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
                    >
                      Nueva Cuenta
                    </Button>
                  </Box>
                </Box>

                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.06) }}>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Código</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Naturaleza</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="center">Nivel</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="center">Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingCuentas
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((__, j) => (
                              <TableCell key={j}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : filteredCuentas.length === 0
                      ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No se encontraron cuentas
                            </TableCell>
                          </TableRow>
                        )
                      : filteredCuentas.map((cuenta) => (
                          <TableRow key={cuenta.id} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{cuenta.codigo}</TableCell>
                            <TableCell>{cuenta.nombre}</TableCell>
                            <TableCell>
                              <Chip
                                label={cuenta.tipo}
                                size="small"
                                color={tipoCuentaColor[cuenta.tipo]}
                                sx={{ fontWeight: 600, fontSize: 11 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {cuenta.naturaleza}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{cuenta.nivel ?? '—'}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={cuenta.estado}
                                size="small"
                                color={cuenta.estado === 'ACTIVA' ? 'success' : 'default'}
                                variant="outlined"
                                sx={{ fontSize: 11 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </>
            )}

            {/* ── TAB 1: Comprobantes ────────────────────────────────────────── */}
            {tabValue === 1 && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Período (YYYY-MM)"
                    placeholder="2026-06"
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value)}
                    sx={{ width: 180 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      label="Tipo"
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {(['DIARIO', 'INGRESO', 'EGRESO', 'AJUSTE'] as TipoComprobante[]).map((t) => (
                        <MenuItem key={t} value={t}>{t}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ ml: 'auto' }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setOpenNewComprobante(true)}
                      sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
                    >
                      Nuevo Comprobante
                    </Button>
                  </Box>
                </Box>

                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.06) }}>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Número</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Concepto</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="right">Débito</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="right">Crédito</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="center">Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingComprobantes
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((__, j) => (
                              <TableCell key={j}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : filteredComprobantes.length === 0
                      ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No se encontraron comprobantes
                            </TableCell>
                          </TableRow>
                        )
                      : filteredComprobantes.map((comp) => (
                          <TableRow key={comp.id} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{comp.numero}</TableCell>
                            <TableCell>
                              <Chip label={comp.tipo} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                            </TableCell>
                            <TableCell>{comp.fecha}</TableCell>
                            <TableCell sx={{ maxWidth: 200 }}>
                              <Typography variant="body2" noWrap>{comp.concepto}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {formatCurrency(comp.total_debito)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {formatCurrency(comp.total_credito)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={comp.estado}
                                size="small"
                                color={estadoComprobanteColor[comp.estado]}
                                sx={{ fontSize: 11, fontWeight: 600 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </>
            )}

            {/* ── TAB 2: Centros de Costo ────────────────────────────────────── */}
            {tabValue === 2 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenNewCC(true)}
                    sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
                  >
                    Nuevo Centro
                  </Button>
                </Box>

                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.06) }}>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Código</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>Responsable</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="right">Presupuesto Anual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingCC
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 5 }).map((__, j) => (
                              <TableCell key={j}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : (centrosCosto ?? []).length === 0
                      ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No hay centros de costo registrados
                            </TableCell>
                          </TableRow>
                        )
                      : (centrosCosto ?? []).map((cc) => (
                          <TableRow key={cc.id} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{cc.codigo}</TableCell>
                            <TableCell>{cc.nombre}</TableCell>
                            <TableCell>
                              <Chip label={cc.tipo} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                            </TableCell>
                            <TableCell>{cc.responsable ?? '—'}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {formatCurrency(cc.presupuesto_anual)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Box>
        </Card>
      </Box>

      {/* Dialogs */}
      <NewCuentaDialog open={openNewCuenta} onClose={() => setOpenNewCuenta(false)} />
      <NewComprobanteDialog open={openNewComprobante} onClose={() => setOpenNewComprobante(false)} />
      <NewCentroCostoDialog open={openNewCC} onClose={() => setOpenNewCC(false)} />
    </Layout>
  )
}
