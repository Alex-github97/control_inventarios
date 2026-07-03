import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { WorkspacePremium, Warning, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const #E5E7EB  = '#E5E7EB'

const ESTADO_COLORS: Record<string, string> = {
  VIGENTE: '#059669', POR_VENCER: '#F59E0B', VENCIDA: '#EF4444', CANCELADA: '#6B7280',
}

const CERTIFICACIONES = [
  { id: 1, codigo: 'CERT-2026-001', nombre: 'Certificación Conducción Segura C3', vigencia: 12, emisora: 'Escuela de Conductores ICOLTRANS', vigentes: 72, vencidas: 8, por_vencer: 5 },
  { id: 2, codigo: 'CERT-2026-002', nombre: 'ISO 9001:2015 Auditor Interno', vigencia: 24, emisora: 'Bureau Veritas Colombia', vigentes: 18, vencidas: 2, por_vencer: 3 },
  { id: 3, codigo: 'CERT-2026-003', nombre: 'Primeros Auxilios y RCP', vigencia: 12, emisora: 'Cruz Roja Colombiana', vigentes: 38, vencidas: 6, por_vencer: 7 },
  { id: 4, codigo: 'CERT-2026-004', nombre: 'Manejo de Mercancías Peligrosas', vigencia: 24, emisora: 'Ministerio de Transporte', vigentes: 24, vencidas: 1, por_vencer: 4 },
  { id: 5, codigo: 'CERT-2026-005', nombre: 'Ética Empresarial y Compliance', vigencia: 12, emisora: 'ICOLTRANS Compliance', vigentes: 91, vencidas: 12, por_vencer: 8 },
  { id: 6, codigo: 'CERT-2026-006', nombre: 'Trabajo en Alturas Nivel 1', vigencia: 12, emisora: 'SENA', vigentes: 14, vencidas: 3, por_vencer: 2 },
]

const CERTIFICADOS_RECIENTES = [
  { colaborador: 'Juan Ramírez', cert: 'Certificación Conducción Segura C3', numero: 'CERT-2026-000142', emision: '2026-05-15', vencimiento: '2027-05-15', estado: 'VIGENTE' },
  { colaborador: 'María Torres', cert: 'Ética Empresarial y Compliance', numero: 'CERT-2026-000138', emision: '2026-05-10', vencimiento: '2027-05-10', estado: 'VIGENTE' },
  { colaborador: 'Carlos Vega', cert: 'ISO 9001:2015 Auditor Interno', numero: 'CERT-2026-000135', emision: '2026-04-28', vencimiento: '2028-04-28', estado: 'VIGENTE' },
  { colaborador: 'Ana Ruiz', cert: 'Primeros Auxilios y RCP', numero: 'CERT-2025-000089', emision: '2025-06-14', vencimiento: '2026-06-14', estado: 'POR_VENCER' },
  { colaborador: 'Pedro Díaz', cert: 'Manejo de Mercancías Peligrosas', numero: 'CERT-2024-000041', emision: '2024-03-20', vencimiento: '2026-03-20', estado: 'VENCIDA' },
  { colaborador: 'Laura Soto', cert: 'Trabajo en Alturas Nivel 1', numero: 'CERT-2026-000110', emision: '2026-02-08', vencimiento: '2027-02-08', estado: 'VIGENTE' },
]

export default function LMSCertificaciones() {
  const [tab, setTab] = useState(0)

  const totalVigentes  = CERTIFICACIONES.reduce((s, c) => s + c.vigentes, 0)
  const totalVencidas  = CERTIFICACIONES.reduce((s, c) => s + c.vencidas, 0)
  const totalPorVencer = CERTIFICACIONES.reduce((s, c) => s + c.por_vencer, 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WorkspacePremium sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Certificaciones</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
              Vigencia · Renovación · Alertas · Trazabilidad
            </Typography>
          </Box>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Certificados Vigentes', value: totalVigentes, color: '#059669', icon: <CheckCircle /> },
            { label: 'Por Vencer ≤30 días', value: totalPorVencer, color: '#F59E0B', icon: <Warning /> },
            { label: 'Vencidos', value: totalVencidas, color: '#EF4444', icon: <Warning /> },
            { label: 'Tipos de Certificación', value: CERTIFICACIONES.length, color: LMS_COLOR, icon: <WorkspacePremium /> },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ bgcolor: 'text.primary', border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${k.color} 0%, ${alpha(k.color, 0.6)} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  '& svg': { color: '#fff', fontSize: 20 },
                }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>{k.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: `${LMS_COLOR} !important` },
            '& .MuiTabs-indicator': { bgcolor: LMS_COLOR },
          }}>
          <Tab label="Tipos de Certificación" />
          <Tab label="Certificados Emitidos" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            {CERTIFICACIONES.map(c => {
              const total = c.vigentes + c.vencidas + c.por_vencer
              return (
                <Grid key={c.id} size={{ xs: 12, md: 6 }}>
                  <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
                      <Box sx={{
                        width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                        background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <WorkspacePremium sx={{ color: 'text.primary', fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, color: LMS_COLOR, fontWeight: 600 }}>{c.codigo}</Typography>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>{c.nombre}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25 }}>{c.emisora}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Chip label={`Vigencia: ${c.vigencia} meses`} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 10.5 }} />
                      <Chip label={`${c.vigentes} vigentes`} size="small" sx={{ bgcolor: alpha('#059669', 0.15), color: '#059669', fontSize: 10.5, fontWeight: 700 }} />
                      {c.por_vencer > 0 && <Chip label={`${c.por_vencer} por vencer`} size="small" sx={{ bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B', fontSize: 10.5, fontWeight: 700 }} />}
                      {c.vencidas > 0 && <Chip label={`${c.vencidas} vencidos`} size="small" sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', fontSize: 10.5, fontWeight: 700 }} />}
                    </Box>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Colaborador', 'Certificación', 'N° Certificado', 'Emisión', 'Vencimiento', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.35)', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CERTIFICADOS_RECIENTES.map((c, i) => {
                  const col = ESTADO_COLORS[c.estado] || LMS_COLOR
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(0,0,0,0.87)', fontWeight: 500 }}>{c.colaborador}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'rgba(0,0,0,0.6)' }}>{c.cert}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11.5, color: LMS_COLOR, fontFamily: 'monospace' }}>{c.numero}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>{c.emision}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>{c.vencimiento}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip label={c.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.3)}`, fontWeight: 700, fontSize: 10 }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
