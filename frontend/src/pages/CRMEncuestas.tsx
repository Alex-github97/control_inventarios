import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { StarRate, ThumbUp, Speed } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'

const NPS_PROMOTORES = 62
const NPS_NEUTROS    = 24
const NPS_DETRACTORES = 14
const NPS_SCORE = NPS_PROMOTORES - NPS_DETRACTORES

const ENCUESTAS = [
  { id: 1, codigo: 'ENC-2026-041', cliente: 'Almacenes Éxito S.A.',   tipo: 'NPS',  puntaje: 9,  comentario: 'Excelente servicio, equipo muy comprometido con nuestros KPIs',       respondida: true,  fecha: '2026-06-18' },
  { id: 2, codigo: 'ENC-2026-040', cliente: 'Corona S.A.',            tipo: 'NPS',  puntaje: 10, comentario: 'Icoltrans superó nuestras expectativas en la expansión del CD',       respondida: true,  fecha: '2026-06-15' },
  { id: 3, codigo: 'ENC-2026-039', cliente: 'Sodimac Colombia',       tipo: 'CSAT', puntaje: 4,  comentario: 'Buen servicio en general, algunos retrasos en despachos nocturnos',   respondida: true,  fecha: '2026-06-12' },
  { id: 4, codigo: 'ENC-2026-038', cliente: 'Grupo Nutresa',          tipo: 'CSAT', puntaje: 3,  comentario: 'El OTIF ha bajado este mes, necesitamos mejora urgente',              respondida: true,  fecha: '2026-06-10' },
  { id: 5, codigo: 'ENC-2026-037', cliente: 'Bancolombia',            tipo: 'CES',  puntaje: 4,  comentario: 'Fácil gestión de solicitudes a través del portal',                    respondida: true,  fecha: '2026-06-08' },
  { id: 6, codigo: 'ENC-2026-036', cliente: 'TechCorp Colombia',      tipo: 'NPS',  puntaje: 6,  comentario: 'Servicio aceptable, pero esperamos mejoras en tiempos de respuesta', respondida: true,  fecha: '2026-06-05' },
  { id: 7, codigo: 'ENC-2026-035', cliente: 'Pharmavida S.A.',        tipo: 'NPS',  puntaje: 8,  comentario: 'Cumple con lo pactado — equipo profesional',                          respondida: true,  fecha: '2026-06-02' },
  { id: 8, codigo: 'ENC-2026-042', cliente: 'Distribuidora Norte',    tipo: 'CSAT', puntaje: null, comentario: null, respondida: false, fecha: '2026-06-20' },
]

const TIPO_CFG: Record<string, { color: string; icon: React.ReactNode; desc: string }> = {
  NPS:  { color: '#059669', icon: <StarRate sx={{ fontSize: 16 }} />, desc: 'Net Promoter Score' },
  CSAT: { color: '#0EA5E9', icon: <ThumbUp  sx={{ fontSize: 16 }} />, desc: 'Customer Satisfaction' },
  CES:  { color: '#7C3AED', icon: <Speed    sx={{ fontSize: 16 }} />, desc: 'Customer Effort Score' },
}

function NPSBadge({ score }: { score: number }) {
  const col = score >= 9 ? '#059669' : score >= 7 ? '#F59E0B' : '#EF4444'
  const label = score >= 9 ? 'Promotor' : score >= 7 ? 'Neutro' : 'Detractor'
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha(col, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: col }}>{score}</Typography>
      </Box>
      <Chip label={label} size="small" sx={{ bgcolor: alpha(col, 0.12), color: col, fontSize: 9.5, fontWeight: 700 }} />
    </Box>
  )
}

const MEJORAS = [
  { area: 'Tiempos de Despacho', puntaje: 3.8, meta: 4.5, prioridad: 'ALTA' },
  { area: 'Comunicación Proactiva', puntaje: 3.5, meta: 4.5, prioridad: 'ALTA' },
  { area: 'Exactitud de Entregas', puntaje: 4.2, meta: 4.7, prioridad: 'MEDIA' },
  { area: 'Portal de Clientes', puntaje: 4.0, meta: 4.5, prioridad: 'MEDIA' },
]

export default function CRMEncuestas() {
  const [tab, setTab] = useState(0)

  const respondidas   = ENCUESTAS.filter(e => e.respondida).length
  const promCsat      = Number((ENCUESTAS.filter(e => e.respondida && e.tipo === 'CSAT').reduce((s, e) => s + (e.puntaje || 0), 0) / ENCUESTAS.filter(e => e.respondida && e.tipo === 'CSAT').length).toFixed(1))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <StarRate sx={{ color: '#FFFFFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Customer Experience</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              NPS · CSAT · CES · Encuestas · Planes de Mejora
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'NPS Score',     value: `+${NPS_SCORE}`, color: '#059669', sub: 'Promotores: 62%' },
            { label: 'CSAT Promedio', value: `${promCsat}/5`, color: '#0EA5E9', sub: 'Satisfacción cliente' },
            { label: 'Encuestas',     value: ENCUESTAS.length, color: CRM_COLOR, sub: `${respondidas} respondidas` },
            { label: 'Tasa Respuesta',value: `${Math.round((respondidas / ENCUESTAS.length) * 100)}%`, color: '#7C3AED', sub: 'Objetivo: 80%' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.25 }}>{k.sub}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="NPS Analysis" />
          <Tab label="Encuestas" />
          <Tab label="Planes de Mejora" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2 }}>NPS — Distribución</Typography>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography sx={{ fontSize: 56, fontWeight: 900, color: '#059669', lineHeight: 1 }}>+{NPS_SCORE}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>Net Promoter Score</Typography>
                </Box>
                {[
                  { label: 'Promotores (9-10)', pct: NPS_PROMOTORES, color: '#059669' },
                  { label: 'Neutros (7-8)',      pct: NPS_NEUTROS,    color: '#F59E0B' },
                  { label: 'Detractores (0-6)',  pct: NPS_DETRACTORES, color: '#EF4444' },
                ].map((s, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5, color: 'text.primary' }}>{s.label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.pct}%</Typography>
                    </Box>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${s.pct}%`, bgcolor: s.color, borderRadius: 4 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2 }}>Comentarios Recientes</Typography>
                {ENCUESTAS.filter(e => e.respondida && e.comentario).slice(0, 5).map((e, i) => {
                  const cfg = TIPO_CFG[e.tipo]
                  return (
                    <Box key={i} sx={{ mb: 1.5, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, flexWrap: 'wrap', gap: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>{e.cliente}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                          <Chip label={e.tipo} size="small" sx={{ bgcolor: alpha(cfg.color, 0.15), color: cfg.color, fontSize: 9.5 }} />
                          {e.puntaje !== null && <NPSBadge score={e.puntaje} />}
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>"{e.comentario}"</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5 }}>{e.fecha}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Código', 'Cliente', 'Tipo', 'Puntaje', 'Estado', 'Fecha', 'Comentario'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ENCUESTAS.map((e, i) => {
                    const cfg = TIPO_CFG[e.tipo]
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace' }}>{e.codigo}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'text.primary', fontWeight: 600, whiteSpace: 'nowrap' }}>{e.cliente}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, '& svg': { color: cfg.color } }}>
                            {cfg.icon}
                            <Typography sx={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>{e.tipo}</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {e.puntaje !== null ? <NPSBadge score={e.puntaje} /> : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Pendiente</Typography>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={e.respondida ? 'RESPONDIDA' : 'PENDIENTE'} size="small"
                            sx={{ bgcolor: e.respondida ? alpha('#059669', 0.15) : alpha('#F59E0B', 0.15), color: e.respondida ? '#059669' : '#F59E0B', fontSize: 9.5 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'text.disabled' }}>{e.fecha}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: 'text.secondary', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.comentario || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2.5 }}>Áreas de Mejora — Plan de Acción 2026</Typography>
            {MEJORAS.map((m, i) => {
              const pct  = (m.puntaje / 5) * 100
              const gap  = ((m.meta - m.puntaje) / 5) * 100
              const pcol = m.prioridad === 'ALTA' ? CRM_COLOR : '#F59E0B'
              return (
                <Box key={i} sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{m.area}</Typography>
                      <Chip label={m.prioridad} size="small" sx={{ bgcolor: alpha(pcol, 0.15), color: pcol, fontSize: 9.5, fontWeight: 700 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Actual: {m.puntaje}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>Meta: {m.meta}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'text.disabled', overflow: 'hidden', position: 'relative' }}>
                    <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: pcol, borderRadius: 5 }} />
                    <Box sx={{ position: 'absolute', top: 0, left: `${pct}%`, height: '100%', width: `${gap}%`, bgcolor: alpha('#059669', 0.3), borderRadius: '0 5px 5px 0' }} />
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </Layout>
  )
}
