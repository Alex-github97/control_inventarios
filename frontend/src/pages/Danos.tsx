import React from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Skeleton
} from '@mui/material'
import { BrokenImage } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#EF4444', '#F97316', '#F59E0B', '#84CC16', '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6']

export default function Danos() {
  const { data: estadisticas, isLoading } = useQuery({
    queryKey: ['danos-estadisticas'],
    queryFn: () => apiClient.get('/danos/estadisticas').then(r => r.data),
  })
  const { data: codigos } = useQuery({
    queryKey: ['codigos-dano'],
    queryFn: () => apiClient.get('/danos/codigos').then(r => r.data),
  })

  return (
    <Layout title="Gestión de Daños">
      <Grid container spacing={2.5}>
        {/* Gráfico estadísticas */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Daños por Causa</Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (estadisticas || []).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: '#94A3B8' }}>
                  <BrokenImage sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography>Sin eventos de daño registrados</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(estadisticas || []).slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="codigo" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [v, 'Eventos']} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} name="Eventos">
                      {(estadisticas || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Costos */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Costo Total por Causa</Typography>
              {(estadisticas || []).map((e: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, pb: 1, borderBottom: '1px solid #F1F5F9' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>{e.codigo}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>{e.total} eventos</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#DC2626', fontSize: 12 }}>
                    ${(e.costo_total || 0).toLocaleString('es-CO')}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Catálogo de códigos */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Catálogo de Códigos de Daño</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Costo Prom. Reparación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(codigos || []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell><Chip label={c.codigo} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: '#FEE2E2', color: '#DC2626', fontSize: 11 }} /></TableCell>
                      <TableCell><Typography variant="body2">{c.descripcion}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ color: '#64748B' }}>{c.categoria || '—'}</Typography></TableCell>
                      <TableCell>
                        {c.costo_reparacion_promedio ? (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            ${c.costo_reparacion_promedio.toLocaleString('es-CO')}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  )
}
