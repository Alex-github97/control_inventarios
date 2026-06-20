import React, { useState } from 'react'
import { Box, Grid, Typography, Chip, LinearProgress, alpha } from '@mui/material'
import { Route, CheckCircle, RadioButtonUnchecked, ArrowForward } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(217,119,6,0.25)'
const DARK_BG   = '#060C1A'

const RUTAS = [
  {
    id: 1, codigo: 'RUT-2026-001',
    nombre: 'Ruta del Conductor Profesional',
    descripcion: 'Formación completa para conductores: seguridad, normatividad, servicio y emergencias',
    cargo_objetivo: 'Conductor C2/C3', area_objetivo: 'Transporte',
    horas: 48, inscritos: 94, completados: 41, color: '#EF4444',
    cursos: [
      { nombre: 'Normatividad de Tránsito', horas: 4, completado: true },
      { nombre: 'Conducción Defensiva Avanzada', horas: 16, completado: true },
      { nombre: 'Seguridad Vial Integral', horas: 12, completado: false },
      { nombre: 'Primeros Auxilios y RCP', horas: 8, completado: false },
      { nombre: 'Servicio al Cliente', horas: 3, completado: false },
      { nombre: 'Manejo de Mercancías Peligrosas', horas: 5, completado: false },
    ],
  },
  {
    id: 2, codigo: 'RUT-2026-002',
    nombre: 'Ruta del Supervisor de Calidad',
    descripcion: 'Dominio de ISO 9001, auditorías internas, indicadores y CAPA',
    cargo_objetivo: 'Supervisor de Calidad', area_objetivo: 'Calidad',
    horas: 38, inscritos: 28, completados: 12, color: '#059669',
    cursos: [
      { nombre: 'ISO 9001:2015 Fundamentos', horas: 8, completado: true },
      { nombre: 'Auditorías Internas ISO', horas: 12, completado: false },
      { nombre: 'Indicadores de Calidad', horas: 6, completado: false },
      { nombre: 'CAPA y Análisis Causa Raíz', horas: 8, completado: false },
      { nombre: 'Mejora Continua Lean', horas: 4, completado: false },
    ],
  },
  {
    id: 3, codigo: 'RUT-2026-003',
    nombre: 'Ruta de Liderazgo Operacional',
    descripcion: 'Desarrollo de habilidades de dirección, comunicación y gestión de equipos',
    cargo_objetivo: 'Coordinador / Jefe', area_objetivo: 'Todas las áreas',
    horas: 55, inscritos: 44, completados: 8, color: '#7C3AED',
    cursos: [
      { nombre: 'Liderazgo Situacional', horas: 10, completado: true },
      { nombre: 'Comunicación Efectiva', horas: 8, completado: false },
      { nombre: 'Gestión del Tiempo', horas: 6, completado: false },
      { nombre: 'Coaching de Equipos', horas: 12, completado: false },
      { nombre: 'Manejo de Conflictos', horas: 8, completado: false },
      { nombre: 'Gestión por Resultados', horas: 11, completado: false },
    ],
  },
  {
    id: 4, codigo: 'RUT-2026-004',
    nombre: 'Ruta de Inducción Corporativa',
    descripcion: 'Bienvenida a ICOLTRANS: cultura, procesos, seguridad y compliance',
    cargo_objetivo: 'Todos los cargos nuevos', area_objetivo: 'General',
    horas: 16, inscritos: 31, completados: 25, color: LMS_COLOR,
    cursos: [
      { nombre: 'Cultura y Valores ICOLTRANS', horas: 2, completado: true },
      { nombre: 'Ética y Compliance Empresarial', horas: 6, completado: true },
      { nombre: 'SST Inducción', horas: 4, completado: false },
      { nombre: 'Procesos Operativos', horas: 4, completado: false },
    ],
  },
]

export default function LMSRutas() {
  const [seleccionada, setSeleccionada] = useState<number | null>(null)

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Route sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Rutas de Aprendizaje</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Itinerarios formativos por cargo, área y competencias
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {RUTAS.map(r => {
            const pct = Math.round((r.completados / Math.max(r.inscritos, 1)) * 100)
            const completadosCurso = r.cursos.filter(c => c.completado).length
            const progPersonal = Math.round((completadosCurso / r.cursos.length) * 100)
            const expanded = seleccionada === r.id

            return (
              <Grid key={r.id} size={{ xs: 12, lg: 6 }}>
                <Box
                  onClick={() => setSeleccionada(expanded ? null : r.id)}
                  sx={{
                    bgcolor: CARD_BG,
                    border: `1px solid ${expanded ? alpha(r.color, 0.5) : CARD_BOR}`,
                    borderRadius: 2, p: 2.5, cursor: 'pointer',
                    '&:hover': { border: `1px solid ${alpha(r.color, 0.4)}` },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: LMS_COLOR, fontWeight: 600 }}>{r.codigo}</Typography>
                        <ArrowForward sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }} />
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF', lineHeight: 1.3 }}>{r.nombre}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', mt: 0.5 }}>{r.descripcion}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                    <Chip label={r.cargo_objetivo} size="small" sx={{ bgcolor: alpha(r.color, 0.12), color: r.color, border: `1px solid ${alpha(r.color, 0.25)}`, fontSize: 10.5 }} />
                    <Chip label={r.area_objetivo} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 10.5 }} />
                    <Chip label={`${r.horas}h totales`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 10.5 }} />
                  </Box>

                  {/* Progress global */}
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>{r.inscritos} inscritos · {r.completados} completados</Typography>
                      <Typography sx={{ fontSize: 12, color: r.color, fontWeight: 700 }}>{pct}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 5, borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.07)',
                        '& .MuiLinearProgress-bar': { bgcolor: r.color, borderRadius: 3 },
                      }}
                    />
                  </Box>

                  {/* Detalle de cursos (expandible) */}
                  {expanded && (
                    <Box sx={{ mt: 2, borderTop: '1px solid rgba(255,255,255,0.06)', pt: 2 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', mb: 1.5, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                        Itinerario · Mi progreso ({completadosCurso}/{r.cursos.length})
                      </Typography>
                      {r.cursos.map((c, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Box sx={{
                            width: 22, height: 22, borderRadius: '50%',
                            bgcolor: c.completado ? alpha(r.color, 0.2) : 'rgba(255,255,255,0.06)',
                            border: `2px solid ${c.completado ? r.color : 'rgba(255,255,255,0.12)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {c.completado
                              ? <CheckCircle sx={{ fontSize: 12, color: r.color }} />
                              : <RadioButtonUnchecked sx={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }} />
                            }
                          </Box>
                          <Typography sx={{
                            fontSize: 12.5,
                            color: c.completado ? '#FFF' : 'rgba(255,255,255,0.45)',
                            textDecoration: c.completado ? 'none' : 'none',
                            flex: 1,
                          }}>
                            {idx + 1}. {c.nombre}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{c.horas}h</Typography>
                        </Box>
                      ))}
                      <Box sx={{ mt: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Mi avance personal</Typography>
                          <Typography sx={{ fontSize: 11.5, color: r.color, fontWeight: 700 }}>{progPersonal}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progPersonal}
                          sx={{
                            height: 4, borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.07)',
                            '& .MuiLinearProgress-bar': { bgcolor: r.color, borderRadius: 2 },
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Layout>
  )
}
