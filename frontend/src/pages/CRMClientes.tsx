import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, InputBase, alpha } from '@mui/material'
import { People, Search, TrendingUp, Handshake, SupportAgent, StarRate } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(220,38,38,0.25)'
const DARK_BG   = '#060C1A'

const ESTADO_COLOR: Record<string, string> = {
  CLIENTE_ACTIVO: '#059669', PROSPECTO: '#94A3B8', LEAD: '#0EA5E9',
  CLIENTE_INACTIVO: '#F59E0B', EXCLIENTE: '#EF4444',
}
const SEGMENTO_COLOR: Record<string, string> = {
  CORPORATIVO: CRM_COLOR, ESTRATEGICO: '#7C3AED', MEDIANA: '#0EA5E9', PEQUENA: '#059669',
}

const CLIENTES = [
  { id: 1, codigo: 'CLI-2026-001', razon_social: 'Almacenes Éxito S.A.',    nit: '860007380-5', estado: 'CLIENTE_ACTIVO', segmento: 'CORPORATIVO', industria: 'Retail',      health: 88, ingresos: 4800, ejecutivo: 'Laura Soto',   ciudad: 'Bogotá' },
  { id: 2, codigo: 'CLI-2026-002', razon_social: 'Sodimac Colombia S.A.S.', nit: '830040471-1', estado: 'CLIENTE_ACTIVO', segmento: 'CORPORATIVO', industria: 'Retail',      health: 74, ingresos: 3200, ejecutivo: 'Carlos Vega',  ciudad: 'Bogotá' },
  { id: 3, codigo: 'CLI-2026-003', razon_social: 'Grupo Nutresa S.A.',      nit: '890903247-3', estado: 'CLIENTE_ACTIVO', segmento: 'ESTRATEGICO', industria: 'Alimentos',   health: 62, ingresos: 2150, ejecutivo: 'Ana Ruiz',     ciudad: 'Medellín' },
  { id: 4, codigo: 'CLI-2026-004', razon_social: 'Corona S.A.',             nit: '860053174-1', estado: 'CLIENTE_ACTIVO', segmento: 'ESTRATEGICO', industria: 'Industrial',  health: 91, ingresos: 6400, ejecutivo: 'Pedro Díaz',   ciudad: 'Bogotá' },
  { id: 5, codigo: 'CLI-2026-005', razon_social: 'Bancolombia S.A.',        nit: '890903938-8', estado: 'CLIENTE_ACTIVO', segmento: 'CORPORATIVO', industria: 'Financiero',  health: 79, ingresos: 1800, ejecutivo: 'Laura Soto',   ciudad: 'Medellín' },
  { id: 6, codigo: 'CLI-2026-006', razon_social: 'TechCorp Colombia',       nit: '901234567-8', estado: 'LEAD',           segmento: 'MEDIANA',     industria: 'Tecnología',  health: 45, ingresos: 0,    ejecutivo: 'Carlos Vega',  ciudad: 'Bogotá' },
  { id: 7, codigo: 'CLI-2026-007', razon_social: 'Distribuidora Norte',     nit: '812345678-1', estado: 'PROSPECTO',      segmento: 'PEQUENA',     industria: 'Distribución',health: 30, ingresos: 0,    ejecutivo: 'Ana Ruiz',     ciudad: 'Barranquilla' },
  { id: 8, codigo: 'CLI-2026-008', razon_social: 'Logística Sur S.A.S.',    nit: '900654321-2', estado: 'CLIENTE_INACTIVO', segmento: 'MEDIANA',   industria: 'Logística',  health: 38, ingresos: 420,  ejecutivo: 'Pedro Díaz',   ciudad: 'Cali' },
]

const CLIENTE_360 = {
  razon_social: 'Almacenes Éxito S.A.',
  nit: '860007380-5',
  health: 88,
  estado: 'CLIENTE_ACTIVO',
  segmento: 'CORPORATIVO',
  ejecutivo: 'Laura Soto',
  kpis: [
    { label: 'Ingresos YTD', value: '$4.8B', color: CRM_COLOR },
    { label: 'OTIF', value: '93.4%', color: '#059669' },
    { label: 'NPS', value: '+62', color: '#0EA5E9' },
    { label: 'Tickets Abiertos', value: '2', color: '#F59E0B' },
    { label: 'Contratos Activos', value: '3', color: '#7C3AED' },
    { label: 'Churn Risk', value: '8%', color: '#059669' },
  ],
  contratos: [
    { codigo: 'CON-2026-003', nombre: 'Operación Logística Nacional', estado: 'ACTIVO', vencimiento: '2027-01-15' },
    { codigo: 'CON-2025-021', nombre: 'Servicio WMS Bogotá', estado: 'ACTIVO', vencimiento: '2026-12-31' },
  ],
  tickets: [
    { codigo: 'TKT-2026-045', asunto: 'Retraso en despacho zona norte', estado: 'EN_PROCESO', prioridad: 'ALTA' },
    { codigo: 'TKT-2026-038', asunto: 'Descuadre de inventario CD Bogotá', estado: 'RESUELTO', prioridad: 'MEDIA' },
  ],
  historial: [
    { fecha: '2026-06-18', tipo: 'REUNION', desc: 'Revisión trimestral de KPIs — satisfacción alta' },
    { fecha: '2026-05-22', tipo: 'EMAIL', desc: 'Propuesta renovación contrato CON-2026-003' },
    { fecha: '2026-04-10', tipo: 'LLAMADA', desc: 'Seguimiento incidente de picking — resuelto' },
  ],
}

function HealthBar({ score }: { score: number }) {
  const col = score >= 75 ? '#059669' : score >= 50 ? CRM_COLOR : '#EF4444'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 50, height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${score}%`, bgcolor: col, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: col }}>{score}</Typography>
    </Box>
  )
}

export default function CRMClientes() {
  const [tab, setTab]       = useState(0)
  const [busqueda, setBus]  = useState('')
  const [estado, setEstado] = useState('Todos')

  const ESTADOS = ['Todos', 'CLIENTE_ACTIVO', 'LEAD', 'PROSPECTO', 'CLIENTE_INACTIVO']
  const filtrados = CLIENTES.filter(c => {
    const matchB = c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) || c.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const matchE = estado === 'Todos' || c.estado === estado
    return matchB && matchE
  })

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <People sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Clientes</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Customer 360 · Portafolio · Salud · Visión integrada
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label={`Portafolio (${CLIENTES.length})`} />
          <Tab label="Vista 360°" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 200, bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, px: 2, py: 1, alignItems: 'center' }}>
                <Search sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
                <InputBase placeholder="Buscar cliente..." value={busqueda} onChange={e => setBus(e.target.value)} sx={{ flex: 1, color: '#FFF', fontSize: 13.5 }} />
              </Box>
              {ESTADOS.map(e => (
                <Chip key={e} label={e === 'Todos' ? 'Todos' : e.replace('_', ' ')} size="small" onClick={() => setEstado(e)}
                  sx={{ cursor: 'pointer', bgcolor: estado === e ? CRM_COLOR : 'rgba(255,255,255,0.06)', color: estado === e ? '#FFF' : 'rgba(255,255,255,0.5)', fontWeight: estado === e ? 700 : 400 }} />
              ))}
            </Box>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Código', 'Cliente', 'NIT', 'Estado', 'Segmento', 'Industria', 'Health', 'Ingresos YTD', 'Ejecutivo'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((c, i) => {
                      const ecol = ESTADO_COLOR[c.estado] || '#94A3B8'
                      const scol = SEGMENTO_COLOR[c.segmento] || '#94A3B8'
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.codigo}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#FFF', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.razon_social}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{c.nit}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={c.estado.replace(/_/g, ' ')} size="small" sx={{ bgcolor: alpha(ecol, 0.15), color: ecol, border: `1px solid ${alpha(ecol, 0.3)}`, fontSize: 10, fontWeight: 600 }} />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={c.segmento} size="small" sx={{ bgcolor: alpha(scol, 0.12), color: scol, fontSize: 10 }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{c.industria}</td>
                          <td style={{ padding: '10px 14px' }}><HealthBar score={c.health} /></td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: c.ingresos > 0 ? CRM_COLOR : 'rgba(255,255,255,0.3)' }}>
                            {c.ingresos > 0 ? `$${(c.ingresos / 1000).toFixed(1)}B` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{c.ejecutivo}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Box>
          </>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>{CLIENTE_360.razon_social}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>NIT: {CLIENTE_360.nit} · Ejecutivo: {CLIENTE_360.ejecutivo}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={CLIENTE_360.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha('#059669', 0.15), color: '#059669', fontWeight: 700 }} />
                    <Chip label={CLIENTE_360.segmento} size="small" sx={{ bgcolor: alpha(CRM_COLOR, 0.15), color: CRM_COLOR, fontWeight: 700 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>Health</Typography>
                      <HealthBar score={CLIENTE_360.health} />
                    </Box>
                  </Box>
                </Box>
                <Grid container spacing={1.5}>
                  {CLIENTE_360.kpis.map((k, i) => (
                    <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
                      <Box sx={{ bgcolor: alpha(k.color, 0.08), border: `1px solid ${alpha(k.color, 0.2)}`, borderRadius: 1.5, p: 1.5, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>{k.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#FFF', mb: 1.5 }}>Contratos Activos</Typography>
                {CLIENTE_360.contratos.map((c, i) => (
                  <Box key={i} sx={{ p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#FFF' }}>{c.nombre}</Typography>
                      <Chip label={c.estado} size="small" sx={{ bgcolor: alpha('#059669', 0.15), color: '#059669', fontSize: 9.5 }} />
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', mt: 0.5 }}>Vence: {c.vencimiento} · {c.codigo}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#FFF', mb: 1.5 }}>Historial de Interacciones</Typography>
                {CLIENTE_360.historial.map((h, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5 }}>
                    <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                      <Chip label={h.tipo} size="small" sx={{ bgcolor: alpha(CRM_COLOR, 0.15), color: CRM_COLOR, fontSize: 9.5 }} />
                      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', mt: 0.5, display: 'block' }}>{h.fecha}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, pt: 0.5 }}>{h.desc}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
