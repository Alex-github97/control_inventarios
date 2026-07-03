import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { Handshake, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const BORDER = '#E5E7EB'

const ESTADO_COLOR: Record<string, string> = {
  ACTIVO: '#059669', BORRADOR: '#94A3B8', VENCIDO: '#EF4444', RENOVADO: '#0EA5E9', TERMINADO: '#6B7280',
}

const CONTRATOS = [
  { id: 1, codigo: 'CON-2026-012', cliente: 'Almacenes Éxito S.A.',   servicio: 'Logística Integral',    estado: 'ACTIVO',   inicio: '2024-02-01', fin: '2026-07-19', valor_mensual: 400, ejecutivo: 'Laura Soto',  auto_renovacion: true,  dias_vence: 30 },
  { id: 2, codigo: 'CON-2026-008', cliente: 'Corona S.A.',            servicio: 'Operación CD',           estado: 'ACTIVO',   inicio: '2023-07-01', fin: '2026-12-31', valor_mensual: 533, ejecutivo: 'Pedro Díaz',  auto_renovacion: true,  dias_vence: 196 },
  { id: 3, codigo: 'CON-2025-021', cliente: 'Sodimac Colombia',       servicio: 'WMS + TMS',              estado: 'ACTIVO',   inicio: '2025-01-01', fin: '2026-12-31', valor_mensual: 267, ejecutivo: 'Carlos Vega', auto_renovacion: false, dias_vence: 196 },
  { id: 4, codigo: 'CON-2025-015', cliente: 'Grupo Nutresa',          servicio: 'Transporte Dedicado',    estado: 'ACTIVO',   inicio: '2025-03-01', fin: '2027-02-28', valor_mensual: 179, ejecutivo: 'Ana Ruiz',    auto_renovacion: true,  dias_vence: 620 },
  { id: 5, codigo: 'CON-2025-009', cliente: 'Bancolombia',            servicio: 'Logística',              estado: 'ACTIVO',   inicio: '2025-07-01', fin: '2026-08-31', valor_mensual: 150, ejecutivo: 'Laura Soto',  auto_renovacion: false, dias_vence: 73 },
  { id: 6, codigo: 'CON-2024-034', cliente: 'Pharmavida S.A.',        servicio: 'TMS Flota',              estado: 'VENCIDO',  inicio: '2023-01-01', fin: '2025-12-31', valor_mensual: 95,  ejecutivo: 'Pedro Díaz',  auto_renovacion: false, dias_vence: -170 },
  { id: 7, codigo: 'CON-2024-019', cliente: 'Logística Sur S.A.S.',   servicio: 'Almacenamiento',         estado: 'TERMINADO',inicio: '2022-01-01', fin: '2024-12-31', valor_mensual: 35,  ejecutivo: 'Ana Ruiz',    auto_renovacion: false, dias_vence: -171 },
]

const SLAS_EJEMPLO = [
  { indicador: 'OTIF',                objetivo: 95, actual: 93.4, unidad: '%' },
  { indicador: 'Tiempo Respuesta PQR', objetivo: 24, actual: 18,  unidad: 'hrs' },
  { indicador: 'Exactitud Inventario', objetivo: 99, actual: 99.2, unidad: '%' },
  { indicador: 'Devoluciones',         objetivo: 2,  actual: 1.8,  unidad: '%' },
]

export default function CRMContratos() {
  const [tab, setTab] = useState(0)

  const activos      = CONTRATOS.filter(c => c.estado === 'ACTIVO').length
  const porVencer    = CONTRATOS.filter(c => c.dias_vence > 0 && c.dias_vence <= 90).length
  const valorMensual = CONTRATOS.filter(c => c.estado === 'ACTIVO').reduce((s, c) => s + c.valor_mensual, 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Handshake sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Contratos + SLA</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Vigencia · Renovaciones · Alertas · SLAs · Firma digital
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Contratos Activos',  value: activos,               color: '#059669' },
            { label: 'Por Vencer (90d)',   value: porVencer,             color: CRM_COLOR },
            { label: 'Ingreso Mensual',    value: `$${valorMensual}M`,   color: '#0EA5E9' },
            { label: 'Cumplimiento SLA',   value: '97.2%',               color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ bgcolor: 'text.primary', border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="Contratos" />
          <Tab label="SLAs" />
          <Tab label="Vencimientos" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Código', 'Cliente', 'Servicio', 'Estado', 'Inicio', 'Fin', 'Val. Mensual', 'Auto-Renov.', 'Ejecutivo'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONTRATOS.map((c, i) => {
                    const col = ESTADO_COLOR[c.estado] || '#94A3B8'
                    const urgente = c.dias_vence > 0 && c.dias_vence <= 30
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F9FAFB', background: urgente ? alpha(CRM_COLOR, 0.04) : undefined }}>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {urgente && <Warning sx={{ fontSize: 14, color: CRM_COLOR }} />}
                            <Typography sx={{ fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace' }}>{c.codigo}</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.cliente}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{c.servicio}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={c.estado} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, fontSize: 9.5, fontWeight: 700 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{c.inicio}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: urgente ? CRM_COLOR : '#6B7280', fontWeight: urgente ? 700 : 400, whiteSpace: 'nowrap' }}>{c.fin}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: CRM_COLOR }}>${c.valor_mensual}M</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Chip label={c.auto_renovacion ? 'Sí' : 'No'} size="small"
                            sx={{ bgcolor: c.auto_renovacion ? alpha('#059669', 0.15) : '#F1F5F9', color: c.auto_renovacion ? '#059669' : '#6B7280', fontSize: 9.5 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{c.ejecutivo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>SLAs — Almacenes Éxito S.A. (CON-2026-012)</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>Medición mensual · Datos al 2026-06-01</Typography>
            {SLAS_EJEMPLO.map((s, i) => {
              const cumple  = (s.indicador === 'Devoluciones' || s.indicador === 'Tiempo Respuesta PQR') ? s.actual <= s.objetivo : s.actual >= s.objetivo
              const col     = cumple ? '#059669' : CRM_COLOR
              const pct     = Math.min((s.actual / s.objetivo) * 100, 100)
              return (
                <Box key={i} sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{s.indicador}</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Meta: {s.objetivo}{s.unidad}</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 900, color: col }}>{s.actual}{s.unidad}</Typography>
                      <Chip label={cumple ? 'CUMPLE' : 'INCUMPLE'} size="small"
                        sx={{ bgcolor: alpha(col, 0.15), color: col, fontSize: 9.5, fontWeight: 700 }} />
                    </Box>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: col, borderRadius: 4 }} />
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2 }}>Calendario de Vencimientos</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {CONTRATOS.filter(c => c.estado === 'ACTIVO').sort((a, b) => a.dias_vence - b.dias_vence).map((c, i) => {
                const col = c.dias_vence <= 30 ? CRM_COLOR : c.dias_vence <= 90 ? '#F59E0B' : '#059669'
                return (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: alpha(col, 0.06), border: `1px solid ${alpha(col, 0.2)}`, borderRadius: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{c.cliente}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{c.codigo} · {c.servicio}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: col }}>{c.dias_vence} días</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{c.fin}</Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
