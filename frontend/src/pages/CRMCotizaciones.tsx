import React, { useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Receipt, CheckCircle, Schedule, Cancel } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const BORDER = '#E5E7EB'

const ESTADO_CFG: Record<string, { color: string; icon: React.ReactNode }> = {
  BORRADOR:  { color: '#94A3B8', icon: <Schedule sx={{ fontSize: 14 }} /> },
  ENVIADA:   { color: '#0EA5E9', icon: <Schedule sx={{ fontSize: 14 }} /> },
  APROBADA:  { color: '#059669', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  RECHAZADA: { color: '#EF4444', icon: <Cancel sx={{ fontSize: 14 }} /> },
  VENCIDA:   { color: '#F59E0B', icon: <Cancel sx={{ fontSize: 14 }} /> },
}

const COTIZACIONES = [
  { id: 1, codigo: 'COT-2026-042', version: 1, oportunidad: 'OPO-2026-001', cliente: 'Almacenes Éxito S.A.',  ejecutivo: 'Laura Soto',  estado: 'APROBADA',  total: 4800, validez: 30, envio: '2026-06-01', vencimiento: '2026-07-01', servicios: ['Logística Integral', 'WMS', 'TMS'] },
  { id: 2, codigo: 'COT-2026-041', version: 2, oportunidad: 'OPO-2026-002', cliente: 'Sodimac Colombia',     ejecutivo: 'Carlos Vega', estado: 'ENVIADA',   total: 3200, validez: 30, envio: '2026-06-10', vencimiento: '2026-07-10', servicios: ['WMS', 'TMS'] },
  { id: 3, codigo: 'COT-2026-040', version: 1, oportunidad: 'OPO-2026-003', cliente: 'Grupo Nutresa',        ejecutivo: 'Ana Ruiz',    estado: 'BORRADOR',  total: 2150, validez: 45, envio: null,         vencimiento: null,         servicios: ['Transporte Dedicado'] },
  { id: 4, codigo: 'COT-2026-039', version: 3, oportunidad: 'OPO-2026-004', cliente: 'Corona S.A.',          ejecutivo: 'Pedro Díaz',  estado: 'ENVIADA',   total: 6400, validez: 30, envio: '2026-06-12', vencimiento: '2026-07-12', servicios: ['Operación CD', 'Mano de Obra', 'Equipo'] },
  { id: 5, codigo: 'COT-2026-038', version: 1, oportunidad: 'OPO-2026-005', cliente: 'Bancolombia',          ejecutivo: 'Laura Soto',  estado: 'RECHAZADA', total: 1800, validez: 30, envio: '2026-05-20', vencimiento: '2026-06-20', servicios: ['Logística'] },
  { id: 6, codigo: 'COT-2026-037', version: 2, oportunidad: 'OPO-2026-007', cliente: 'Distribuidora Norte',  ejecutivo: 'Ana Ruiz',    estado: 'VENCIDA',   total: 1280, validez: 30, envio: '2026-05-01', vencimiento: '2026-05-31', servicios: ['Cross-Docking'] },
]

const ITEMS_EJEMPLO = [
  { descripcion: 'Servicio de operación logística mensual', unidad: 'Mes', cantidad: 12, precio: 200, descuento: 5, total: 2280 },
  { descripcion: 'Gestión de inventarios WMS',              unidad: 'Mes', cantidad: 12, precio: 80,  descuento: 0, total: 960 },
  { descripcion: 'Transporte dedicado (10 vehículos)',       unidad: 'Mes', cantidad: 12, precio: 160, descuento: 0, total: 1920 },
  { descripcion: 'Administración y coordinación',            unidad: 'Mes', cantidad: 12, precio: 35,  descuento: 0, total: 420 },
]

export default function CRMCotizaciones() {
  const [tab, setTab] = useState(0)

  const aprobadas = COTIZACIONES.filter(c => c.estado === 'APROBADA').length
  const enviadas  = COTIZACIONES.filter(c => c.estado === 'ENVIADA').length
  const totalVal  = COTIZACIONES.filter(c => c.estado !== 'RECHAZADA' && c.estado !== 'VENCIDA').reduce((s, c) => s + c.total, 0)
  const conversion = Math.round((aprobadas / COTIZACIONES.length) * 100)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Receipt sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Cotizaciones</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Generación · Versionamiento · Aprobaciones · Tarifarios
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Cotizaciones', value: COTIZACIONES.length, color: CRM_COLOR },
            { label: 'Enviadas',           value: enviadas,            color: '#0EA5E9' },
            { label: 'Aprobadas',          value: aprobadas,           color: '#059669' },
            { label: 'Tasa Conversión',    value: `${conversion}%`,    color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="Lista de Cotizaciones" />
          <Tab label="Detalle de Cotización" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ bgcolor: 'background.paper', border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>Cotizaciones ({COTIZACIONES.length})</Typography>
              <Typography sx={{ fontSize: 12, color: CRM_COLOR, fontWeight: 700 }}>Pipeline cotizado: ${(totalVal / 1000).toFixed(1)}B</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Código', 'Ver.', 'Cliente', 'Servicios', 'Total', 'Estado', 'Válido hasta', 'Ejecutivo', 'Oportunidad'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COTIZACIONES.map((c, i) => {
                    const cfg = ESTADO_CFG[c.estado]
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F9FAFB', cursor: 'pointer' }}
                        onClick={() => setTab(1)}>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.codigo}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: alpha(CRM_COLOR, 0.15), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: CRM_COLOR }}>v{c.version}</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.cliente}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {c.servicios.map((s, j) => (
                              <Chip key={j} label={s} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 9.5 }} />
                            ))}
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>${(c.total / 1000).toFixed(1)}B</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                            <Chip label={c.estado} size="small" sx={{ bgcolor: alpha(cfg.color, 0.15), color: cfg.color, fontSize: 9.5, fontWeight: 600 }} />
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{c.vencimiento || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{c.ejecutivo}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.oportunidad}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ bgcolor: 'background.paper', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>COT-2026-042 — Almacenes Éxito S.A.</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                      Versión 1 · Oportunidad OPO-2026-001 · Ejecutivo: Laura Soto
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label="APROBADA" size="small" sx={{ bgcolor: alpha('#059669', 0.15), color: '#059669', fontWeight: 700 }} />
                    <Chip label="Vence: 2026-07-01" size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary' }} />
                  </Box>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Descripción', 'Unidad', 'Cantidad', 'Precio Unit.', 'Dto.%', 'Total'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ITEMS_EJEMPLO.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td style={{ padding: '8px 12px', fontSize: 12.5, color: '#111827' }}>{item.descripcion}</td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#6B7280' }}>{item.unidad}</td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#374151', textAlign: 'right' }}>{item.cantidad}</td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#374151', textAlign: 'right' }}>${item.precio}M</td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: item.descuento > 0 ? CRM_COLOR : '#9CA3AF', textAlign: 'right' }}>{item.descuento}%</td>
                          <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, color: CRM_COLOR, textAlign: 'right' }}>${item.total}M</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #E5E7EB' }}>
                        <td colSpan={5} style={{ padding: '10px 12px', fontSize: 14, fontWeight: 800, color: '#111827', textAlign: 'right' }}>TOTAL</td>
                        <td style={{ padding: '10px 12px', fontSize: 16, fontWeight: 900, color: CRM_COLOR, textAlign: 'right' }}>$5,580M</td>
                      </tr>
                    </tfoot>
                  </table>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
