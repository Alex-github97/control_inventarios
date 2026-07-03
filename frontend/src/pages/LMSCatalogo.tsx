import React, { useState } from 'react'
import { Box, Grid, Typography, Chip, InputBase, alpha, LinearProgress } from '@mui/material'
import { Search, AccessTime, Person, MenuBook } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const #E5E7EB  = '#E5E7EB'

const MOD_COLORS: Record<string, string> = {
  VIRTUAL: '#0EA5E9', PRESENCIAL: '#059669', HIBRIDO: '#7C3AED',
  MICROLEARNING: '#F59E0B', WEBINAR: '#BE185D', SIMULACION: '#EF4444',
}
const NIV_COLORS: Record<string, string> = {
  BASICO: '#059669', INTERMEDIO: LMS_COLOR, AVANZADO: '#EF4444', EXPERTO: '#7C3AED',
}

const CURSOS = [
  { id: 1, codigo: 'CRS-2026-001', nombre: 'Conducción Defensiva Avanzada', modalidad: 'PRESENCIAL', nivel: 'AVANZADO', categoria: 'Conductores', horas: 16, instructor: 'Carlos Vargas', inscritos: 87, completados: 62, obligatorio: true },
  { id: 2, codigo: 'CRS-2026-002', nombre: 'Seguridad Vial Integral', modalidad: 'HIBRIDO', nivel: 'INTERMEDIO', categoria: 'Conductores', horas: 12, instructor: 'María Rincón', inscritos: 74, completados: 58, obligatorio: true },
  { id: 3, codigo: 'CRS-2026-003', nombre: 'ISO 9001:2015 Fundamentos', modalidad: 'VIRTUAL', nivel: 'BASICO', categoria: 'Calidad', horas: 8, instructor: 'Andrea López', inscritos: 66, completados: 41, obligatorio: false },
  { id: 4, codigo: 'CRS-2026-004', nombre: 'Manejo de Cargas y Estibas', modalidad: 'PRESENCIAL', nivel: 'BASICO', categoria: 'Operaciones', horas: 4, instructor: 'Pablo Soto', inscritos: 59, completados: 47, obligatorio: true },
  { id: 5, codigo: 'CRS-2026-005', nombre: 'Ética y Compliance Empresarial', modalidad: 'VIRTUAL', nivel: 'BASICO', categoria: 'Compliance', horas: 6, instructor: 'Julia Mora', inscritos: 52, completados: 38, obligatorio: true },
  { id: 6, codigo: 'CRS-2026-006', nombre: 'Liderazgo Situacional', modalidad: 'VIRTUAL', nivel: 'INTERMEDIO', categoria: 'Liderazgo', horas: 10, instructor: 'Roberto Díaz', inscritos: 44, completados: 30, obligatorio: false },
  { id: 7, codigo: 'CRS-2026-007', nombre: 'Primeros Auxilios y RCP', modalidad: 'PRESENCIAL', nivel: 'BASICO', categoria: 'SST', horas: 8, instructor: 'Camila Torres', inscritos: 41, completados: 39, obligatorio: true },
  { id: 8, codigo: 'CRS-2026-008', nombre: 'Excel Avanzado para Operaciones', modalidad: 'VIRTUAL', nivel: 'AVANZADO', categoria: 'Tecnología', horas: 20, instructor: 'Diego Herrera', inscritos: 38, completados: 22, obligatorio: false },
  { id: 9, codigo: 'CRS-2026-009', nombre: 'Normatividad de Tránsito', modalidad: 'VIRTUAL', nivel: 'BASICO', categoria: 'Conductores', horas: 4, instructor: 'Felipe Muñoz', inscritos: 78, completados: 72, obligatorio: true },
  { id: 10, codigo: 'CRS-2026-010', nombre: 'Gestión de Inventarios WMS', modalidad: 'HIBRIDO', nivel: 'INTERMEDIO', categoria: 'Logística', horas: 12, instructor: 'Sandra Gil', inscritos: 35, completados: 21, obligatorio: false },
  { id: 11, codigo: 'CRS-2026-011', nombre: 'Servicio al Cliente Excelente', modalidad: 'MICROLEARNING', nivel: 'BASICO', categoria: 'Comercial', horas: 3, instructor: 'Lina Cárdenas', inscritos: 61, completados: 50, obligatorio: false },
  { id: 12, codigo: 'CRS-2026-012', nombre: 'Simulación de Emergencias', modalidad: 'SIMULACION', nivel: 'EXPERTO', categoria: 'SST', horas: 24, instructor: 'Andrés Reyes', inscritos: 28, completados: 14, obligatorio: true },
]

const CATEGORIAS = ['Todos', 'Conductores', 'Calidad', 'Operaciones', 'Compliance', 'Liderazgo', 'SST', 'Tecnología', 'Logística', 'Comercial']
const MODALIDADES = ['Todas', 'VIRTUAL', 'PRESENCIAL', 'HIBRIDO', 'MICROLEARNING', 'WEBINAR', 'SIMULACION']

export default function LMSCatalogo() {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [modalidad, setModalidad] = useState('Todas')

  const filtrados = CURSOS.filter(c => {
    const matchBusq = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat  = categoria === 'Todos' || c.categoria === categoria
    const matchMod  = modalidad === 'Todas' || c.modalidad === modalidad
    return matchBusq && matchCat && matchMod
  })

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MenuBook sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              Catálogo de Cursos
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
              {CURSOS.length} cursos disponibles · Virtuales, Presenciales, Híbridos
            </Typography>
          </Box>
        </Box>

        {/* Busqueda */}
        <Box sx={{
          display: 'flex', gap: 1, mb: 2,
          bgcolor: 'text.primary', border: `1px solid #E5E7EB`,
          borderRadius: 2, px: 2, py: 1, alignItems: 'center',
        }}>
          <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
          <InputBase
            placeholder="Buscar cursos por nombre o código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            sx={{ flex: 1, color: 'text.primary', fontSize: 13.5 }}
          />
        </Box>

        {/* Filtro categoría */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          {CATEGORIAS.map(c => (
            <Chip
              key={c}
              label={c}
              size="small"
              onClick={() => setCategoria(c)}
              sx={{
                cursor: 'pointer',
                bgcolor: categoria === c ? LMS_COLOR : '#F1F5F9',
                color: categoria === c ? '#FFF' : 'text.secondary',
                fontWeight: categoria === c ? 700 : 400,
                '&:hover': { bgcolor: categoria === c ? LMS_COLOR : '#E2E8F0' },
              }}
            />
          ))}
        </Box>

        {/* Filtro modalidad */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {MODALIDADES.map(m => {
            const col = MOD_COLORS[m] || LMS_COLOR
            const active = modalidad === m
            return (
              <Chip
                key={m}
                label={m === 'Todas' ? 'Todas las modalidades' : m.charAt(0) + m.slice(1).toLowerCase()}
                size="small"
                onClick={() => setModalidad(m)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: active ? alpha(col, 0.2) : 'transparent',
                  color: active ? col : 'text.disabled',
                  border: `1px solid ${active ? alpha(col, 0.4) : '#E5E7EB'}`,
                  fontWeight: active ? 700 : 400,
                }}
              />
            )
          })}
        </Box>

        {/* Grid de Cursos */}
        <Grid container spacing={2}>
          {filtrados.map(c => {
            const modColor = MOD_COLORS[c.modalidad] || LMS_COLOR
            const nivColor = NIV_COLORS[c.nivel] || LMS_COLOR
            const pct = Math.round((c.completados / Math.max(c.inscritos, 1)) * 100)
            return (
              <Grid key={c.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box sx={{
                  bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5,
                  height: '100%', display: 'flex', flexDirection: 'column',
                  '&:hover': { border: `1px solid ${alpha(LMS_COLOR, 0.5)}`, transform: 'translateY(-2px)' },
                  transition: 'all 0.2s ease',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      <Chip label={c.modalidad} size="small" sx={{ bgcolor: alpha(modColor, 0.15), color: modColor, border: `1px solid ${alpha(modColor, 0.25)}`, fontSize: 10, fontWeight: 600 }} />
                      <Chip label={c.nivel} size="small" sx={{ bgcolor: alpha(nivColor, 0.15), color: nivColor, border: `1px solid ${alpha(nivColor, 0.25)}`, fontSize: 10 }} />
                    </Box>
                    {c.obligatorio && (
                      <Chip label="Obligatorio" size="small" sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', border: `1px solid ${alpha('#EF4444', 0.25)}`, fontSize: 10, fontWeight: 700 }} />
                    )}
                  </Box>

                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.5, lineHeight: 1.4 }}>
                    {c.nombre}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: LMS_COLOR, fontWeight: 600, mb: 1.5 }}>
                    {c.codigo}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{c.horas}h</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Person sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{c.instructor}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{c.inscritos} inscritos</Typography>
                      <Typography sx={{ fontSize: 11, color: LMS_COLOR, fontWeight: 700 }}>{pct}% completado</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 4, borderRadius: 2,
                        bgcolor: '#E2E8F0',
                        '& .MuiLinearProgress-bar': { bgcolor: LMS_COLOR, borderRadius: 2 },
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Layout>
  )
}
