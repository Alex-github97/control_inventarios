import React, { useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Quiz, CheckCircle, Timer, TrendingUp } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'

const TIPO_COLORS: Record<string, string> = {
  DIAGNOSTICO: '#6D28D9', FORMATIVO: '#0EA5E9', CERTIFICACION: LMS_COLOR,
  RECERTIFICACION: '#F59E0B', PRACTICO: '#EF4444',
}

const EVALUACIONES = [
  { id: 1, codigo: 'EVL-2026-001', nombre: 'Diagnóstico Seguridad Vial', tipo: 'DIAGNOSTICO', curso: 'Conducción Defensiva', preguntas: 30, tiempo: 45, aprobacion: 70, intentos: 47, tasa_aprobacion: 72 },
  { id: 2, codigo: 'EVL-2026-002', nombre: 'Examen ISO 9001 Módulo 1', tipo: 'FORMATIVO', curso: 'ISO 9001 Fundamentos', preguntas: 20, tiempo: 30, aprobacion: 80, intentos: 34, tasa_aprobacion: 68 },
  { id: 3, codigo: 'EVL-2026-003', nombre: 'Certificación Conductor C3', tipo: 'CERTIFICACION', curso: 'Conducción Defensiva', preguntas: 50, tiempo: 90, aprobacion: 85, intentos: 61, tasa_aprobacion: 77 },
  { id: 4, codigo: 'EVL-2026-004', nombre: 'Recertificación Primeros Auxilios', tipo: 'RECERTIFICACION', curso: 'Primeros Auxilios', preguntas: 25, tiempo: 40, aprobacion: 80, intentos: 28, tasa_aprobacion: 89 },
  { id: 5, codigo: 'EVL-2026-005', nombre: 'Evaluación Práctica de Almacén', tipo: 'PRACTICO', curso: 'Gestión de Inventarios', preguntas: 15, tiempo: 60, aprobacion: 75, intentos: 19, tasa_aprobacion: 84 },
  { id: 6, codigo: 'EVL-2026-006', nombre: 'Test de Compliance Final', tipo: 'CERTIFICACION', curso: 'Ética y Compliance', preguntas: 40, tiempo: 60, aprobacion: 85, intentos: 52, tasa_aprobacion: 81 },
]

const INTENTOS_RECIENTES = [
  { colaborador: 'Juan Ramírez', evaluacion: 'Certificación Conductor C3', puntaje: 88, aprobado: true, fecha: '2026-06-19' },
  { colaborador: 'María Torres', evaluacion: 'Examen ISO 9001 Módulo 1', puntaje: 64, aprobado: false, fecha: '2026-06-18' },
  { colaborador: 'Carlos Vega', evaluacion: 'Test de Compliance Final', puntaje: 91, aprobado: true, fecha: '2026-06-18' },
  { colaborador: 'Laura Soto', evaluacion: 'Diagnóstico Seguridad Vial', puntaje: 78, aprobado: true, fecha: '2026-06-17' },
  { colaborador: 'Pedro Díaz', evaluacion: 'Evaluación Práctica de Almacén', puntaje: 82, aprobado: true, fecha: '2026-06-17' },
]

export default function LMSEvaluaciones() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Quiz sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Evaluaciones</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Diagnóstico · Formativo · Certificación · Práctico
            </Typography>
          </Box>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Evaluaciones Activas', value: EVALUACIONES.length, color: LMS_COLOR, icon: <Quiz /> },
            { label: 'Total Intentos', value: EVALUACIONES.reduce((s, e) => s + e.intentos, 0), color: '#0EA5E9', icon: <TrendingUp /> },
            { label: 'Tasa Promedio Aprobación', value: `${Math.round(EVALUACIONES.reduce((s, e) => s + e.tasa_aprobacion, 0) / EVALUACIONES.length)}%`, color: '#059669', icon: <CheckCircle /> },
            { label: 'Tiempo Máx. Promedio', value: `${Math.round(EVALUACIONES.reduce((s, e) => s + e.tiempo, 0) / EVALUACIONES.length)} min`, color: '#7C3AED', icon: <Timer /> },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${k.color} 0%, ${alpha(k.color, 0.6)} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  '& svg': { color: '#fff', fontSize: 20 },
                }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{k.label}</Typography>
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
          <Tab label="Evaluaciones" />
          <Tab label="Intentos Recientes" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            {EVALUACIONES.map(e => {
              const col = TIPO_COLORS[e.tipo] || LMS_COLOR
              const tasaCol = e.tasa_aprobacion >= 80 ? '#059669' : e.tasa_aprobacion >= 65 ? LMS_COLOR : '#EF4444'
              return (
                <Grid key={e.id} size={{ xs: 12, md: 6 }}>
                  <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: 11.5, color: LMS_COLOR, fontWeight: 600, mb: 0.25 }}>{e.codigo}</Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>{e.nombre}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{e.curso}</Typography>
                      </Box>
                      <Chip label={e.tipo} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.3)}`, fontSize: 10, fontWeight: 700 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Preguntas', val: e.preguntas },
                        { label: 'Tiempo', val: `${e.tiempo} min` },
                        { label: 'Aprobación', val: `${e.aprobacion}%` },
                        { label: 'Intentos', val: e.intentos },
                      ].map((m, j) => (
                        <Box key={j}>
                          <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{m.val}</Typography>
                          <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{m.label}</Typography>
                        </Box>
                      ))}
                      <Box>
                        <Typography sx={{ fontSize: 16, fontWeight: 800, color: tasaCol, lineHeight: 1 }}>{e.tasa_aprobacion}%</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Tasa Aprobación</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        )}

        {tab === 1 && (
          <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Colaborador', 'Evaluación', 'Puntaje', 'Resultado', 'Fecha'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INTENTOS_RECIENTES.map((i, idx) => {
                  const col = i.aprobado ? '#059669' : '#EF4444'
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary', fontWeight: 500 }}>{i.colaborador}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'text.secondary' }}>{i.evaluacion}</td>
                      <td style={{ padding: '10px 14px', fontSize: 15, fontWeight: 800, color: col }}>{i.puntaje}%</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip
                          label={i.aprobado ? 'APROBADO' : 'REPROBADO'}
                          size="small"
                          sx={{ bgcolor: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.3)}`, fontWeight: 700, fontSize: 10 }}
                        />
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'text.secondary' }}>{i.fecha}</td>
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
