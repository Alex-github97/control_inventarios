import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha, MenuItem, Select } from '@mui/material'
import { Psychology, TrendingUp, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const BORDER = '#E5E7EB'

const NIVEL_MAP: Record<string, number> = { INICIAL: 1, BASICO: 2, INTERMEDIO: 3, AVANZADO: 4, EXPERTO: 5 }
const NIVEL_COLORS: Record<number, string> = { 1: '#EF4444', 2: '#F59E0B', 3: LMS_COLOR, 4: '#0EA5E9', 5: '#059669' }
const NIVEL_LABELS = ['', 'Inicial', 'Básico', 'Intermedio', 'Avanzado', 'Experto']

const CARGOS = ['Conductor C3', 'Supervisor de Almacén', 'Coordinador de Calidad', 'Jefe de Operaciones', 'Analista Logístico']

const COMPETENCIAS = ['Seguridad Vial', 'Gestión Logística', 'Calidad ISO', 'Liderazgo', 'Comunicación', 'SST', 'TI y Sistemas', 'Atención al Cliente', 'Gestión de Riesgos', 'Normatividad']

const MATRIZ: Record<string, Record<string, { req: number; act: number }>> = {
  'Conductor C3': {
    'Seguridad Vial':      { req: 5, act: 4 },
    'Gestión Logística':   { req: 3, act: 3 },
    'Calidad ISO':         { req: 2, act: 1 },
    'Liderazgo':           { req: 1, act: 1 },
    'Comunicación':        { req: 3, act: 2 },
    'SST':                 { req: 4, act: 3 },
    'TI y Sistemas':       { req: 1, act: 1 },
    'Atención al Cliente': { req: 3, act: 3 },
    'Gestión de Riesgos':  { req: 3, act: 2 },
    'Normatividad':        { req: 5, act: 4 },
  },
  'Coordinador de Calidad': {
    'Seguridad Vial':      { req: 2, act: 2 },
    'Gestión Logística':   { req: 3, act: 3 },
    'Calidad ISO':         { req: 5, act: 4 },
    'Liderazgo':           { req: 4, act: 3 },
    'Comunicación':        { req: 4, act: 4 },
    'SST':                 { req: 3, act: 3 },
    'TI y Sistemas':       { req: 3, act: 2 },
    'Atención al Cliente': { req: 3, act: 2 },
    'Gestión de Riesgos':  { req: 4, act: 3 },
    'Normatividad':        { req: 4, act: 4 },
  },
  'Jefe de Operaciones': {
    'Seguridad Vial':      { req: 3, act: 3 },
    'Gestión Logística':   { req: 5, act: 4 },
    'Calidad ISO':         { req: 4, act: 3 },
    'Liderazgo':           { req: 5, act: 4 },
    'Comunicación':        { req: 5, act: 4 },
    'SST':                 { req: 4, act: 3 },
    'TI y Sistemas':       { req: 3, act: 2 },
    'Atención al Cliente': { req: 4, act: 4 },
    'Gestión de Riesgos':  { req: 5, act: 3 },
    'Normatividad':        { req: 4, act: 3 },
  },
}

function NivelDot({ nivel, size = 20 }: { nivel: number; size?: number }) {
  const col = NIVEL_COLORS[nivel] || '#E2E8F0'
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '50%',
      bgcolor: alpha(col, 0.2), border: `2px solid ${col}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{ fontSize: 9, fontWeight: 800, color: col }}>{nivel}</Typography>
    </Box>
  )
}

export default function LMSCompetencias() {
  const [tab, setTab] = useState(0)
  const [cargo, setCargo] = useState('Conductor C3')

  const matrizCargo = MATRIZ[cargo] || MATRIZ['Conductor C3']

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Psychology sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Matriz de Competencias</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
              Requerido vs. Actual · Brecha por cargo y área
            </Typography>
          </Box>
        </Box>

        {/* Leyenda niveles */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <Box key={n} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <NivelDot nivel={n} size={18} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{n} - {NIVEL_LABELS[n]}</Typography>
            </Box>
          ))}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: `${LMS_COLOR} !important` },
            '& .MuiTabs-indicator': { bgcolor: LMS_COLOR },
          }}>
          <Tab label="Matriz por Cargo" />
          <Tab label="Brechas Críticas" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Cargo:</Typography>
              <Select
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                size="small"
                sx={{
                  color: 'text.primary', bgcolor: 'background.paper', border: `1px solid #E5E7EB`,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& .MuiSvgIcon-root': { color: 'text.secondary' },
                  fontSize: 13, minWidth: 200,
                }}
              >
                {Object.keys(MATRIZ).map(c => (
                  <MenuItem key={c} value={c} sx={{ fontSize: 13 }}>{c}</MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ bgcolor: 'background.paper', border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Competencia', 'Requerido', 'Actual', 'Brecha', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.35)', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPETENCIAS.map((comp, i) => {
                    const datos = matrizCargo[comp] || { req: 1, act: 1 }
                    const brecha = datos.req - datos.act
                    const col = brecha === 0 ? '#059669' : brecha === 1 ? LMS_COLOR : '#EF4444'
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(0,0,0,0.87)', fontWeight: 500 }}>{comp}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NivelDot nivel={datos.req} />
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{NIVEL_LABELS[datos.req]}</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NivelDot nivel={datos.act} />
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{NIVEL_LABELS[datos.act]}</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 15, fontWeight: 800, color: col }}>
                          {brecha > 0 ? `-${brecha}` : '✓'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip
                            label={brecha === 0 ? 'Cumple' : brecha === 1 ? 'Brecha Menor' : 'Brecha Crítica'}
                            size="small"
                            sx={{ bgcolor: alpha(col, 0.15), color: col, border: `1px solid ${alpha(col, 0.3)}`, fontSize: 10, fontWeight: 700 }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            {[
              { cargo: 'Conductor C3', comp: 'Seguridad Vial', req: 5, act: 4, brecha: 1 },
              { cargo: 'Jefe de Operaciones', comp: 'Gestión de Riesgos', req: 5, act: 3, brecha: 2 },
              { cargo: 'Coordinador de Calidad', comp: 'Calidad ISO', req: 5, act: 4, brecha: 1 },
              { cargo: 'Jefe de Operaciones', comp: 'Gestión Logística', req: 5, act: 4, brecha: 1 },
              { cargo: 'Conductor C3', comp: 'Calidad ISO', req: 2, act: 1, brecha: 1 },
              { cargo: 'Jefe de Operaciones', comp: 'SST', req: 4, act: 3, brecha: 1 },
            ].map((b, i) => {
              const col = b.brecha >= 2 ? '#EF4444' : LMS_COLOR
              return (
                <Grid key={i} size={{ xs: 12, md: 6 }}>
                  <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${alpha(col, 0.3)}`, borderRadius: 2, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                        bgcolor: alpha(col, 0.15), border: `1px solid ${alpha(col, 0.3)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Warning sx={{ color: col, fontSize: 18 }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary' }}>{b.comp}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{b.cargo}</Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Requerido: <strong style={{ color: 'inherit' }}>{NIVEL_LABELS[b.req]}</strong></Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Actual: <strong style={{ color: 'inherit' }}>{NIVEL_LABELS[b.act]}</strong></Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={`-${b.brecha} nivel${b.brecha > 1 ? 'es' : ''}`}
                        size="small"
                        sx={{ bgcolor: alpha(col, 0.2), color: col, border: `1px solid ${alpha(col, 0.4)}`, fontWeight: 800, fontSize: 12 }}
                      />
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
