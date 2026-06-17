import React from 'react'
import {
  Box, Card, Typography, Chip, Grid, CircularProgress, alpha,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
} from '@mui/material'
import { Check, Close, AdminPanelSettings } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

const PRIMARY = '#32AC5C'

const ROL_COLORS: Record<string, string> = {
  ADMINISTRADOR: '#EF4444',
  SUPERVISOR_LOGISTICO: '#F59E0B',
  OPERADOR_BODEGA: '#3B82F6',
  AUDITOR: '#8B5CF6',
  CONSULTA: '#64748B',
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', estibas: 'Estibas', movimientos: 'Movimientos',
  trazabilidad: 'Trazabilidad', manifiestos: 'Manifiestos', vehiculos: 'Vehículos',
  ubicaciones: 'Ubicaciones', proveedores: 'Proveedores', danos: 'Daños',
  alertas: 'Alertas', usuarios: 'Usuarios', mantenimiento: 'Mantenimiento', costos: 'Costos',
}

const MODULES = Object.keys(MODULE_LABELS)

export default function Roles() {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles-info'],
    queryFn: () => apiClient.get('/usuarios/roles-info').then(r => r.data),
  })

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
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Matriz de acceso por módulo para cada rol del sistema
        </Typography>
      </Box>

      {/* Tarjetas resumen */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {roles.map((rol: any) => (
          <Grid item xs={12} sm={6} md={4} key={rol.rol}>
            <Card sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${alpha(ROL_COLORS[rol.rol] || '#64748B', 0.2)}`, borderTop: `4px solid ${ROL_COLORS[rol.rol] || '#64748B'}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AdminPanelSettings sx={{ color: ROL_COLORS[rol.rol] || '#64748B', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{rol.label}</Typography>
              </Box>
              <Typography sx={{ fontSize: 12, color: '#64748B', mb: 1.5 }}>{rol.descripcion}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(rol.modulos as Record<string, boolean>)
                  .filter(([, v]) => v)
                  .map(([mod]) => (
                    <Chip key={mod} label={MODULE_LABELS[mod] || mod} size="small"
                      sx={{ fontSize: 9, height: 18, bgcolor: alpha(ROL_COLORS[rol.rol] || '#64748B', 0.1), color: ROL_COLORS[rol.rol] || '#64748B', fontWeight: 700 }} />
                  ))}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Matriz completa */}
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
                  <TableCell key={rol.rol} align="center" sx={{ fontWeight: 700, minWidth: 120 }}>
                    <Chip label={rol.label} size="small"
                      sx={{ bgcolor: alpha(ROL_COLORS[rol.rol] || '#64748B', 0.12), color: ROL_COLORS[rol.rol] || '#64748B', fontWeight: 700, fontSize: 10 }} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {MODULES.map(mod => (
                <TableRow key={mod} hover>
                  <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                    {MODULE_LABELS[mod]}
                  </TableCell>
                  {roles.map((rol: any) => {
                    const tiene = rol.modulos?.[mod] === true
                    return (
                      <TableCell key={rol.rol} align="center">
                        {tiene ? (
                          <Check sx={{ color: PRIMARY, fontSize: 18 }} />
                        ) : (
                          <Close sx={{ color: '#CBD5E1', fontSize: 16 }} />
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Layout>
  )
}
