import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { TrendingUp, EmojiEvents } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(220,38,38,0.25)'
const DARK_BG   = '#060C1A'

const ETAPA_CONFIG: Record<string, { color: string; prob: number }> = {
  IDENTIFICACION: { color: '#94A3B8', prob: 10 },
  CALIFICACION:   { color: '#0EA5E9', prob: 25 },
  PROPUESTA:      { color: '#7C3AED', prob: 50 },
  NEGOCIACION:    { color: CRM_COLOR, prob: 75 },
  CIERRE_GANADO:  { color: '#059669', prob: 100 },
  CIERRE_PERDIDO: { color: '#EF4444', prob: 0 },
}

const OPORTUNIDADES = [
  { id: 1, codigo: 'OPO-2026-001', nombre: 'Contrato Logístico Integral 2026',  cliente: 'Almacenes Éxito',    valor: 480, etapa: 'NEGOCIACION',  prob: 80, servicio: 'Logística Integral',  ejecutivo: 'Laura Soto',  fecha: '2026-07-30' },
  { id: 2, codigo: 'OPO-2026-002', nombre: 'Servicio WMS + TMS Bogotá Norte',   cliente: 'Sodimac Colombia',   valor: 320, etapa: 'PROPUESTA',    prob: 55, servicio: 'WMS + TMS',           ejecutivo: 'Carlos Vega', fecha: '2026-08-15' },
  { id: 3, codigo: 'OPO-2026-003', nombre: 'Outsourcing Transporte Q3',          cliente: 'Grupo Nutresa',      valor: 215, etapa: 'CALIFICACION', prob: 35, servicio: 'Transporte',          ejecutivo: 'Ana Ruiz',    fecha: '2026-09-01' },
  { id: 4, codigo: 'OPO-2026-004', nombre: 'Expansión Centro de Distribución',  cliente: 'Corona S.A.',         valor: 640, etapa: 'NEGOCIACION',  prob: 75, servicio: 'Operación CD',        ejecutivo: 'Pedro Díaz',  fecha: '2026-07-15' },
  { id: 5, codigo: 'OPO-2026-005', nombre: 'Operación Logística Medellín',       cliente: 'Bancolombia',        valor: 180, etapa: 'PROPUESTA',    prob: 60, servicio: 'Logística',           ejecutivo: 'Laura Soto',  fecha: '2026-08-31' },
  { id: 6, codigo: 'OPO-2026-006', nombre: 'Proyecto Pickup & Delivery',         cliente: 'TechCorp Colombia',  valor: 95,  etapa: 'IDENTIFICACION',prob: 15, servicio: 'Última Milla',       ejecutivo: 'Carlos Vega', fecha: '2026-10-15' },
  { id: 7, codigo: 'OPO-2026-007', nombre: 'Servicio Cross-Docking Barranquilla',cliente: 'Distribuidora Norte',valor: 128, etapa: 'CALIFICACION', prob: 40, servicio: 'Cross-Docking',      ejecutivo: 'Ana Ruiz',    fecha: '2026-09-30' },
  { id: 8, codigo: 'OPO-2026-008', nombre: 'Contrato TMS Flota Dedicada',        cliente: 'Pharmavida S.A.',    valor: 380, etapa: 'NEGOCIACION',  prob: 70, servicio: 'TMS',                 ejecutivo: 'Pedro Díaz',  fecha: '2026-07-20' },
]

const ETAPAS_ORDER = ['IDENTIFICACION', 'CALIFICACION', 'PROPUESTA', 'NEGOCIACION', 'CIERRE_GANADO', 'CIERRE_PERDIDO']

export default function CRMOportunidades() {
  const [tab, setTab] = useState(0)

  const totalPipeline = OPORTUNIDADES.filter(o => !['CIERRE_GANADO', 'CIERRE_PERDIDO'].includes(o.etapa)).reduce((s, o) => s + o.valor, 0)
  const totalGanado   = OPORTUNIDADES.filter(o => o.etapa === 'CIERRE_GANADO').reduce((s, o) => s + o.valor, 0)
  const winRate       = Math.round((OPORTUNIDADES.filter(o => o.etapa === 'CIERRE_GANADO').length / OPORTUNIDADES.length) * 100)

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Pipeline de Oportunidades</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Prospección · Propuestas · Negociación · Cierre
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Pipeline Activo', value: `$${totalPipeline}M`, color: CRM_COLOR },
            { label: 'Oportunidades',   value: OPORTUNIDADES.filter(o => !['CIERRE_GANADO','CIERRE_PERDIDO'].includes(o.etapa)).length, color: '#0EA5E9' },
            { label: 'Win Rate',        value: `${winRate}%`, color: '#059669' },
            { label: 'Total Cerrado',   value: `$${totalGanado}M`, color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#FFF', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="Vista Kanban" />
          <Tab label="Vista Tabla" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
            {ETAPAS_ORDER.filter(e => e !== 'CIERRE_PERDIDO').map(etapa => {
              const cfg = ETAPA_CONFIG[etapa]
              const opos = OPORTUNIDADES.filter(o => o.etapa === etapa)
              const totalEtapa = opos.reduce((s, o) => s + o.valor, 0)
              return (
                <Box key={etapa} sx={{ minWidth: 240, maxWidth: 260, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 0.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {etapa.replace('_', ' ')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      <Chip label={opos.length} size="small" sx={{ bgcolor: alpha(cfg.color, 0.15), color: cfg.color, fontSize: 10, height: 18 }} />
                      {totalEtapa > 0 && <Chip label={`$${totalEtapa}M`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 10, height: 18 }} />}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {opos.length === 0 && (
                      <Box sx={{ bgcolor: CARD_BG, border: `1px dashed ${alpha(cfg.color, 0.2)}`, borderRadius: 1.5, p: 2, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Sin oportunidades</Typography>
                      </Box>
                    )}
                    {opos.map((o, i) => (
                      <Box key={i} sx={{
                        bgcolor: CARD_BG, border: `1px solid ${alpha(cfg.color, 0.25)}`, borderRadius: 1.5, p: 1.5,
                        '&:hover': { border: `1px solid ${alpha(cfg.color, 0.5)}` }, transition: 'border 0.15s ease', cursor: 'pointer',
                      }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#FFF', mb: 0.5, lineHeight: 1.3 }}>{o.nombre}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', mb: 1 }}>{o.cliente}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{o.servicio}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>${o.valor}M</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{o.fecha}</Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{o.prob}%</Typography>
                        </Box>
                        <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${o.prob}%`, bgcolor: cfg.color, borderRadius: 2 }} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Código', 'Oportunidad', 'Cliente', 'Servicio', 'Valor', 'Etapa', 'Prob.', 'Fecha Esp.', 'Ejecutivo'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OPORTUNIDADES.map((o, i) => {
                    const cfg = ETAPA_CONFIG[o.etapa]
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{o.codigo}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#FFF', fontWeight: 600 }}>{o.nombre}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{o.cliente}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{o.servicio}</td>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: CRM_COLOR }}>${o.valor}M</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={o.etapa.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(cfg.color, 0.15), color: cfg.color, border: `1px solid ${alpha(cfg.color, 0.3)}`, fontSize: 9.5, fontWeight: 700 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: cfg.color }}>{o.prob}%</td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{o.fecha}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{o.ejecutivo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
