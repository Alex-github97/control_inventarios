import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, InputBase, alpha } from '@mui/material'
import { SupportAgent, Search, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(220,38,38,0.25)'
const DARK_BG   = '#060C1A'

const ESTADO_COLOR: Record<string, string> = {
  ABIERTO: CRM_COLOR, EN_PROCESO: '#0EA5E9', ESCALADO: '#F59E0B', RESUELTO: '#059669', CERRADO: '#6B7280',
}
const TIPO_COLOR: Record<string, string> = {
  PQRS: '#7C3AED', RECLAMO: CRM_COLOR, SOLICITUD: '#0EA5E9', INCIDENTE: '#F59E0B', CONSULTA: '#059669',
}
const PRIORIDAD_COLOR: Record<string, string> = {
  CRITICA: '#EF4444', ALTA: CRM_COLOR, MEDIA: '#F59E0B', BAJA: '#6B7280',
}

const TICKETS = [
  { id: 1, codigo: 'TKT-2026-089', cliente: 'Almacenes Éxito S.A.',   tipo: 'RECLAMO',   estado: 'ESCALADO',   prioridad: 'ALTA',    asunto: 'Retraso sistemático en despacho zona norte', ejecutivo: 'Laura Soto',   horas_resp: 48,  satisfaccion: null },
  { id: 2, codigo: 'TKT-2026-085', cliente: 'Sodimac Colombia',        tipo: 'INCIDENTE', estado: 'EN_PROCESO', prioridad: 'ALTA',    asunto: 'Sistema WMS no actualiza inventario en tiempo real', ejecutivo: 'Carlos Vega',  horas_resp: 6,   satisfaccion: null },
  { id: 3, codigo: 'TKT-2026-081', cliente: 'Grupo Nutresa',           tipo: 'PQRS',      estado: 'ABIERTO',    prioridad: 'MEDIA',   asunto: 'Solicitud de informe OTIF mensual personalizado', ejecutivo: 'Ana Ruiz',     horas_resp: 12,  satisfaccion: null },
  { id: 4, codigo: 'TKT-2026-078', cliente: 'Corona S.A.',             tipo: 'SOLICITUD', estado: 'RESUELTO',   prioridad: 'MEDIA',   asunto: 'Cambio de hora de despacho para CD Norte', ejecutivo: 'Pedro Díaz',   horas_resp: 4,   satisfaccion: 5 },
  { id: 5, codigo: 'TKT-2026-075', cliente: 'Bancolombia',             tipo: 'CONSULTA',  estado: 'CERRADO',    prioridad: 'BAJA',    asunto: 'Información sobre tarifas de almacenamiento Q3', ejecutivo: 'Laura Soto',   horas_resp: 2,   satisfaccion: 4 },
  { id: 6, codigo: 'TKT-2026-072', cliente: 'Almacenes Éxito S.A.',   tipo: 'RECLAMO',   estado: 'RESUELTO',   prioridad: 'ALTA',    asunto: 'Descuadre de inventario en CD Bogotá 150 unidades', ejecutivo: 'Laura Soto',   horas_resp: 8,   satisfaccion: 3 },
  { id: 7, codigo: 'TKT-2026-069', cliente: 'TechCorp Colombia',       tipo: 'INCIDENTE', estado: 'ESCALADO',   prioridad: 'CRITICA', asunto: 'Pérdida de mercancía en bodega — faltante 50 cajas', ejecutivo: 'Carlos Vega',  horas_resp: 72,  satisfaccion: null },
  { id: 8, codigo: 'TKT-2026-066', cliente: 'Corona S.A.',             tipo: 'PQRS',      estado: 'ABIERTO',    prioridad: 'MEDIA',   asunto: 'Queja por cambio no comunicado en ruta de entrega', ejecutivo: 'Pedro Díaz',   horas_resp: 24,  satisfaccion: null },
]

export default function CRMTickets() {
  const [tab, setTab]       = useState(0)
  const [busqueda, setBus]  = useState('')
  const [estado, setEstado] = useState('Todos')

  const ESTADOS = ['Todos', 'ABIERTO', 'EN_PROCESO', 'ESCALADO', 'RESUELTO', 'CERRADO']
  const filtrados = TICKETS.filter(t => {
    const matchB = t.asunto.toLowerCase().includes(busqueda.toLowerCase()) || t.cliente.toLowerCase().includes(busqueda.toLowerCase()) || t.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const matchE = estado === 'Todos' || t.estado === estado
    return matchB && matchE
  })

  const abiertos  = TICKETS.filter(t => t.estado === 'ABIERTO').length
  const escalados = TICKETS.filter(t => t.estado === 'ESCALADO').length
  const resueltos = TICKETS.filter(t => t.estado === 'RESUELTO' || t.estado === 'CERRADO').length
  const trat_resolucion = Math.round((resueltos / TICKETS.length) * 100)

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SupportAgent sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Servicio al Cliente — PQRS</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Tickets · Reclamos · Escalaciones · Integración QMS
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Tickets Abiertos',  value: abiertos,  color: CRM_COLOR },
            { label: 'Escalados',         value: escalados, color: '#F59E0B' },
            { label: 'Resueltos',         value: resueltos, color: '#059669' },
            { label: 'Tasa Resolución',   value: `${trat_resolucion}%`, color: '#0EA5E9' },
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
          <Tab label="Todos los Tickets" />
          <Tab label="Escalados & Críticos" />
        </Tabs>

        {/* Buscador */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 200 }}>
            <Search sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
            <InputBase placeholder="Buscar ticket..." value={busqueda} onChange={e => setBus(e.target.value)} sx={{ flex: 1, color: '#FFF', fontSize: 13.5 }} />
          </Box>
          {ESTADOS.map(e => (
            <Chip key={e} label={e === 'Todos' ? 'Todos' : e.replace('_', ' ')} size="small" onClick={() => setEstado(e)}
              sx={{ cursor: 'pointer', bgcolor: estado === e ? (ESTADO_COLOR[e] || CRM_COLOR) : 'rgba(255,255,255,0.06)', color: estado === e ? '#FFF' : 'rgba(255,255,255,0.5)', fontWeight: estado === e ? 700 : 400 }} />
          ))}
        </Box>

        {tab === 0 && (
          <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Código', 'Cliente', 'Tipo', 'Asunto', 'Prioridad', 'Estado', 'T. Respuesta', 'Satisf.', 'Ejecutivo'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((t, i) => {
                    const ecol = ESTADO_COLOR[t.estado] || '#94A3B8'
                    const tcol = TIPO_COLOR[t.tipo] || '#94A3B8'
                    const pcol = PRIORIDAD_COLOR[t.prioridad] || '#94A3B8'
                    const urgente = t.estado === 'ESCALADO' || t.prioridad === 'CRITICA'
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: urgente ? alpha(CRM_COLOR, 0.04) : undefined }}>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {urgente && <Warning sx={{ fontSize: 13, color: CRM_COLOR }} />}
                            <Typography sx={{ fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace' }}>{t.codigo}</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#FFF', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.cliente}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={t.tipo} size="small" sx={{ bgcolor: alpha(tcol, 0.15), color: tcol, fontSize: 9.5, fontWeight: 600 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.65)', maxWidth: 260 }}>
                          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.asunto}</Box>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={t.prioridad} size="small" sx={{ bgcolor: alpha(pcol, 0.15), color: pcol, fontSize: 9.5, fontWeight: 700 }} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={t.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(ecol, 0.15), color: ecol, fontSize: 9.5, fontWeight: 600 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: t.horas_resp > 24 ? CRM_COLOR : '#059669' }}>{t.horas_resp}h</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: t.satisfaccion ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}>
                          {t.satisfaccion ? '★'.repeat(t.satisfaccion) + '☆'.repeat(5 - t.satisfaccion) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{t.ejecutivo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {TICKETS.filter(t => t.estado === 'ESCALADO' || t.prioridad === 'CRITICA').map((t, i) => {
              const ecol = ESTADO_COLOR[t.estado]
              const pcol = PRIORIDAD_COLOR[t.prioridad]
              return (
                <Box key={i} sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(CRM_COLOR, 0.3)}`, borderRadius: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Warning sx={{ fontSize: 16, color: CRM_COLOR }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>{t.asunto}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>{t.codigo} · {t.cliente} · Ejecutivo: {t.ejecutivo}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={t.tipo} size="small" sx={{ bgcolor: alpha(TIPO_COLOR[t.tipo] || CRM_COLOR, 0.15), color: TIPO_COLOR[t.tipo] || CRM_COLOR, fontSize: 9.5 }} />
                      <Chip label={t.prioridad} size="small" sx={{ bgcolor: alpha(pcol, 0.2), color: pcol, fontSize: 9.5, fontWeight: 700 }} />
                      <Chip label={t.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(ecol, 0.15), color: ecol, fontSize: 9.5, fontWeight: 600 }} />
                      <Chip label={`${t.horas_resp}h sin respuesta`} size="small" sx={{ bgcolor: alpha(CRM_COLOR, 0.15), color: CRM_COLOR, fontSize: 9.5, fontWeight: 700 }} />
                    </Box>
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
