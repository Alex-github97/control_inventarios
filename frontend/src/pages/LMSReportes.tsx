import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { Assessment, Download, TrendingUp } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'

const KPI_AREA = [
  { area: 'Transporte',   horas: 842, completados: 134, cumplimiento: 91, brecha: 8,  color: '#EF4444' },
  { area: 'Almacén',      horas: 614, completados: 98,  cumplimiento: 84, brecha: 14, color: '#F59E0B' },
  { area: 'Calidad',      horas: 378, completados: 62,  cumplimiento: 94, brecha: 5,  color: '#059669' },
  { area: 'RR.HH.',       horas: 212, completados: 38,  cumplimiento: 88, brecha: 10, color: '#0EA5E9' },
  { area: 'Comercial',    horas: 184, completados: 24,  cumplimiento: 74, brecha: 21, color: '#EF4444' },
  { area: 'TI',           horas: 156, completados: 19,  cumplimiento: 79, brecha: 18, color: '#F59E0B' },
  { area: 'GRC',          horas: 201, completados: 31,  cumplimiento: 87, brecha: 12, color: '#F59E0B' },
  { area: 'Presidencia',  horas: 88,  completados: 12,  cumplimiento: 96, brecha: 4,  color: '#059669' },
]

const COMPLIANCE_MATRIX = [
  { area: 'Transporte', seguridad_vial: 98, compliance: 91, sst: 88, iso: 72, total: 87 },
  { area: 'Almacén',    seguridad_vial: 74, compliance: 89, sst: 92, iso: 81, total: 84 },
  { area: 'Calidad',    seguridad_vial: 68, compliance: 94, sst: 96, iso: 99, total: 89 },
  { area: 'Comercial',  seguridad_vial: 65, compliance: 71, sst: 82, iso: 58, total: 69 },
  { area: 'RR.HH.',     seguridad_vial: 70, compliance: 88, sst: 91, iso: 74, total: 81 },
]

const CURSOS_TOP = [
  { nombre: 'Seguridad Vial Avanzada',         inscritos: 148, completados: 132, prom: 86.4 },
  { nombre: 'Inducción ICOLTRANS 2026',        inscritos: 143, completados: 143, prom: 92.1 },
  { nombre: 'Ética y Compliance',              inscritos: 121, completados: 109, prom: 88.7 },
  { nombre: 'Conducción Defensiva',            inscritos: 98,  completados: 87,  prom: 81.2 },
  { nombre: 'ISO 9001 Auditor Interno',        inscritos: 42,  completados: 34,  prom: 79.8 },
]

const maxHoras = Math.max(...KPI_AREA.map(k => k.horas))

function getCellColor(val: number): string {
  if (val >= 90) return '#059669'
  if (val >= 80) return '#D97706'
  if (val >= 70) return '#F59E0B'
  return '#EF4444'
}

export default function LMSReportes() {
  const [tab, setTab] = useState(0)

  const totalHoras      = KPI_AREA.reduce((s, k) => s + k.horas, 0)
  const totalCompletados = KPI_AREA.reduce((s, k) => s + k.completados, 0)
  const promedCumplimiento = Math.round(KPI_AREA.reduce((s, k) => s + k.cumplimiento, 0) / KPI_AREA.length)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px',
              background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Assessment sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Reportes y Analítica</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                KPIs por área · Horas de capacitación · Matriz de compliance
              </Typography>
            </Box>
          </Box>
          <Chip icon={<Download sx={{ fontSize: 16 }} />} label="Exportar Excel" onClick={() => {}}
            sx={{ bgcolor: alpha(LMS_COLOR, 0.15), color: LMS_COLOR, border: `1px solid ${alpha(LMS_COLOR, 0.3)}`, cursor: 'pointer', fontWeight: 600 }} />
        </Box>

        {/* Global KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Horas Totales', value: totalHoras.toLocaleString(), unit: 'h', color: LMS_COLOR },
            { label: 'Cursos Completados', value: totalCompletados, unit: '', color: '#059669' },
            { label: 'Cumplimiento Promedio', value: `${promedCumplimiento}%`, unit: '', color: '#0EA5E9' },
            { label: 'Áreas Evaluadas', value: KPI_AREA.length, unit: '', color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
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
          <Tab label="KPIs por Área" />
          <Tab label="Horas de Capacitación" />
          <Tab label="Matriz de Compliance" />
          <Tab label="Top Cursos" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Área', 'Horas', 'Completados', 'Cumplimiento', 'Brecha', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KPI_AREA.map((k, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary', fontWeight: 600 }}>{k.area}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: LMS_COLOR, fontWeight: 700 }}>{k.horas}h</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#059669', fontWeight: 600 }}>{k.completados}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 60, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${k.cumplimiento}%`, bgcolor: k.color, borderRadius: 3 }} />
                        </Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: k.color }}>{k.cumplimiento}%</Typography>
                      </Box>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: k.brecha > 15 ? '#EF4444' : '#64748B' }}>{k.brecha}%</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Chip
                        label={k.cumplimiento >= 90 ? 'Óptimo' : k.cumplimiento >= 80 ? 'Aceptable' : 'Crítico'}
                        size="small"
                        sx={{ bgcolor: alpha(k.color, 0.15), color: k.color, border: `1px solid ${alpha(k.color, 0.3)}`, fontSize: 10, fontWeight: 700 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 3 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 3 }}>Horas de Capacitación por Área</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {KPI_AREA.sort((a, b) => b.horas - a.horas).map((k, i) => {
                const pct = (k.horas / maxHoras) * 100
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', width: 90, flexShrink: 0 }}>{k.area}</Typography>
                    <Box sx={{ flex: 1, height: 22, borderRadius: 1.5, bgcolor: '#F1F5F9', overflow: 'hidden', position: 'relative' }}>
                      <Box sx={{
                        height: '100%', width: `${pct}%`, borderRadius: 1.5,
                        background: `linear-gradient(90deg, ${LMS_COLOR} 0%, #B45309 100%)`,
                        transition: 'width 0.6s ease',
                        display: 'flex', alignItems: 'center', px: 1.5,
                      }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{k.horas}h</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', width: 80, textAlign: 'right', flexShrink: 0 }}>
                      {k.completados} cursos
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #F1F5F9' }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {[
                  { label: '≥90% Óptimo', color: '#059669' },
                  { label: '80-89% Aceptable', color: LMS_COLOR },
                  { label: '70-79% Alerta', color: '#F59E0B' },
                  { label: '<70% Crítico', color: '#EF4444' },
                ].map((l, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: l.color }} />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{l.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Área', 'Seguridad Vial', 'Compliance', 'SST', 'ISO 9001', 'Total'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Área' ? 'left' : 'center', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPLIANCE_MATRIX.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary', fontWeight: 600 }}>{row.area}</td>
                      {[row.seguridad_vial, row.compliance, row.sst, row.iso, row.total].map((val, j) => {
                        const col = getCellColor(val)
                        return (
                          <td key={j} style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, bgcolor: alpha(col, 0.15), border: `1px solid ${alpha(col, 0.3)}` }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: col }}>{val}%</Typography>
                            </Box>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 3 && (
          <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Curso', 'Inscritos', 'Completados', 'Promedio', 'Tasa'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CURSOS_TOP.map((c, i) => {
                  const tasa = Math.round((c.completados / c.inscritos) * 100)
                  const col  = tasa >= 90 ? '#059669' : tasa >= 80 ? LMS_COLOR : '#F59E0B'
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: LMS_COLOR }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary', fontWeight: 500 }}>{c.nombre}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.secondary', textAlign: 'center' }}>{c.inscritos}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#059669', fontWeight: 700, textAlign: 'center' }}>{c.completados}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: LMS_COLOR, fontWeight: 700 }}>{c.prom}%</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip label={`${tasa}%`} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.25)}`, fontWeight: 700, fontSize: 11 }} />
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
