import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { EmojiEvents, Stars, Leaderboard } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'

const RANKING = [
  { pos: 1,  nombre: 'Carlos Vargas',    cargo: 'Conductor C3',            puntos: 1840, insignias: 12, completados: 18 },
  { pos: 2,  nombre: 'Andrea López',     cargo: 'Coordinadora de Calidad',  puntos: 1620, insignias: 10, completados: 15 },
  { pos: 3,  nombre: 'Miguel Torres',    cargo: 'Jefe de Almacén',          puntos: 1480, insignias: 9,  completados: 14 },
  { pos: 4,  nombre: 'Sandra Gil',       cargo: 'Analista Logístico',       puntos: 1350, insignias: 8,  completados: 13 },
  { pos: 5,  nombre: 'Roberto Díaz',     cargo: 'Supervisor SST',           puntos: 1280, insignias: 8,  completados: 11 },
  { pos: 6,  nombre: 'Camila Torres',    cargo: 'Asistente de Calidad',     puntos: 1140, insignias: 7,  completados: 10 },
  { pos: 7,  nombre: 'Felipe Muñoz',     cargo: 'Conductor C2',             puntos: 1050, insignias: 6,  completados: 9 },
  { pos: 8,  nombre: 'Lina Cárdenas',    cargo: 'Asesora Comercial',        puntos: 980,  insignias: 6,  completados: 8 },
  { pos: 9,  nombre: 'Diego Herrera',    cargo: 'Analista TI',              puntos: 870,  insignias: 5,  completados: 7 },
  { pos: 10, nombre: 'Paola Rueda',      cargo: 'Coordinadora RR.HH.',      puntos: 820,  insignias: 5,  completados: 7 },
]

const INSIGNIAS = [
  { nombre: 'Primer Paso', descripcion: 'Completar el primer curso', icono: '🎯', color: '#059669', tipo: 'LOGRO', otorgadas: 128 },
  { nombre: 'Conductor Estrella', descripcion: 'Certificación de conducción aprobada', icono: '🚗', color: '#EF4444', tipo: 'CERTIFICACION', otorgadas: 72 },
  { nombre: 'Experto ISO', descripcion: 'Completar toda la ruta ISO 9001', icono: '⭐', color: LMS_COLOR, tipo: 'RUTA', otorgadas: 18 },
  { nombre: 'Puntaje Perfecto', descripcion: 'Obtener 100% en una evaluación', icono: '💯', color: '#7C3AED', tipo: 'EVALUACION', otorgadas: 34 },
  { nombre: 'Maratonista', descripcion: 'Completar 50+ horas de capacitación', icono: '🏃', color: '#0EA5E9', tipo: 'HORAS', otorgadas: 42 },
  { nombre: 'Líder de Conocimiento', descripcion: 'Top 3 del ranking mensual', icono: '🏆', color: '#F59E0B', tipo: 'RANKING', otorgadas: 9 },
  { nombre: 'Compliance Hero', descripcion: 'Completar todos los cursos de compliance', icono: '🛡️', color: '#6D28D9', tipo: 'CERTIFICACION', otorgadas: 51 },
  { nombre: 'Racha de 7 días', descripcion: 'Acceder al LMS 7 días seguidos', icono: '🔥', color: '#DC2626', tipo: 'RACHA', otorgadas: 67 },
]

const RETOS = [
  { nombre: 'Reto Seguridad Vial Junio', descripcion: 'Completa 3 cursos de seguridad vial este mes', progreso: 67, participantes: 48, fin: '2026-06-30' },
  { nombre: 'Maratón de Compliance', descripcion: 'Aprueba todos los tests de compliance en 2 semanas', progreso: 40, participantes: 31, fin: '2026-06-27' },
  { nombre: 'ISO All-Stars', descripcion: 'Completa la ruta del Supervisor de Calidad', progreso: 25, participantes: 15, fin: '2026-07-15' },
]

const POS_COLORS: Record<number, string> = { 1: '#F59E0B', 2: '#94A3B8', 3: '#B45309' }

export default function LMSGamificacion() {
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
            <EmojiEvents sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Gamificación</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Puntos · Insignias · Rankings · Retos de equipo
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
          <Tab label="Ranking" icon={<Leaderboard sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Insignias" icon={<Stars sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Retos Activos" icon={<EmojiEvents sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            {/* Top 3 visual */}
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', gap: 3, borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
              {[RANKING[1], RANKING[0], RANKING[2]].map((r, i) => {
                const podioPos = i === 0 ? 2 : i === 1 ? 1 : 3
                const col = POS_COLORS[podioPos]
                const altura = i === 1 ? 90 : 70
                return (
                  <Box key={r.pos} sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{
                      width: i === 1 ? 52 : 44, height: i === 1 ? 52 : 44, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${col} 0%, ${alpha(col, 0.6)} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 20px ${alpha(col, 0.5)}`,
                      fontSize: i === 1 ? 18 : 15,
                    }}>
                      {i === 1 ? '🥇' : i === 0 ? '🥈' : '🥉'}
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{r.nombre.split(' ')[0]}</Typography>
                    <Typography sx={{ fontSize: 12, color: col, fontWeight: 800 }}>{r.puntos.toLocaleString()} pts</Typography>
                  </Box>
                )
              })}
            </Box>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Colaborador', 'Cargo', 'Puntos', 'Insignias', 'Completados'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RANKING.map((r, i) => {
                  const col = POS_COLORS[r.pos]
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '10px 14px', fontSize: 15, fontWeight: 800, color: col || '#94A3B8', width: 40 }}>
                        {r.pos <= 3 ? ['🥇', '🥈', '🥉'][r.pos - 1] : r.pos}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#1E293B', fontWeight: 600 }}>{r.nombre}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.cargo}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: LMS_COLOR }}>{r.puntos.toLocaleString()}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#F59E0B', textAlign: 'center' }}>⭐ {r.insignias}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#059669', textAlign: 'center' }}>✓ {r.completados}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Box>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            {INSIGNIAS.map((ins, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ border: `1px solid ${alpha(ins.color, 0.3)}`, borderRadius: 2, p: 2.5, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 36, mb: 1 }}>{ins.icono}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', mb: 0.5 }}>{ins.nombre}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>{ins.descripcion}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Chip label={ins.tipo} size="small" sx={{ bgcolor: alpha(ins.color, 0.15), color: ins.color, fontSize: 10, fontWeight: 600 }} />
                    <Chip label={`${ins.otorgadas} otorgadas`} size="small" sx={{ bgcolor: 'text.disabled', color: 'text.secondary', fontSize: 10 }} />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 2 && (
          <Grid container spacing={2}>
            {RETOS.map((r, i) => {
              const col = i === 0 ? '#EF4444' : i === 1 ? LMS_COLOR : '#7C3AED'
              return (
                <Grid key={i} size={{ xs: 12, md: 6 }}>
                  <Box sx={{ border: `1px solid ${alpha(col, 0.3)}`, borderRadius: 2, p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{r.nombre}</Typography>
                      <Chip label={`Fin: ${r.fin}`} size="small" sx={{ bgcolor: 'text.disabled', color: 'text.secondary', fontSize: 10 }} />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>{r.descripcion}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{r.participantes} participantes</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: col }}>{r.progreso}% completado</Typography>
                    </Box>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${r.progreso}%`, bgcolor: col, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </Box>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
