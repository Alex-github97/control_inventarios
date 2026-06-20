import React, { useState } from 'react'
import { Box, Grid, Typography, Chip, LinearProgress, alpha } from '@mui/material'
import { PersonAdd, CheckCircle, Schedule, RadioButtonUnchecked } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(217,119,6,0.25)'
const DARK_BG   = '#060C1A'

const ESTADOS_COLOR: Record<string, string> = {
  EN_PROGRESO: '#0EA5E9', COMPLETADO: '#059669', PENDIENTE: '#F59E0B',
}

const ONBOARDINGS = [
  {
    id: 1, colaborador: 'Juan Ramírez', cargo: 'Conductor C3', area: 'Transporte',
    fecha_ingreso: '2026-06-01', estado: 'EN_PROGRESO', progreso: 62,
    cursos: [
      { nombre: 'Cultura y Valores ICOLTRANS', completado: true, obligatorio: true },
      { nombre: 'Ética y Compliance Empresarial', completado: true, obligatorio: true },
      { nombre: 'SST Inducción', completado: false, obligatorio: true },
      { nombre: 'Normatividad de Tránsito', completado: false, obligatorio: true },
      { nombre: 'Conducción Defensiva', completado: false, obligatorio: true },
      { nombre: 'Primeros Auxilios', completado: false, obligatorio: true },
    ],
  },
  {
    id: 2, colaborador: 'Laura Gómez', cargo: 'Coordinador de Calidad', area: 'Calidad',
    fecha_ingreso: '2026-05-15', estado: 'COMPLETADO', progreso: 100,
    cursos: [
      { nombre: 'Cultura y Valores ICOLTRANS', completado: true, obligatorio: true },
      { nombre: 'Ética y Compliance Empresarial', completado: true, obligatorio: true },
      { nombre: 'SST Inducción', completado: true, obligatorio: true },
      { nombre: 'ISO 9001 Fundamentos', completado: true, obligatorio: true },
      { nombre: 'Auditoría Interna', completado: true, obligatorio: false },
    ],
  },
  {
    id: 3, colaborador: 'Pedro Silva', cargo: 'Analista de Almacén', area: 'Logística',
    fecha_ingreso: '2026-06-15', estado: 'PENDIENTE', progreso: 0,
    cursos: [
      { nombre: 'Cultura y Valores ICOLTRANS', completado: false, obligatorio: true },
      { nombre: 'Ética y Compliance Empresarial', completado: false, obligatorio: true },
      { nombre: 'SST Inducción', completado: false, obligatorio: true },
      { nombre: 'Gestión de Inventarios WMS', completado: false, obligatorio: true },
    ],
  },
]

const CURSOS_OBLIGATORIOS = [
  { nombre: 'Cultura y Valores ICOLTRANS', horas: 2, asignados: 3 },
  { nombre: 'Ética y Compliance Empresarial', horas: 6, asignados: 3 },
  { nombre: 'SST Inducción', horas: 4, asignados: 3 },
  { nombre: 'Primeros Auxilios y RCP', horas: 8, asignados: 1 },
  { nombre: 'Normatividad de Tránsito', horas: 4, asignados: 1 },
]

export default function LMSOnboarding() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PersonAdd sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Onboarding</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Planes de inducción automáticos · Cursos obligatorios por cargo
            </Typography>
          </Box>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'En Proceso de Inducción', value: 1, color: '#0EA5E9', icon: <Schedule /> },
            { label: 'Inducciones Completadas', value: 1, color: '#059669', icon: <CheckCircle /> },
            { label: 'Pendientes de Inicio', value: 1, color: '#F59E0B', icon: <RadioButtonUnchecked /> },
            { label: 'Cursos Oblig. Asignados', value: CURSOS_OBLIGATORIOS.length, color: LMS_COLOR, icon: <PersonAdd /> },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${k.color} 0%, ${alpha(k.color, 0.6)} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  '& svg': { color: '#FFF', fontSize: 20 },
                }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF', lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mt: 0.25 }}>{k.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          {/* Lista de onboardings */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>Planes de Inducción Activos</Typography>
              </Box>
              {ONBOARDINGS.map(o => {
                const col = ESTADOS_COLOR[o.estado] || LMS_COLOR
                const expanded = selected === o.id
                return (
                  <Box
                    key={o.id}
                    onClick={() => setSelected(expanded ? null : o.id)}
                    sx={{
                      p: 2, borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>{o.colaborador}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{o.cargo} · {o.area}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>Ingreso: {o.fecha_ingreso}</Typography>
                      </Box>
                      <Chip label={o.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.3)}`, fontWeight: 700, fontSize: 10 }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {o.cursos.filter(c => c.completado).length}/{o.cursos.length} cursos completados
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: col, fontWeight: 700 }}>{o.progreso}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={o.progreso}
                      sx={{
                        height: 5, borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.07)',
                        '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 3 },
                      }}
                    />
                    {expanded && (
                      <Box sx={{ mt: 2 }}>
                        {o.cursos.map((c, ci) => (
                          <Box key={ci} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                            {c.completado
                              ? <CheckCircle sx={{ fontSize: 16, color: '#059669' }} />
                              : <RadioButtonUnchecked sx={{ fontSize: 16, color: 'rgba(255,255,255,0.2)' }} />
                            }
                            <Typography sx={{ fontSize: 12.5, color: c.completado ? '#FFF' : 'rgba(255,255,255,0.45)', flex: 1 }}>{c.nombre}</Typography>
                            {c.obligatorio && <Chip label="Obligatorio" size="small" sx={{ bgcolor: alpha('#EF4444', 0.1), color: '#EF4444', fontSize: 9 }} />}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          </Grid>

          {/* Cursos obligatorios para onboarding */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF', mb: 2 }}>
                Cursos Obligatorios de Inducción
              </Typography>
              {CURSOS_OBLIGATORIOS.map((c, i) => (
                <Box key={i} sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography sx={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>{c.nombre}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={`${c.horas}h`} size="small" sx={{ bgcolor: alpha(LMS_COLOR, 0.12), color: LMS_COLOR, fontSize: 10 }} />
                    <Chip label={`${c.asignados} asignados`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
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
