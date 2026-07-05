import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { School, MenuBook, EmojiEvents, AccountTree } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'

const FACULTADES = [
  {
    nombre: 'Facultad de Logística',
    descripcion: 'Almacenamiento, cadena de suministro y gestión de inventarios',
    color: '#D97706',
    escuelas: ['Escuela de Almacén', 'Escuela de Inventarios', 'Escuela de Supply Chain'],
    cursos: 18, inscritos: 142,
  },
  {
    nombre: 'Facultad de Transporte',
    descripcion: 'Conducción, seguridad vial, normatividad y rutas',
    color: '#EF4444',
    escuelas: ['Escuela de Conductores', 'Escuela de Seguridad Vial', 'Escuela de Gestión de Flota'],
    cursos: 22, inscritos: 187,
  },
  {
    nombre: 'Facultad de Calidad',
    descripcion: 'ISO 9001, auditorías, mejora continua y CAPA',
    color: '#059669',
    escuelas: ['Escuela de Calidad', 'Escuela de Auditoría', 'Escuela de Procesos'],
    cursos: 14, inscritos: 98,
  },
  {
    nombre: 'Facultad de Recursos Humanos',
    descripcion: 'Liderazgo, desarrollo de personas y gestión del talento',
    color: '#BE185D',
    escuelas: ['Escuela de Liderazgo', 'Escuela de Comunicación', 'Escuela de Bienestar'],
    cursos: 11, inscritos: 76,
  },
  {
    nombre: 'Facultad de Seguridad',
    descripcion: 'SST, ISO 45001, riesgos laborales y primeros auxilios',
    color: '#F59E0B',
    escuelas: ['Escuela de SST', 'Escuela de Emergencias', 'Escuela de Riesgos'],
    cursos: 16, inscritos: 134,
  },
  {
    nombre: 'Facultad de Tecnología',
    descripcion: 'Sistemas de información, ciberseguridad y digitalización',
    color: '#6D28D9',
    escuelas: ['Escuela Digital', 'Escuela de Datos', 'Escuela de Seguridad TI'],
    cursos: 9, inscritos: 52,
  },
]

const ESCUELAS = [
  { nombre: 'Escuela de Conductores', facultad: 'Facultad de Transporte', programas: 4, cursos: 12, inscritos: 94, color: '#EF4444' },
  { nombre: 'Escuela de Liderazgo', facultad: 'Facultad de Recursos Humanos', programas: 3, cursos: 8, inscritos: 48, color: '#BE185D' },
  { nombre: 'Escuela de Operaciones', facultad: 'Facultad de Logística', programas: 3, cursos: 9, inscritos: 71, color: '#D97706' },
  { nombre: 'Escuela de Calidad', facultad: 'Facultad de Calidad', programas: 3, cursos: 8, inscritos: 55, color: '#059669' },
  { nombre: 'Escuela de Seguridad Vial', facultad: 'Facultad de Transporte', programas: 2, cursos: 6, inscritos: 62, color: '#F59E0B' },
  { nombre: 'Escuela de SST', facultad: 'Facultad de Seguridad', programas: 3, cursos: 7, inscritos: 58, color: '#0EA5E9' },
]

const PROGRAMAS = [
  { codigo: 'PRG-2026-001', nombre: 'Diplomado en Gestión Logística', tipo: 'DIPLOMADO', escuela: 'Escuela de Operaciones', cursos: 6, horas: 120 },
  { codigo: 'PRG-2026-002', nombre: 'Certificación Conducción Segura', tipo: 'CERTIFICACION', escuela: 'Escuela de Conductores', cursos: 8, horas: 80 },
  { codigo: 'PRG-2026-003', nombre: 'Ruta del Supervisor de Calidad', tipo: 'RUTA_APRENDIZAJE', escuela: 'Escuela de Calidad', cursos: 5, horas: 60 },
  { codigo: 'PRG-2026-004', nombre: 'Carrera: Líder de Operaciones', tipo: 'CARRERA_INTERNA', escuela: 'Escuela de Liderazgo', cursos: 10, horas: 180 },
  { codigo: 'PRG-2026-005', nombre: 'Inducción Corporativa ICOLTRANS', tipo: 'INDUCCION', escuela: 'Escuela de Operaciones', cursos: 4, horas: 16 },
  { codigo: 'PRG-2026-006', nombre: 'Diplomado SST ISO 45001', tipo: 'DIPLOMADO', escuela: 'Escuela de SST', cursos: 7, horas: 100 },
]

const TIPO_COLORS: Record<string, string> = {
  DIPLOMADO: '#0EA5E9',
  CERTIFICACION: '#D97706',
  RUTA_APRENDIZAJE: '#059669',
  CARRERA_INTERNA: '#7C3AED',
  INDUCCION: '#F59E0B',
}

const TIPO_LABELS: Record<string, string> = {
  DIPLOMADO: 'Diplomado',
  CERTIFICACION: 'Certificación',
  RUTA_APRENDIZAJE: 'Ruta de Aprendizaje',
  CARRERA_INTERNA: 'Carrera Interna',
  INDUCCION: 'Inducción',
}

export default function LMSUniversidad() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(LMS_COLOR, 0.4)}`,
          }}>
            <AccountTree sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              Universidad Corporativa
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Facultades · Escuelas · Programas · Estructura Académica
            </Typography>
          </Box>
        </Box>

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
          <Tab label="Facultades" />
          <Tab label="Escuelas" />
          <Tab label="Programas" />
        </Tabs>

        {/* Facultades */}
        {tab === 0 && (
          <Grid container spacing={2}>
            {FACULTADES.map((f, i) => (
              <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
                <Box sx={{
                  border: `1px solid ${alpha(f.color, 0.3)}`,
                  borderRadius: 2, p: 2.5, height: '100%',
                  '&:hover': { border: `1px solid ${alpha(f.color, 0.6)}` },
                  transition: 'border 0.2s ease',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 38, height: 38, borderRadius: '10px',
                      background: `linear-gradient(135deg, ${f.color} 0%, ${alpha(f.color, 0.6)} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <School sx={{ color: 'text.primary', fontSize: 20 }} />
                    </Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{f.nombre}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2, lineHeight: 1.5 }}>
                    {f.descripcion}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                    {f.escuelas.map((e, j) => (
                      <Chip key={j} label={e} size="small" sx={{
                        bgcolor: alpha(f.color, 0.12), color: f.color,
                        border: `1px solid ${alpha(f.color, 0.25)}`, fontSize: 10.5,
                      }} />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>{f.cursos}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>cursos</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: f.color }}>{f.inscritos}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>inscritos</Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Escuelas */}
        {tab === 1 && (
          <Grid container spacing={2}>
            {ESCUELAS.map((e, i) => (
              <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
                <Box sx={{
                  border: `1px solid ${alpha(e.color, 0.3)}`,
                  borderRadius: 2, p: 2.5,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 38, height: 38, borderRadius: '10px',
                      background: `linear-gradient(135deg, ${e.color} 0%, ${alpha(e.color, 0.6)} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <MenuBook sx={{ color: 'text.primary', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{e.nombre}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{e.facultad}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    {[
                      { label: 'Programas', val: e.programas },
                      { label: 'Cursos', val: e.cursos },
                      { label: 'Inscritos', val: e.inscritos },
                    ].map((m, j) => (
                      <Box key={j} sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: j === 2 ? e.color : '#FFF' }}>{m.val}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{m.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Programas */}
        {tab === 2 && (
          <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #F1F5F9' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>Catálogo de Programas</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Código', 'Nombre', 'Tipo', 'Escuela', 'Cursos', 'Horas'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMAS.map((p, i) => {
                    const col = TIPO_COLORS[p.tipo] || LMS_COLOR
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: LMS_COLOR, fontWeight: 600 }}>{p.codigo}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary' }}>{p.nombre}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.25)}`,
                          }}>
                            {TIPO_LABELS[p.tipo]}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'text.secondary' }}>{p.escuela}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary', textAlign: 'center' }}>{p.cursos}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: LMS_COLOR, fontWeight: 700, textAlign: 'center' }}>{p.horas}h</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
