import React, { useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, InputBase, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LibraryBooks, Search, VideoLibrary, Article, Lightbulb, EmojiObjects } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'

const TIPO_COLORS: Record<string, string> = {
  VIDEO: '#EF4444', DOCUMENTO: '#0EA5E9', PRESENTACION: '#7C3AED',
  MANUAL: '#059669', LECCION: LMS_COLOR, SIMULACION: '#F59E0B',
}

const RECURSOS = [
  { tipo: 'MANUAL', titulo: 'Manual de Operaciones Logísticas v4.2', categoria: 'Operaciones', fuente: 'Área de Operaciones', fecha: '2026-05-15', descargas: 87 },
  { tipo: 'VIDEO', titulo: 'Tutorial: Uso del WMS para Picking y Packing', categoria: 'Logística', fuente: 'TI', fecha: '2026-04-28', descargas: 62 },
  { tipo: 'DOCUMENTO', titulo: 'Procedimiento de Conducción Defensiva PR-TMS-008', categoria: 'Transporte', fuente: 'Calidad', fecha: '2026-03-20', descargas: 104 },
  { tipo: 'PRESENTACION', titulo: 'Inducción a la Cultura ICOLTRANS 2026', categoria: 'RR.HH.', fuente: 'Gestión Humana', fecha: '2026-01-10', descargas: 143 },
  { tipo: 'MANUAL', titulo: 'Manual de Compliance y Código de Ética', categoria: 'Compliance', fuente: 'Jurídica', fecha: '2026-02-08', descargas: 91 },
  { tipo: 'VIDEO', titulo: 'Cómo usar el módulo GRC para reportar riesgos', categoria: 'GRC', fuente: 'GRC', fecha: '2026-06-01', descargas: 34 },
  { tipo: 'SIMULACION', titulo: 'Simulador: Conducción en condiciones adversas', categoria: 'Transporte', fuente: 'Escuela de Conductores', fecha: '2026-03-14', descargas: 47 },
  { tipo: 'DOCUMENTO', titulo: 'Ficha Técnica: Estibas ISO 6780', categoria: 'Almacén', fuente: 'Control de Estibas', fecha: '2025-11-22', descargas: 38 },
]

const LECCIONES = [
  { origen: 'GRC - Incidente', titulo: 'Lección: Derrame de combustible por fallo de inspección previa', categoria: 'SST', fecha: '2026-05-20', area: 'Transporte' },
  { origen: 'QMS - No Conformidad', titulo: 'Lección: Error en picking por mala señalización de estanterías', categoria: 'Calidad', fecha: '2026-04-12', area: 'Almacén' },
  { origen: 'QMS - CAPA', titulo: 'Lección: Retraso OTIF por falta de planificación de despacho', categoria: 'Logística', fecha: '2026-03-28', area: 'TMS' },
  { origen: 'GRC - Hallazgo', titulo: 'Lección: Incumplimiento de horas de conducción reglamentaria', categoria: 'Compliance', fecha: '2026-02-15', area: 'Transporte' },
]

const TIPO_ICONO: Record<string, React.ReactNode> = {
  VIDEO: <VideoLibrary sx={{ fontSize: 18 }} />,
  DOCUMENTO: <Article sx={{ fontSize: 18 }} />,
  PRESENTACION: <Lightbulb sx={{ fontSize: 18 }} />,
  MANUAL: <LibraryBooks sx={{ fontSize: 18 }} />,
  LECCION: <EmojiObjects sx={{ fontSize: 18 }} />,
  SIMULACION: <Lightbulb sx={{ fontSize: 18 }} />,
}

const CATEGORIAS = ['Todos', 'Operaciones', 'Logística', 'Transporte', 'RR.HH.', 'Compliance', 'GRC', 'Almacén', 'Calidad']

export default function LMSKnowledge() {
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')

  const filtrados = RECURSOS.filter(r => {
    const matchB = r.titulo.toLowerCase().includes(busqueda.toLowerCase())
    const matchC = categoria === 'Todos' || r.categoria === categoria
    return matchB && matchC
  })

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LibraryBooks sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Repositorio de Conocimiento</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Manuales · Procedimientos · Videos · Lecciones Aprendidas
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: `${LMS_COLOR} !important` },
            '& .MuiTabs-indicator': { bgcolor: LMS_COLOR },
          }}>
          <Tab label={`Repositorio (${RECURSOS.length})`} />
          <Tab label={`Lecciones Aprendidas (${LECCIONES.length})`} />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, px: 2, py: 1, alignItems: 'center' }}>
              <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
              <InputBase placeholder="Buscar recursos..." value={busqueda} onChange={e => setBusqueda(e.target.value)} sx={{ flex: 1, color: 'text.primary', fontSize: 13.5 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              {CATEGORIAS.map(c => (
                <Chip key={c} label={c} size="small" onClick={() => setCategoria(c)}
                  sx={{ cursor: 'pointer', bgcolor: categoria === c ? LMS_COLOR : '#F1F5F9', color: categoria === c ? '#FFF' : '#64748B', fontWeight: categoria === c ? 700 : 400 }} />
              ))}
            </Box>
            <Grid container spacing={2}>
              {filtrados.map((r, i) => {
                const col = TIPO_COLORS[r.tipo] || LMS_COLOR
                return (
                  <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Box sx={{
                      bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5,
                      '&:hover': { border: `1px solid ${alpha(col, 0.4)}` }, transition: 'border 0.2s ease', cursor: 'pointer',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                          bgcolor: alpha(col, 0.15), border: `1px solid ${alpha(col, 0.3)}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          '& svg': { color: col },
                        }}>
                          {TIPO_ICONO[r.tipo] || <LibraryBooks sx={{ fontSize: 18, color: col }} />}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Chip label={r.tipo} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, fontSize: 9.5, fontWeight: 600, mb: 0.5 }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}>{r.titulo}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.fuente}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{r.fecha}</Typography>
                        </Box>
                        <Chip label={`${r.descargas} accesos`} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 10 }} />
                      </Box>
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          </>
        )}

        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ bgcolor: alpha('#F59E0B', 0.08), border: '1px solid rgba(245,158,11,0.2)', borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
                💡 Las lecciones aprendidas se generan automáticamente desde incidentes GRC, no conformidades QMS y hallazgos de auditoría.
              </Typography>
            </Box>
            {LECCIONES.map((l, i) => (
              <Box key={i} sx={{ bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={l.origen} size="small" sx={{ bgcolor: alpha(LMS_COLOR, 0.15), color: LMS_COLOR, border: `1px solid ${alpha(LMS_COLOR, 0.3)}`, fontSize: 10, fontWeight: 600 }} />
                      <Chip label={l.categoria} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 10 }} />
                      <Chip label={l.area} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 10 }} />
                    </Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}>{l.titulo}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', ml: 2, flexShrink: 0 }}>{l.fecha}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Layout>
  )
}
