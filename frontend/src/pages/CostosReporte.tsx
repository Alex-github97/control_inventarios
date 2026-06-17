import React, { useState } from 'react'
import {
  Box, Card, Typography, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Skeleton, Grid, FormControl, InputLabel, Select,
  MenuItem, Chip, alpha, TablePagination,
} from '@mui/material'
import { FilterList, AttachMoney } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

const PRIMARY = '#32AC5C'

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const TIPOS_PROPIETARIO = ['PROPIA', 'ALQUILADA']
const ESTADOS = ['DISPONIBLE', 'EN_INVENTARIO', 'EN_TRANSITO', 'EN_CLIENTE', 'PENDIENTE_RETORNO', 'DANADA', 'EN_REPARACION']
const TIPOS_MANT = ['PREVENTIVO', 'CORRECTIVO', 'REPARACION', 'INSPECCION', 'LIMPIEZA', 'PINTURA', 'REFUERZO']

export default function CostosReporte() {
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterPropietario, setFilterPropietario] = useState('')

  const params: Record<string, string | number> = { page: page + 1, page_size: pageSize }
  if (filterTipo) params.tipo = filterTipo
  if (filterEstado) params.estado = filterEstado
  if (filterPropietario) params.tipo_propietario = filterPropietario

  const { data, isLoading } = useQuery({
    queryKey: ['costos-reporte', params],
    queryFn: () => apiClient.get('/mantenimientos/reporte-costos', { params }).then(r => r.data),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalCostos = data?.total_costos_acumulados ?? 0

  return (
    <Layout title="Costos por Estiba">
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Costo total acumulado de mantenimiento por estiba
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { label: 'Total estibas con costos', value: total, fmt: (v: number) => v.toLocaleString() },
          { label: 'Costos acumulados totales', value: totalCostos, fmt: formatCOP },
        ].map(k => (
          <Grid item xs={12} sm={6} key={k.label}>
            <Card sx={{ p: 2, border: `1px solid ${alpha(PRIMARY, 0.2)}`, borderLeft: `4px solid ${PRIMARY}`, borderRadius: '12px' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                {k.label}
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#1E293B' }}>
                {isLoading ? '—' : k.fmt(k.value)}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterList sx={{ color: '#94A3B8', fontSize: 20 }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tipo mantenimiento</InputLabel>
            <Select value={filterTipo} label="Tipo mantenimiento" onChange={e => { setFilterTipo(e.target.value); setPage(0) }}>
              <MenuItem value="">Todos</MenuItem>
              {TIPOS_MANT.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado estiba</InputLabel>
            <Select value={filterEstado} label="Estado estiba" onChange={e => { setFilterEstado(e.target.value); setPage(0) }}>
              <MenuItem value="">Todos</MenuItem>
              {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Propietario</InputLabel>
            <Select value={filterPropietario} label="Propietario" onChange={e => { setFilterPropietario(e.target.value); setPage(0) }}>
              <MenuItem value="">Todos</MenuItem>
              {TIPOS_PROPIETARIO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Tabla */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Propietario</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="center">Nº mantenimientos</TableCell>
                <TableCell align="right">Costo total acumulado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, color: '#94A3B8' }}>
                    <AttachMoney sx={{ fontSize: 40, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    Sin datos con los filtros seleccionados
                  </TableCell>
                </TableRow>
              ) : items.map((row: any) => (
                <TableRow key={row.estiba_id} hover>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                      {row.codigo_interno || `#${row.estiba_id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.estado?.replace(/_/g, ' ') || '—'} size="small"
                      sx={{ fontSize: 10, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {row.tipo_propietario || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {row.tipo || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={row.cantidad_mantenimientos} size="small"
                      sx={{ bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: row.total_costo_mantenimiento > 0 ? '#1E293B' : '#94A3B8' }}>
                      {formatCOP(row.total_costo_mantenimiento)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={pageSize}
          rowsPerPageOptions={[20]} onPageChange={(_, p) => setPage(p)}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Card>
    </Layout>
  )
}
