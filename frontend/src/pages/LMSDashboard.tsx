import React from 'react'
import { Box, Grid, Typography, LinearProgress, Chip, alpha } from '@mui/material'
import {
  School, WorkspacePremium, TrendingUp, People,
  CheckCircle, Warning, Psychology, AutoAwesome,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR  = '#D97706'
const CARD_BG    = '#0F1E35'
const CARD_BOR   = 'rgba(217,119,6,0.25)'
const DARK_BG    = '#060C1A'

const kpis = [
  { label: 'Cursos Publicados',       value: 48,     unit: 'cursos',   icon: <School />,           color: LMS_COLOR },
  { label: 'Inscripciones Activas',   value: 312,    unit: 'usuarios', icon: <People />,            color: '#0EA5E9' },
  { label: 'Tasa de Finalización',    value: '76%',  unit: '',         icon: <TrendingUp />,        color: '#059669' },
  { label: 'Certificados Vigentes',   value: 184,    unit: 'cert.',    icon: <WorkspacePremium />,  color: '#7C3AED' },
  { label: 'Certificados Por Vencer', value: 23,     unit: 'cert.',    icon: <Warning />,           color: '#EF4444' },
  { label: 'Brechas Competencias',    value: 47,     unit: 'brechas',  icon: <Psychology />,        color: '#F59E0B' },
  { label: 'Cursos Completados Mes',  value: 89,     unit: 'compl.',   icon: <CheckCircle />,       color: '#10B981' },
  { label: 'IA Recomendaciones',      value: 215,    unit: 'suger.',   icon: <AutoAwesome />,       color: '#8B5CF6' },
]

const topCursos = [
  { nombre: 'Conducción Defensiva', inscritos: 87, completados: 62, pct: 71 },
  { nombre: 'Seguridad Vial Integral', inscritos: 74, completados: 58, pct: 78 },
  { nombre: 'ISO 9001 Fundamentos', inscritos: 66, completados: 41, pct: 62 },
  { nombre: 'Manejo de Cargas y Estibas', inscritos: 59, completados: 47, pct: 80 },
  { nombre: 'Ética Empresarial y Compliance', inscritos: 52, completados: 38, pct: 73 },
]

const certsVencer = [
  { colaborador: 'Carlos Mendoza', cert: 'Lic. Conducción C3', dias: 8 },
  { colaborador: 'Ana Ruiz',       cert: 'Primeros Auxilios',  dias: 14 },
  { colaborador: 'Luis Pérez',     cert: 'Altura Segura',      dias: 19 },
  { colaborador: 'María Torres',   cert: 'Mercancías Peligrosas', dias: 27 },
]

const cumplimientoArea = [
  { area: 'Transporte',   pct: 88 },
  { area: 'Almacén',      pct: 82 },
  { area: 'Calidad',      pct: 91 },
  { area: 'Comercial',    pct: 74 },
  { area: 'RR.HH.',       pct: 79 },
  { area: 'Operaciones',  pct: 85 },
]

function KPICard({ kpi }: { kpi: typeof kpis[0] }) {
  return (
    <Box sx={{
      bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2,
      p: 2, display: 'flex', alignItems: 'center', gap: 2, height: 90,
    }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
        background: `linear-gradient(135deg, ${kpi.color} 0%, ${alpha(kpi.color, 0.6)} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${alpha(kpi.color, 0.35)}`,
        '& svg': { color: '#FFF', fontSize: 22 },
      }}>
        {kpi.icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#FFF', lineHeight: 1 }}>
          {kpi.value}
          {kpi.unit && <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', ml: 0.5 }}>{kpi.unit}</Typography>}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', mt: 0.3 }}>{kpi.label}</Typography>
      </Box>
    </Box>
  )
}

export default function LMSDashboard() {
  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(LMS_COLOR, 0.4)}`,
          }}>
            <School sx={{ color: '#FFF', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#FFF', lineHeight: 1.2 }}>
              Torre de Control — LMS
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Universidad Corporativa Digital · Formación · Competencias · Certificaciones
            </Typography>
          </Box>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((k, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <KPICard kpi={k} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          {/* Top Cursos */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF', mb: 2 }}>
                Top 5 Cursos por Inscripciones
              </Typography>
              {topCursos.map((c, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', flex: 1 }}>{c.nombre}</Typography>
                    <Typography sx={{ fontSize: 12, color: LMS_COLOR, fontWeight: 700, ml: 1 }}>{c.pct}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={c.pct}
                    sx={{
                      height: 6, borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.07)',
                      '& .MuiLinearProgress-bar': { bgcolor: LMS_COLOR, borderRadius: 3 },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>{c.inscritos} inscritos</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>·</Typography>
                    <Typography sx={{ fontSize: 10.5, color: '#10B981' }}>{c.completados} completados</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Cumplimiento por Área */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF', mb: 2 }}>
                Cumplimiento de Formación por Área
              </Typography>
              {cumplimientoArea.map((a, i) => {
                const col = a.pct >= 85 ? '#10B981' : a.pct >= 70 ? LMS_COLOR : '#EF4444'
                return (
                  <Box key={i} sx={{ mb: 1.8 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>{a.area}</Typography>
                      <Typography sx={{ fontSize: 12, color: col, fontWeight: 700 }}>{a.pct}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={a.pct}
                      sx={{
                        height: 6, borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.07)',
                        '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 3 },
                      }}
                    />
                  </Box>
                )
              })}
            </Box>
          </Grid>

          {/* Certificados por Vencer */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF', mb: 2 }}>
                Certificaciones Próximas a Vencer
              </Typography>
              {certsVencer.map((c, i) => {
                const col = c.dias <= 10 ? '#EF4444' : c.dias <= 20 ? '#F59E0B' : LMS_COLOR
                return (
                  <Box key={i} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <Box>
                      <Typography sx={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>{c.colaborador}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>{c.cert}</Typography>
                    </Box>
                    <Chip
                      label={`${c.dias} días`}
                      size="small"
                      sx={{
                        bgcolor: alpha(col, 0.15), color: col,
                        border: `1px solid ${alpha(col, 0.3)}`,
                        fontWeight: 700, fontSize: 11,
                      }}
                    />
                  </Box>
                )
              })}
            </Box>
          </Grid>

          {/* Escuelas */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF', mb: 2 }}>
                Actividad por Escuela
              </Typography>
              {[
                { nombre: 'Escuela de Conductores', cursos: 12, inscritos: 94, color: '#EF4444' },
                { nombre: 'Escuela de Operaciones', cursos: 9,  inscritos: 71, color: LMS_COLOR },
                { nombre: 'Escuela de Calidad',     cursos: 8,  inscritos: 55, color: '#059669' },
                { nombre: 'Escuela de Liderazgo',   cursos: 7,  inscritos: 48, color: '#7C3AED' },
                { nombre: 'Escuela de Seguridad',   cursos: 6,  inscritos: 44, color: '#F59E0B' },
              ].map((e, i) => (
                <Box key={i} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.color }} />
                    <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{e.nombre}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={`${e.cursos} cursos`} size="small" sx={{ fontSize: 10.5, bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }} />
                    <Chip label={`${e.inscritos} inscritos`} size="small" sx={{ fontSize: 10.5, bgcolor: alpha(e.color, 0.12), color: e.color }} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
