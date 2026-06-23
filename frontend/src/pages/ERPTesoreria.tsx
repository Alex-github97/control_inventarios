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
  alpha,
  Divider,
} from '@mui/material'
import Add from '@mui/icons-material/Add'
import AccountBalance from '@mui/icons-material/AccountBalance'
import SwapHoriz from '@mui/icons-material/SwapHoriz'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Pending from '@mui/icons-material/Pending'
import CurrencyExchange from '@mui/icons-material/CurrencyExchange'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const ERP_COLOR = '#1A3A6B'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Banco {
  id: number
  nombre: string
  codigo: string
  swift: string | null
  pais: string | null
}

interface CuentaBancaria {
  id: number
  banco_id: number
  banco_nombre?: string
  numero: string
  tipo: 'CORRIENTE' | 'AHORROS' | 'FIDUCIA' | 'CDT'
  moneda: 'COP' | 'USD' | 'EUR'
  saldo_contable: number
  saldo_disponible: number
}

interface Movimiento {
  id: number
  cuenta_id: number
  cuenta_numero?: string
  fecha: string
  tipo: 'CREDITO' | 'DEBITO'
  concepto: string
  monto: number
  conciliado: boolean
  referencia: string | null
}

// ─── Empty form objects ───────────────────────────────────────────────────────

const EMPTY_BANCO = {
  nombre: '',
  codigo: '',
  swift: '',
  pais: '',
}

const EMPTY_CUENTA = {
  banco_id: '',
  numero: '',
  tipo: '',
  moneda: 'COP',
}

const EMPTY_MOVIMIENTO = {
  cuenta_id: '',
  fecha: '',
  tipo: '',
  monto: '',
  concepto: '',
  referencia: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('es-CO')
  } catch {
    return d
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ERPTesoreria() {
  const queryClient = useQueryClient()

  // ── Tab state
  const [tabValue, setTabValue] = useState(0)

  // ── Dialog state
  const [openNewBanco, setOpenNewBanco]               = useState(false)
  const [openNewCuenta, setOpenNewCuenta]             = useState(false)
  const [openNewMovimiento, setOpenNewMovimiento]     = useState(false)

  // ── Form state
  const [bancoForm, setBancoForm]               = useState({ ...EMPTY_BANCO })
  const [cuentaForm, setCuentaForm]             = useState({ ...EMPTY_CUENTA })
  const [movimientoForm, setMovimientoForm]     = useState({ ...EMPTY_MOVIMIENTO })

  // ── Filter state
  const [filterCuenta, setFilterCuenta]         = useState('')
  const [filterConciliado, setFilterConciliado] = useState<'' | 'true' | 'false'>('')

  // ── Queries ─────────────────────────────────────────────────────────────────

  const bancosQuery = useQuery<Banco[]>({
    queryKey: ['erp-tesoreria-bancos'],
    queryFn: async () => {
      const res = await api.get('/erp/tesoreria/bancos')
      return res.data
    },
  })

  const cuentasQuery = useQuery<CuentaBancaria[]>({
    queryKey: ['erp-tesoreria-cuentas'],
    queryFn: async () => {
      const res = await api.get('/erp/tesoreria/cuentas')
      return res.data
    },
  })

  const movimientosQuery = useQuery<Movimiento[]>({
    queryKey: ['erp-tesoreria-movimientos', filterCuenta, filterConciliado],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filterCuenta) params.cuenta_id = filterCuenta
      if (filterConciliado !== '') params.conciliado = filterConciliado
      const res = await api.get('/erp/tesoreria/movimientos', { params })
      return res.data
    },
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const mutCrearBanco = useMutation({
    mutationFn: (data: typeof EMPTY_BANCO) => api.post('/erp/tesoreria/bancos', data),
    onSuccess: () => {
      toast.success('Banco creado exitosamente')
      setOpenNewBanco(false)
      setBancoForm({ ...EMPTY_BANCO })
      queryClient.invalidateQueries({ queryKey: ['erp-tesoreria-bancos'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Error al crear el banco')
    },
  })

  const mutCrearCuenta = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/erp/tesoreria/cuentas', data),
    onSuccess: () => {
      toast.success('Cuenta bancaria creada exitosamente')
      setOpenNewCuenta(false)
      setCuentaForm({ ...EMPTY_CUENTA })
      queryClient.invalidateQueries({ queryKey: ['erp-tesoreria-cuentas'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Error al crear la cuenta')
    },
  })

  const mutCrearMovimiento = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/erp/tesoreria/movimientos', data),
    onSuccess: () => {
      toast.success('Movimiento registrado exitosamente')
      setOpenNewMovimiento(false)
      setMovimientoForm({ ...EMPTY_MOVIMIENTO })
      queryClient.invalidateQueries({ queryKey: ['erp-tesoreria-movimientos'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Error al registrar el movimiento')
    },
  })

  // ── Derived data ─────────────────────────────────────────────────────────────

  const bancos     = bancosQuery.data ?? []
  const cuentas    = cuentasQuery.data ?? []
  const movimientos = movimientosQuery.data ?? []

  const saldoTotal = cuentas.reduce((sum, c) => sum + (c.saldo_disponible ?? 0), 0)
  const cuentasActivas = cuentas.length
  const sinConciliar = movimientos.filter((m) => !m.conciliado).length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Layout title="ERP — Tesorería">
      <Box sx={{ p: 3, bgcolor: '#F0F4F8', minHeight: '100vh' }}>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <AccountBalance sx={{ color: ERP_COLOR, fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color={ERP_COLOR}>
              Tesorería y Gestión Bancaria
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Control de cuentas, movimientos y conciliación bancaria
            </Typography>
          </Box>
        </Box>

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Saldo Total */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ p: 2.5, borderLeft: `4px solid ${ERP_COLOR}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CurrencyExchange sx={{ color: ERP_COLOR, fontSize: 28 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Saldo Total Disponible
                  </Typography>
                  {cuentasQuery.isLoading ? (
                    <Skeleton variant="text" width={160} height={36} />
                  ) : (
                    <Typography variant="h6" fontWeight={800} color={ERP_COLOR}>
                      {formatCurrency(saldoTotal)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Cuentas Activas */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ p: 2.5, borderLeft: `4px solid #0F6CBD` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AccountBalance sx={{ color: '#0F6CBD', fontSize: 28 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Cuentas Activas
                  </Typography>
                  {cuentasQuery.isLoading ? (
                    <Skeleton variant="text" width={60} height={36} />
                  ) : (
                    <Typography variant="h6" fontWeight={800} color="#0F6CBD">
                      {cuentasActivas}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Sin conciliar */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card
              sx={{
                p: 2.5,
                borderLeft: `4px solid ${sinConciliar > 0 ? '#D97706' : '#16A34A'}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {sinConciliar > 0 ? (
                  <Pending sx={{ color: '#D97706', fontSize: 28 }} />
                ) : (
                  <CheckCircle sx={{ color: '#16A34A', fontSize: 28 }} />
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Movimientos sin Conciliar
                  </Typography>
                  {movimientosQuery.isLoading ? (
                    <Skeleton variant="text" width={60} height={36} />
                  ) : (
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      color={sinConciliar > 0 ? '#D97706' : '#16A34A'}
                    >
                      {sinConciliar}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': { bgcolor: ERP_COLOR },
          }}
        >
          {['Cuentas Bancarias', 'Movimientos', 'Bancos'].map((label) => (
            <Tab
              key={label}
              label={label}
              sx={{ textTransform: 'none', fontWeight: 600, '&.Mui-selected': { color: ERP_COLOR } }}
            />
          ))}
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 0 — Cuentas Bancarias                                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tabValue === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenNewCuenta(true)}
                sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D56' } }}
              >
                Nueva Cuenta
              </Button>
            </Box>

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.07) }}>
                      {['Banco', 'Número', 'Tipo', 'Moneda', 'Saldo Contable', 'Saldo Disponible'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cuentasQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((__, ci) => (
                              <TableCell key={ci}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : cuentas.map((cuenta) => {
                          const banco = bancos.find((b) => b.id === cuenta.banco_id)
                          return (
                            <TableRow key={cuenta.id} hover>
                              <TableCell sx={{ fontWeight: 500 }}>
                                {cuenta.banco_nombre ?? banco?.nombre ?? `Banco #${cuenta.banco_id}`}
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>
                                {cuenta.numero}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={cuenta.tipo}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(ERP_COLOR, 0.1),
                                    color: ERP_COLOR,
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={cuenta.moneda}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  color={cuenta.saldo_contable >= 0 ? 'success.main' : 'error.main'}
                                >
                                  {formatCurrency(cuenta.saldo_contable, cuenta.moneda)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  color={cuenta.saldo_disponible >= 0 ? 'success.dark' : 'error.main'}
                                >
                                  {formatCurrency(cuenta.saldo_disponible, cuenta.moneda)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    {!cuentasQuery.isLoading && cuentas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary" py={3}>
                            Sin cuentas registradas. Cree la primera cuenta bancaria.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — Movimientos                                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tabValue === 1 && (
          <Box>
            {/* Filter bar */}
            <Card sx={{ mb: 2 }}>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Cuenta</InputLabel>
                      <Select
                        label="Cuenta"
                        value={filterCuenta}
                        onChange={(e) => setFilterCuenta(e.target.value)}
                      >
                        <MenuItem value="">Todas las cuentas</MenuItem>
                        {cuentas.map((c) => (
                          <MenuItem key={c.id} value={String(c.id)}>
                            {c.numero}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Conciliado</InputLabel>
                      <Select
                        label="Conciliado"
                        value={filterConciliado}
                        onChange={(e) => setFilterConciliado(e.target.value as '' | 'true' | 'false')}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="true">Conciliados</MenuItem>
                        <MenuItem value="false">Sin conciliar</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setOpenNewMovimiento(true)}
                      sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D56' } }}
                    >
                      Registrar Movimiento
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Card>

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.07) }}>
                      {['Fecha', 'Tipo', 'Concepto', 'Monto', 'Conciliado', 'Referencia'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movimientosQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((__, ci) => (
                              <TableCell key={ci}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : movimientos.map((mov) => {
                          const cuenta = cuentas.find((c) => c.id === mov.cuenta_id)
                          return (
                            <TableRow key={mov.id} hover>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {formatDate(mov.fecha)}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={mov.tipo}
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    bgcolor: mov.tipo === 'CREDITO'
                                      ? alpha('#16A34A', 0.12)
                                      : alpha('#DC2626', 0.12),
                                    color: mov.tipo === 'CREDITO' ? '#15803D' : '#DC2626',
                                  }}
                                />
                              </TableCell>
                              <TableCell>{mov.concepto}</TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  color={mov.tipo === 'CREDITO' ? 'success.main' : 'error.main'}
                                >
                                  {mov.tipo === 'DEBITO' ? '−' : '+'}
                                  {formatCurrency(mov.monto, cuenta?.moneda ?? 'COP')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {mov.conciliado ? (
                                  <CheckCircle sx={{ color: '#16A34A', fontSize: 18 }} />
                                ) : (
                                  <Pending sx={{ color: '#D97706', fontSize: 18 }} />
                                )}
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {mov.referencia ?? '—'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    {!movimientosQuery.isLoading && movimientos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary" py={3}>
                            Sin movimientos para los filtros seleccionados.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 — Bancos                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tabValue === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenNewBanco(true)}
                sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D56' } }}
              >
                Nuevo Banco
              </Button>
            </Box>

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.07) }}>
                      {['Nombre', 'Código', 'SWIFT', 'País'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bancosQuery.isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 4 }).map((__, ci) => (
                              <TableCell key={ci}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : bancos.map((banco) => (
                          <TableRow key={banco.id} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{banco.nombre}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{banco.codigo || '—'}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                              {banco.swift ?? '—'}
                            </TableCell>
                            <TableCell>{banco.pais ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                    {!bancosQuery.isLoading && bancos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography color="text.secondary" py={3}>
                            Sin bancos registrados. Agregue el primer banco.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Nueva Cuenta Bancaria                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openNewCuenta}
          onClose={() => { setOpenNewCuenta(false); setCuentaForm({ ...EMPTY_CUENTA }) }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Cuenta Bancaria</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Banco</InputLabel>
                <Select
                  label="Banco"
                  value={cuentaForm.banco_id}
                  onChange={(e) => setCuentaForm((f) => ({ ...f, banco_id: e.target.value }))}
                >
                  <MenuItem value="">Seleccionar banco...</MenuItem>
                  {bancos.map((b) => (
                    <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Número de cuenta"
                required
                value={cuentaForm.numero}
                onChange={(e) => setCuentaForm((f) => ({ ...f, numero: e.target.value }))}
              />
              <FormControl fullWidth size="small" required>
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={cuentaForm.tipo}
                  onChange={(e) => setCuentaForm((f) => ({ ...f, tipo: e.target.value }))}
                >
                  <MenuItem value="">Seleccionar tipo...</MenuItem>
                  {['CORRIENTE', 'AHORROS', 'FIDUCIA', 'CDT'].map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Moneda</InputLabel>
                <Select
                  label="Moneda"
                  value={cuentaForm.moneda}
                  onChange={(e) => setCuentaForm((f) => ({ ...f, moneda: e.target.value }))}
                >
                  {['COP', 'USD', 'EUR'].map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenNewCuenta(false); setCuentaForm({ ...EMPTY_CUENTA }) }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={mutCrearCuenta.isPending}
              onClick={() =>
                mutCrearCuenta.mutate({
                  banco_id: cuentaForm.banco_id,
                  numero: cuentaForm.numero,
                  tipo: cuentaForm.tipo,
                  moneda: cuentaForm.moneda,
                })
              }
              sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D56' } }}
            >
              {mutCrearCuenta.isPending ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Registrar Movimiento                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openNewMovimiento}
          onClose={() => { setOpenNewMovimiento(false); setMovimientoForm({ ...EMPTY_MOVIMIENTO }) }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SwapHoriz sx={{ color: ERP_COLOR }} />
              Registrar Movimiento
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Cuenta</InputLabel>
                <Select
                  label="Cuenta"
                  value={movimientoForm.cuenta_id}
                  onChange={(e) => setMovimientoForm((f) => ({ ...f, cuenta_id: e.target.value }))}
                >
                  <MenuItem value="">Seleccionar cuenta...</MenuItem>
                  {cuentas.map((c) => {
                    const banco = bancos.find((b) => b.id === c.banco_id)
                    return (
                      <MenuItem key={c.id} value={String(c.id)}>
                        {c.numero} {banco ? `— ${banco.nombre}` : ''}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Fecha"
                type="date"
                required
                InputLabelProps={{ shrink: true }}
                value={movimientoForm.fecha}
                onChange={(e) => setMovimientoForm((f) => ({ ...f, fecha: e.target.value }))}
              />
              <FormControl fullWidth size="small" required>
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={movimientoForm.tipo}
                  onChange={(e) => setMovimientoForm((f) => ({ ...f, tipo: e.target.value }))}
                >
                  <MenuItem value="">Seleccionar tipo...</MenuItem>
                  <MenuItem value="CREDITO">CREDITO — Ingreso</MenuItem>
                  <MenuItem value="DEBITO">DEBITO — Egreso</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Monto"
                type="number"
                required
                value={movimientoForm.monto}
                onChange={(e) => setMovimientoForm((f) => ({ ...f, monto: e.target.value }))}
              />
              <TextField
                fullWidth
                size="small"
                label="Concepto"
                required
                value={movimientoForm.concepto}
                onChange={(e) => setMovimientoForm((f) => ({ ...f, concepto: e.target.value }))}
              />
              <TextField
                fullWidth
                size="small"
                label="Referencia (opcional)"
                value={movimientoForm.referencia}
                onChange={(e) => setMovimientoForm((f) => ({ ...f, referencia: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenNewMovimiento(false); setMovimientoForm({ ...EMPTY_MOVIMIENTO }) }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={mutCrearMovimiento.isPending}
              onClick={() =>
                mutCrearMovimiento.mutate({
                  cuenta_id: movimientoForm.cuenta_id,
                  fecha: movimientoForm.fecha,
                  tipo: movimientoForm.tipo,
                  monto: parseFloat(movimientoForm.monto) || 0,
                  concepto: movimientoForm.concepto,
                  referencia: movimientoForm.referencia || undefined,
                })
              }
              sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D56' } }}
            >
              {mutCrearMovimiento.isPending ? 'Registrando...' : 'Registrar movimiento'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Nuevo Banco                                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openNewBanco}
          onClose={() => { setOpenNewBanco(false); setBancoForm({ ...EMPTY_BANCO }) }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Banco</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Nombre del banco"
                required
                value={bancoForm.nombre}
                onChange={(e) => setBancoForm((f) => ({ ...f, nombre: e.target.value }))}
              />
              <Divider />
              <TextField
                fullWidth
                size="small"
                label="Código (opcional)"
                value={bancoForm.codigo}
                onChange={(e) => setBancoForm((f) => ({ ...f, codigo: e.target.value }))}
              />
              <TextField
                fullWidth
                size="small"
                label="SWIFT (opcional)"
                value={bancoForm.swift}
                onChange={(e) => setBancoForm((f) => ({ ...f, swift: e.target.value }))}
              />
              <TextField
                fullWidth
                size="small"
                label="País (opcional)"
                value={bancoForm.pais}
                onChange={(e) => setBancoForm((f) => ({ ...f, pais: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenNewBanco(false); setBancoForm({ ...EMPTY_BANCO }) }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={mutCrearBanco.isPending}
              onClick={() => mutCrearBanco.mutate(bancoForm)}
              sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D56' } }}
            >
              {mutCrearBanco.isPending ? 'Creando...' : 'Crear banco'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Layout>
  )
}
