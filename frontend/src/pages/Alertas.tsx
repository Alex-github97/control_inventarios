import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, IconButton, Tooltip, FormControl,
  InputLabel, Select, MenuItem, Alert as MuiAlert
} from '@mui/material'
import { CheckCircle, Visibility, NotificationsActive } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const NIVEL_COLORS: Record<string, { bg: string; color: string }> = {
  INFO:        { bg: '#DBEAFE', color: '#2563EB' },
  ADVERTENCIA: { bg: '#FEF3C7', color: '#D97706' },
  CRITICA:     { bg: '#FEE2E2', color: '#DC2626' },
}

export default function Alertas() {
  const queryClient = useQueryClient()
  const [filtroResuelta, setFiltroResuelta] = useState<string>('false')
  const [filtroNivel, setFiltroNivel] = useState<string>('')

  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas', filtroResuelta, filtroNivel],
    queryFn: () => apiClient.get('/alertas', {
      params: {
        resuelta: filtroResuelta,
        ...(filtroNivel && { nivel: filtroNivel }),
        limit: 100,
      }
    }).then(r => r.data),
  })

  const resolverMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/alertas/${id}/resolver`).then(r => r.data),
    onSuccess: () => {
      toast.success('Alerta resuelta')
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-count'] })
    },
  })

  return (
    <Layout title="Alertas">
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={filtroResuelta} label="Estado" onChange={e => setFiltroResuelta(e.target.value)}>
            <MenuItem value="false">Pendientes</MenuItem>
            <MenuItem value="true">Resueltas</MenuItem>
            <MenuItem value="">Todas</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Nivel</InputLabel>
          <Select value={filtroNivel} label="Nivel" onChange={e => setFiltroNivel(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="INFO">Info</MenuItem>
            <MenuItem value="ADVERTENCIA">Advertencia</MenuItem>
            <MenuItem value="CRITICA">Crítica</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nivel</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : (alertas || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                    <NotificationsActive sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    No hay alertas
                  </TableCell>
                </TableRow>
              ) : (alertas || []).map((a: any) => {
                const nc = NIVEL_COLORS[a.nivel] || { bg: '#F1F5F9', color: '#64748B' }
                return (
                  <TableRow key={a.id} sx={{ opacity: a.resuelta ? 0.6 : 1 }}>
                    <TableCell>
                      <Chip label={a.nivel} size="small"
                        sx={{ bgcolor: nc.bg, color: nc.color, fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12, color: '#64748B' }}>
                        {a.tipo.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: a.leida ? 400 : 700 }}>{a.titulo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {a.resuelta ? (
                        <Chip label="Resuelta" size="small" sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontSize: 11 }} />
                      ) : (
                        <Chip label="Pendiente" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontSize: 11 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!a.resuelta && (
                        <Tooltip title="Resolver alerta">
                          <IconButton size="small" color="success" onClick={() => resolverMutation.mutate(a.id)}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Layout>
  )
}
