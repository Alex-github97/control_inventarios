import React from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, LinearProgress } from '@mui/material'
import { CompareArrows, Warehouse, Warning, TrendingDown } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SCM_COLOR = '#0C4D8C'
const BORDER = `rgba(12,77,140,0.25)`

const UBICACIONES = [
  { nombre: 'Bodega Central — Bogotá',       skus: 412, valor: '$ 3.8 B', ocupacion: 78 },
  { nombre: 'CEDI Medellín',                  skus: 198, valor: '$ 1.2 B', ocupacion: 54 },
  { nombre: 'Zona Franca Barranquilla',        skus: 87,  valor: '$ 890 M', ocupacion: 31 },
  { nombre: 'Bodega Temporal Cali',            skus: 43,  valor: '$ 210 M', ocupacion: 92 },
]

const ALERTAS = [
  { sku: 'INS-0042', descripcion: 'Lubricante 15W40 — Quart.',   nivel: 'CRÍTICO', stock: 12,  min: 50  },
  { sku: 'REP-0118', descripcion: 'Filtro hidráulico JD-4540',   nivel: 'BAJO',    stock: 8,   min: 20  },
  { sku: 'MAT-0031', descripcion: 'Lámina HR 3mm × 1.2m',        nivel: 'BAJO',    stock: 240, min: 500 },
]

export default function SCMInventario() {
  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <CompareArrows sx={{ color: SCM_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Inventario Multi-Ubicación</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Visibilidad unificada del stock en todas las bodegas</Typography>
          </Box>
          <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
        </Box>

        {/* Bodegas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {UBICACIONES.map(u => {
            const ocupColor = u.ocupacion > 85 ? '#ef4444' : u.ocupacion > 60 ? '#f59e0b' : '#22c55e'
            return (
              <Grid key={u.nombre} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '14px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Warehouse sx={{ fontSize: 18, color: alpha(SCM_COLOR, 0.8) }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>{u.nombre}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.3 }}>SKUs activos: <strong style={{ color: '#111827' }}>{u.skus}</strong></Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>Valor: <strong style={{ color: '#111827' }}>{u.valor}</strong></Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Ocupación</Typography>
                      <Typography sx={{ fontSize: 10, color: ocupColor, fontWeight: 700 }}>{u.ocupacion}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={u.ocupacion} sx={{ height: 5, borderRadius: 2, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: ocupColor } }} />
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {/* Alertas */}
        <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Warning sx={{ color: '#f59e0b', fontSize: 18 }} />
              <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>Alertas de Stock Mínimo</Typography>
              <Chip label={ALERTAS.length} size="small" sx={{ bgcolor: alpha('#f59e0b', 0.15), color: '#f59e0b', fontWeight: 800, ml: 'auto' }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {ALERTAS.map(a => (
                <Box key={a.sku} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1.5, border: `1px solid ${a.nivel === 'CRÍTICO' ? alpha('#ef4444', 0.2) : alpha('#f59e0b', 0.15)}` }}>
                  <TrendingDown sx={{ fontSize: 18, color: a.nivel === 'CRÍTICO' ? '#ef4444' : '#f59e0b' }} />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#5B9BD5' }}>{a.sku}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{a.descripcion}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Stock actual: {a.stock} u. / Mínimo: {a.min} u.</Typography>
                  </Box>
                  <Chip label={a.nivel} size="small" sx={{ bgcolor: a.nivel === 'CRÍTICO' ? alpha('#ef4444', 0.15) : alpha('#f59e0b', 0.15), color: a.nivel === 'CRÍTICO' ? '#ef4444' : '#f59e0b', fontWeight: 700, fontSize: 10 }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 2, p: 2, bgcolor: alpha(SCM_COLOR, 0.06), borderRadius: 2, border: `1px dashed ${alpha(SCM_COLOR, 0.25)}`, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: alpha('#5B9BD5', 0.8) }}>
            Sincronización en tiempo real con WMS disponible próximamente
          </Typography>
        </Box>
      </Box>
    </Layout>
  )
}
