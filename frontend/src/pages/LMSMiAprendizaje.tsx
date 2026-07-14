import React, { useState } from 'react'
import { Box, Typography, Tab, Tabs, LinearProgress, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { PlayArrow, CheckCircle, Schedule, WorkspacePremium } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'

const ESTADO_COLOR: Record<string, string> = {
  EN_PROGRESO: '#0EA5E9', INSCRITO: LMS_COLOR, COMPLETADO: '#059669', ABANDONADO: '#EF4444',
}

const MIS_CURSOS = [
  { id: 1, nombre: 'Conducción Defensiva Avanzada', modalidad: 'PRESENCIAL', progreso: 75, horas_completadas: 12, horas_total: 16, estado: 'EN_PROGRESO', vence: null, obligatorio: true },
  { id: 2, nombre: 'Ética y Compliance Empresarial', modalidad: 'VIRTUAL', progreso: 100, horas_completadas: 6, horas_total: 6, estado: 'COMPLETADO', vence: '2027-06-20', obligatorio: true },
  { id: 3, nombre: 'ISO 9001:2015 Fundamentos', modalidad: 'VIRTUAL', progreso: 45, horas_completadas: 3.6, horas_total: 8, estado: 'EN_PROGRESO', vence: null, obligatorio: false },
  { id: 4, nombre: 'Normatividad de Tránsito', modalidad: 'VIRTUAL', progreso: 100, horas_completadas: 4, horas_total: 4, estado: 'COMPLETADO', vence: '2027-01-15', obligatorio: true },
  { id: 5, nombre: 'Primeros Auxilios y RCP', modalidad: 'PRESENCIAL', progreso: 0, horas_completadas: 0, horas_total: 8, estado: 'INSCRITO', vence: null, obligatorio: true },
  { id: 6, nombre: 'Liderazgo Situacional', modalidad: 'VIRTUAL', progreso: 20, horas_completadas: 2, horas_total: 10, estado: 'EN_PROGRESO', vence: null, obligatorio: false },
]

const MIS_CERTIFICADOS = [
  { nombre: 'Certificación Conducción Segura', numero: 'CERT-2025-000012', emision: '2025-06-20', vencimiento: '2026-06-20', estado: 'POR_VENCER', diasRestantes: 0 },
  { nombre: 'Curso de Ética Empresarial', numero: 'CERT-2026-000031', emision: '2026-01-15', vencimiento: '2027-01-15', estado: 'VIGENTE', diasRestantes: 209 },
  { nombre: 'Normatividad de Tránsito', numero: 'CERT-2026-000047', emision: '2026-02-10', vencimiento: '2027-02-10', estado: 'VIGENTE', diasRestantes: 235 },
]

export default function LMSMiAprendizaje() {
  const [tab, setTab] = useState(0)

  const enProgreso = MIS_CURSOS.filter(c => c.estado === 'EN_PROGRESO').length
  const completados = MIS_CURSOS.filter(c => c.estado === 'COMPLETADO').length
  const horas_total = MIS_CURSOS.reduce((s, c) => s + c.horas_completadas, 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', mb: 0.5 }}>Mi Aprendizaje</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Tu progreso · Cursos activos · Certificaciones obtenidas</Typography>
        </Box>

        {/* Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'En Progreso', value: enProgreso, color: '#0EA5E9', icon: <PlayArrow /> },
            { label: 'Completados', value: completados, color: '#059669', icon: <CheckCircle /> },
            { label: 'Horas Completadas', value: `${horas_total.toFixed(1)}h`, color: LMS_COLOR, icon: <Schedule /> },
            { label: 'Certificaciones', value: MIS_CERTIFICADOS.length, color: '#7C3AED', icon: <WorkspacePremium /> },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{
                bgcolor: 'background.paper', border: '1px solid #E5E7EB', borderRadius: 2, p: 2,
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px',
                  background: `linear-gradient(135deg, ${s.color} 0%, ${alpha(s.color, 0.6)} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  '& svg': { color: '#fff', fontSize: 20 },
                }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{s.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: `${LMS_COLOR} !important` },
            '& .MuiTabs-indicator': { bgcolor: LMS_COLOR },
          }}
        >
          <Tab label={`Mis Cursos (${MIS_CURSOS.length})`} />
          <Tab label={`Mis Certificaciones (${MIS_CERTIFICADOS.length})`} />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            {MIS_CURSOS.map(c => {
              const col = ESTADO_COLOR[c.estado] || LMS_COLOR
              return (
                <Grid key={c.id} size={{ xs: 12, md: 6 }}>
                  <Box sx={{ bgcolor: 'background.paper', border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}>{c.nombre}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>{c.modalidad}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                        <Chip label={c.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.3)}`, fontSize: 10, fontWeight: 700 }} />
                        {c.obligatorio && <Chip label="Obligatorio" size="small" sx={{ bgcolor: alpha('#EF4444', 0.1), color: '#EF4444', fontSize: 10 }} />}
                      </Box>
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {c.horas_completadas}h / {c.horas_total}h completadas
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: col, fontWeight: 700 }}>{c.progreso}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={c.progreso}
                        sx={{
                          height: 7, borderRadius: 4,
                          bgcolor: '#F1F5F9',
                          '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 4 },
                        }}
                      />
                    </Box>

                    {c.vence && (
                      <Typography sx={{ fontSize: 11, color: '#10B981', mt: 0.5 }}>
                        Certif. válida hasta: {c.vence}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Certificación', 'N° Certificado', 'Emisión', 'Vencimiento', 'Estado', 'Días Restantes'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MIS_CERTIFICADOS.map((c, i) => {
                  const col = c.estado === 'VIGENTE' ? '#059669' : c.estado === 'POR_VENCER' ? '#F59E0B' : '#EF4444'
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'text.primary', fontWeight: 500 }}>{c.nombre}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: LMS_COLOR, fontFamily: 'monospace' }}>{c.numero}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'text.secondary' }}>{c.emision}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'text.secondary' }}>{c.vencimiento}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.3)}` }}>
                          {c.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: col }}>
                        {c.diasRestantes === 0 ? 'HOY' : `${c.diasRestantes} días`}
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
