import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow,
  TablePagination, Chip, Skeleton, Alert, Grid, Divider, Tooltip, alpha,
} from '@mui/material'
import {
  TrendingUp, TrendingDown, CompareArrows, Inventory2, Scale,
  FileDownload, Refresh, FilterList,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { movimientosApi, MovimientoItem } from '@/api/movimientos'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIMARY = '#32AC5C'
const TODAY = new Date().toISOString().split('T')[0]

const TIPOS_MOVIMIENTO = [
  'CARGA', 'DESCARGA', 'TRANSFERENCIA', 'RETORNO', 'RECEPCION',
  'INVENTARIO', 'REPARACION', 'BAJA', 'DISPOSICION_FINAL', 'INSPECCION',
]

const TIPO_LABELS: Record<string, string> = {
  CARGA: 'Carga',
  DESCARGA: 'Descarga',
  TRANSFERENCIA: 'Transferencia',
  RETORNO: 'Retorno',
  RECEPCION: 'Recepción',
  INVENTARIO: 'Inventario',
  REPARACION: 'Reparación',
  BAJA: 'Baja',
  DISPOSICION_FINAL: 'Disposición Final',
  INSPECCION: 'Inspección',
}

const TIPO_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  CARGA: 'success',
  RECEPCION: 'success',
  DESCARGA: 'error',
  DISPOSICION_FINAL: 'error',
  TRANSFERENCIA: 'warning',
  RETORNO: 'warning',
  BAJA: 'error',
  INVENTARIO: 'info',
  REPARACION: 'info',
  INSPECCION: 'info',
}

interface KpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  hint?: string
}

function KpiCard({ label, value, icon, color, hint }: KpiCardProps) {
  return (
    <Card sx={{ height: '100%', borderTop: `3px solid ${color}` }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
            {label}
          </Typography>
          <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ color, lineHeight: 1 }}>
          {value.toLocaleString('es-CO')}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export function EstibasInventario() {
  const [fechaInicio, setFechaInicio] = useState(TODAY)
  const [fechaFin, setFechaFin] = useState(TODAY)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [exportando, setExportando] = useState(false)

  const resumenQuery = useQuery({
    queryKey: ['movimientos-resumen', fechaInicio, fechaFin],
    queryFn: () => movimientosApi.resumen(fechaInicio || undefined, fechaFin || undefined),
  })

  const listaQuery = useQuery({
    queryKey: ['movimientos-lista', fechaInicio, fechaFin, tipoFiltro, page + 1, pageSize],
    queryFn: () =>
      movimientosApi.lista({
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        tipo: tipoFiltro || undefined,
        page: page + 1,
        page_size: pageSize,
      }),
  })

  const resumen = resumenQuery.data
  const lista = listaQuery.data

  const handleExportar = async () => {
    setExportando(true)
    try {
      await movimientosApi.exportar(
        fechaInicio || undefined,
        fechaFin || undefined,
        tipoFiltro || undefined,
      )
    } catch {
      toast.error('No se pudo generar el Excel')
    } finally {
      setExportando(false)
    }
  }

  const handleRefresh = () => {
    resumenQuery.refetch()
    listaQuery.refetch()
  }

  const totales = resumen?.totales
  const porTipo = resumen?.por_tipo ?? {}

  return (
    <Box sx={{ p: 0 }}>

      {/* Filtros */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FilterList sx={{ color: 'text.secondary' }} />
            <TextField
              label="Fecha inicio"
              type="date"
              size="small"
              value={fechaInicio}
              onChange={e => { setFechaInicio(e.target.value); setPage(0) }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 170 }}
            />
            <TextField
              label="Fecha fin"
              type="date"
              size="small"
              value={fechaFin}
              onChange={e => { setFechaFin(e.target.value); setPage(0) }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 170 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Tipo de movimiento</InputLabel>
              <Select
                value={tipoFiltro}
                label="Tipo de movimiento"
                onChange={e => { setTipoFiltro(e.target.value); setPage(0) }}
              >
                <MenuItem value="">Todos</MenuItem>
                {TIPOS_MOVIMIENTO.map(t => (
                  <MenuItem key={t} value={t}>{TIPO_LABELS[t] ?? t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Actualizar">
              <Button variant="outlined" size="small" onClick={handleRefresh} startIcon={<Refresh />}>
                Actualizar
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              size="small"
              onClick={handleExportar}
              disabled={exportando}
              startIcon={<FileDownload />}
              sx={{ bgcolor: '#1A3A6B', '&:hover': { bgcolor: '#152D54' } }}
            >
              {exportando ? 'Generando...' : 'Exportar Excel'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {resumenQuery.isLoading ? (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      ) : resumenQuery.isError ? (
        <Alert severity="error" sx={{ mb: 2.5 }}>No se pudo cargar el resumen</Alert>
      ) : totales ? (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              label="Entradas"
              value={totales.entradas}
              icon={<TrendingUp />}
              color={PRIMARY}
              hint="Carga + Recepción"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              label="Salidas"
              value={totales.salidas}
              icon={<TrendingDown />}
              color="#EF4444"
              hint="Descarga + Disposición"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              label="Transferencias"
              value={totales.transferencias}
              icon={<CompareArrows />}
              color="#F59E0B"
              hint="Transferencia + Retorno"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              label="Otros"
              value={totales.otros}
              icon={<Inventory2 />}
              color="#6B7280"
              hint="Inventario, Reparación..."
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              label="Total"
              value={totales.total}
              icon={<Inventory2 />}
              color="#1A3A6B"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              label="Balance"
              value={totales.balance}
              icon={<Scale />}
              color={totales.balance >= 0 ? PRIMARY : '#EF4444'}
              hint="Entradas − Salidas"
            />
          </Grid>
        </Grid>
      ) : null}

      {/* Desglose por tipo */}
      {Object.keys(porTipo).length > 0 && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5} color="text.secondary">
              Desglose por tipo de movimiento
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(porTipo)
                .sort((a, b) => b[1] - a[1])
                .map(([tipo, cnt]) => (
                  <Box
                    key={tipo}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.75,
                      px: 1.5, py: 0.5, borderRadius: 2,
                      bgcolor: alpha('#1A3A6B', 0.07),
                      border: '1px solid', borderColor: alpha('#1A3A6B', 0.15),
                    }}
                  >
                    <Chip
                      label={TIPO_LABELS[tipo] ?? tipo}
                      size="small"
                      color={TIPO_COLORS[tipo] ?? 'default'}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                    <Typography variant="body2" fontWeight={700}>
                      {cnt.toLocaleString('es-CO')}
                    </Typography>
                  </Box>
                ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabla de movimientos */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Detalle de movimientos
              {lista && (
                <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                  ({lista.total.toLocaleString('es-CO')} registros)
                </Typography>
              )}
            </Typography>
          </Box>
          <Divider />

          {listaQuery.isLoading ? (
            <Box sx={{ p: 2 }}>
              {[...Array(8)].map((_, i) => <Skeleton key={i} height={44} sx={{ mb: 0.5 }} />)}
            </Box>
          ) : listaQuery.isError ? (
            <Alert severity="error" sx={{ m: 2 }}>No se pudieron cargar los movimientos</Alert>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#1A3A6B', 0.04) }}>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Código Estiba</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Origen</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Destino</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Vehículo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Observaciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lista?.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No hay movimientos en el período seleccionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      lista?.items.map((m: MovimientoItem) => (
                        <TableRow key={m.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                            {format(parseISO(m.fecha), "dd/MM/yy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                              {m.estiba_codigo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={TIPO_LABELS[m.tipo] ?? m.tipo}
                              size="small"
                              color={TIPO_COLORS[m.tipo] ?? 'default'}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                            {m.ubicacion_origen ?? '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem' }}>
                            {m.ubicacion_destino ?? '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            {m.vehiculo ?? '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem' }}>
                            {m.usuario}
                          </TableCell>
                          <TableCell>
                            {m.estado_antes && m.estado_despues ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {m.estado_antes}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">→</Typography>
                                <Typography variant="caption" fontWeight={600}>
                                  {m.estado_despues}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 200 }}>
                            <Tooltip title={m.observaciones ?? ''} placement="top">
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 180 }}>
                                {m.observaciones ?? '—'}
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>

              <TablePagination
                component="div"
                count={lista?.total ?? 0}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
                rowsPerPageOptions={[25, 50, 100, 200]}
                labelRowsPerPage="Filas:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
