import React, { useState } from 'react'
import { Box, Grid, Typography, Chip, InputBase, alpha } from '@mui/material'
import { Lightbulb, Search } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const BORDER = '#E5E7EB'

const TIPO_COLORS: Record<string, string> = {
  MULTIPLE: '#0EA5E9', VERDADERO_FALSO: '#059669',
  CASO_PRACTICO: '#7C3AED', RESPUESTA_ABIERTA: '#F59E0B',
}
const DIFICULTAD_COLORS: Record<string, string> = {
  FACIL: '#059669', MEDIO: LMS_COLOR, DIFICIL: '#EF4444',
}

const PREGUNTAS = [
  { id: 1, codigo: 'PRG-2026-0001', tipo: 'MULTIPLE', nivel: 'MEDIO', categoria: 'Seguridad Vial', enunciado: '¿Cuál es la velocidad máxima permitida en zona escolar según la ley de tránsito colombiana?', puntaje: 2, opciones: 4 },
  { id: 2, codigo: 'PRG-2026-0002', tipo: 'VERDADERO_FALSO', nivel: 'FACIL', categoria: 'SST', enunciado: 'El uso del cinturón de seguridad es obligatorio para todos los ocupantes del vehículo.', puntaje: 1, opciones: 2 },
  { id: 3, codigo: 'PRG-2026-0003', tipo: 'CASO_PRACTICO', nivel: 'DIFICIL', categoria: 'Calidad ISO', enunciado: 'Un proceso presenta una tasa de no conformidades del 3.5%. Según ISO 9001, describa el procedimiento de CAPA que aplicaría...', puntaje: 5, opciones: 0 },
  { id: 4, codigo: 'PRG-2026-0004', tipo: 'MULTIPLE', nivel: 'MEDIO', categoria: 'Compliance', enunciado: '¿Cuáles de las siguientes acciones constituyen una conducta de soborno según la ley anticorrupción?', puntaje: 3, opciones: 5 },
  { id: 5, codigo: 'PRG-2026-0005', tipo: 'MULTIPLE', nivel: 'FACIL', categoria: 'Seguridad Vial', enunciado: '¿Cuánto tiempo se debe mantener la distancia de seguridad en vía de alta velocidad?', puntaje: 1, opciones: 4 },
  { id: 6, codigo: 'PRG-2026-0006', tipo: 'RESPUESTA_ABIERTA', nivel: 'DIFICIL', categoria: 'Liderazgo', enunciado: 'Describe cómo aplicarías el modelo de liderazgo situacional ante un equipo con alta habilidad pero baja motivación.', puntaje: 5, opciones: 0 },
  { id: 7, codigo: 'PRG-2026-0007', tipo: 'VERDADERO_FALSO', nivel: 'FACIL', categoria: 'Compliance', enunciado: 'La protección de datos personales aplica únicamente a información digital, no a documentos físicos.', puntaje: 1, opciones: 2 },
  { id: 8, codigo: 'PRG-2026-0008', tipo: 'MULTIPLE', nivel: 'MEDIO', categoria: 'Logística', enunciado: '¿Qué método de valoración de inventarios garantiza que los productos más antiguos salgan primero?', puntaje: 2, opciones: 4 },
  { id: 9, codigo: 'PRG-2026-0009', tipo: 'CASO_PRACTICO', nivel: 'DIFICIL', categoria: 'SST', enunciado: 'En un simulacro de emergencia se detecta que el 40% del personal no conoce la ruta de evacuación. ¿Qué acciones correctivas implementaría?', puntaje: 4, opciones: 0 },
  { id: 10, codigo: 'PRG-2026-0010', tipo: 'MULTIPLE', nivel: 'FACIL', categoria: 'Operaciones', enunciado: '¿Cuántos unidades caben en una estiba estándar con dimensiones 1.2m x 1.0m si cada caja mide 30x25x20cm?', puntaje: 2, opciones: 4 },
]

const CATEGORIAS = ['Todos', 'Seguridad Vial', 'SST', 'Calidad ISO', 'Compliance', 'Liderazgo', 'Logística', 'Operaciones']
const NIVELES = ['Todos', 'FACIL', 'MEDIO', 'DIFICIL']
const TIPOS = ['Todos', 'MULTIPLE', 'VERDADERO_FALSO', 'CASO_PRACTICO', 'RESPUESTA_ABIERTA']

export default function LMSBancoPreguntas() {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [nivel, setNivel] = useState('Todos')
  const [tipo, setTipo] = useState('Todos')

  const filtradas = PREGUNTAS.filter(p => {
    const matchB = p.enunciado.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const matchC = categoria === 'Todos' || p.categoria === categoria
    const matchN = nivel === 'Todos' || p.nivel === nivel
    const matchT = tipo === 'Todos' || p.tipo === tipo
    return matchB && matchC && matchN && matchT
  })

  const totalPuntos = PREGUNTAS.reduce((s, p) => s + p.puntaje, 0)
  const porTipo = TIPOS.slice(1).map(t => ({ tipo: t, count: PREGUNTAS.filter(p => p.tipo === t).length }))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lightbulb sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Banco de Preguntas</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
              {PREGUNTAS.length} preguntas · {totalPuntos} puntos · Múltiple, V/F, Casos, Abierta
            </Typography>
          </Box>
        </Box>

        {/* Stats por tipo */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {porTipo.map((t, i) => {
            const col = TIPO_COLORS[t.tipo] || LMS_COLOR
            const labels: Record<string, string> = { MULTIPLE: 'Selección Múltiple', VERDADERO_FALSO: 'Verdadero / Falso', CASO_PRACTICO: 'Caso Práctico', RESPUESTA_ABIERTA: 'Respuesta Abierta' }
            return (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${alpha(col, 0.25)}`, borderRadius: 2, p: 2 }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{t.count}</Typography>
                  <Typography sx={{ fontSize: 11, color: col, fontWeight: 600, mt: 0.25 }}>{labels[t.tipo]}</Typography>
                </Box>
              </Grid>
            )
          })}
        </Grid>

        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, bgcolor: 'background.paper', border: `1px solid #E5E7EB`, borderRadius: 2, px: 2, py: 1, alignItems: 'center' }}>
          <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
          <InputBase
            placeholder="Buscar pregunta..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            sx={{ flex: 1, color: 'text.primary', fontSize: 13.5 }}
          />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {CATEGORIAS.map(c => (
            <Chip key={c} label={c} size="small" onClick={() => setCategoria(c)}
              sx={{ cursor: 'pointer', bgcolor: categoria === c ? LMS_COLOR : '#F1F5F9', color: categoria === c ? '#FFF' : 'text.secondary', fontWeight: categoria === c ? 700 : 400 }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {NIVELES.map(n => {
            const col = DIFICULTAD_COLORS[n] || '#94A3B8'
            return (
              <Chip key={n} label={n} size="small" onClick={() => setNivel(n)}
                sx={{ cursor: 'pointer', bgcolor: nivel === n ? alpha(col, 0.2) : 'transparent', color: nivel === n ? col : 'text.disabled', border: `1px solid ${nivel === n ? alpha(col, 0.4) : '#E5E7EB'}`, fontWeight: nivel === n ? 700 : 400 }} />
            )
          })}
          {TIPOS.map(t => {
            const col = TIPO_COLORS[t] || '#94A3B8'
            return (
              <Chip key={t} label={t === 'Todos' ? 'Todos los tipos' : t.charAt(0) + t.slice(1).toLowerCase().replace('_', ' ')} size="small" onClick={() => setTipo(t)}
                sx={{ cursor: 'pointer', bgcolor: tipo === t ? alpha(col, 0.2) : 'transparent', color: tipo === t ? col : 'text.disabled', border: `1px solid ${tipo === t ? alpha(col, 0.4) : '#E5E7EB'}`, fontWeight: tipo === t ? 700 : 400 }} />
            )
          })}
        </Box>

        {/* Tabla */}
        <Box sx={{ bgcolor: 'background.paper', border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>Preguntas ({filtradas.length})</Typography>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Tipo', 'Nivel', 'Categoría', 'Enunciado', 'Ptos'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.35)', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => {
                  const tipoCol = TIPO_COLORS[p.tipo] || LMS_COLOR
                  const nivCol  = DIFICULTAD_COLORS[p.nivel] || LMS_COLOR
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td style={{ padding: '10px 14px', fontSize: 11.5, color: LMS_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.codigo}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip label={p.tipo.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(tipoCol, 0.15), color: tipoCol, border: `1px solid ${alpha(tipoCol, 0.25)}`, fontSize: 9.5, fontWeight: 600 }} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip label={p.nivel} size="small" sx={{ bgcolor: alpha(nivCol, 0.15), color: nivCol, border: `1px solid ${alpha(nivCol, 0.25)}`, fontSize: 9.5 }} />
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(0,0,0,0.55)', whiteSpace: 'nowrap' }}>{p.categoria}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'rgba(0,0,0,0.75)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.enunciado}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: LMS_COLOR, textAlign: 'center' }}>{p.puntaje}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>
    </Layout>
  )
}
