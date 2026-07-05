import React, { useState } from 'react'
import { Box, Grid, Typography, Chip, InputBase, alpha } from '@mui/material'
import { Whatshot, Search, TrendingUp, AcUnit, Thermostat } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'

const ESTADO_COLOR: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  CALIENTE:  { color: CRM_COLOR,  bg: alpha(CRM_COLOR, 0.15),  icon: <Whatshot  sx={{ fontSize: 16, color: CRM_COLOR }}  /> },
  TIBIO:     { color: '#F59E0B',  bg: alpha('#F59E0B', 0.15),  icon: <Thermostat sx={{ fontSize: 16, color: '#F59E0B' }} /> },
  FRIO:      { color: '#0EA5E9',  bg: alpha('#0EA5E9', 0.15),  icon: <AcUnit    sx={{ fontSize: 16, color: '#0EA5E9' }}  /> },
  CONVERTIDO:{ color: '#059669',  bg: alpha('#059669', 0.15),  icon: <TrendingUp sx={{ fontSize: 16, color: '#059669' }} /> },
  DESCARTADO:{ color: '#6B7280',  bg: alpha('#6B7280', 0.15),  icon: null },
}

const LEADS = [
  { id: 1, codigo: 'LEAD-2026-001', empresa: 'Distribuciones Andes S.A.',  contacto: 'Mauricio Leal',   fuente: 'Formulario Web', estado: 'CALIENTE',   score: 92, potencial: 840,  industria: 'Distribución',  ejecutivo: 'Laura Soto' },
  { id: 2, codigo: 'LEAD-2026-002', empresa: 'Translogic Caribe S.A.S.',   contacto: 'Sandra Méndez',   fuente: 'Referido',       estado: 'CALIENTE',   score: 87, potencial: 520,  industria: 'Transporte',    ejecutivo: 'Carlos Vega' },
  { id: 3, codigo: 'LEAD-2026-003', empresa: 'FoodService Colombia',        contacto: 'Ricardo Gómez',   fuente: 'Evento EXPO',    estado: 'TIBIO',      score: 68, potencial: 360,  industria: 'Alimentos',     ejecutivo: 'Ana Ruiz' },
  { id: 4, codigo: 'LEAD-2026-004', empresa: 'Pharmavida S.A.',             contacto: 'Gloria Torres',   fuente: 'LinkedIn',       estado: 'TIBIO',      score: 61, potencial: 280,  industria: 'Farmacéutico',  ejecutivo: 'Laura Soto' },
  { id: 5, codigo: 'LEAD-2026-005', empresa: 'Textiles del Norte',          contacto: 'Andrés Ospina',   fuente: 'Importación DB', estado: 'FRIO',       score: 34, potencial: 180,  industria: 'Textil',        ejecutivo: 'Pedro Díaz' },
  { id: 6, codigo: 'LEAD-2026-006', empresa: 'Agroindustrial Sabana S.A.S.',contacto: 'Patricia Vargas', fuente: 'Feria',          estado: 'FRIO',       score: 28, potencial: 120,  industria: 'Agroindustrial', ejecutivo: 'Carlos Vega' },
  { id: 7, codigo: 'LEAD-2026-007', empresa: 'Tecnología Avanzada Ltda.',   contacto: 'Felipe Cruz',     fuente: 'Formulario Web', estado: 'CONVERTIDO', score: 95, potencial: 640,  industria: 'Tecnología',    ejecutivo: 'Ana Ruiz' },
  { id: 8, codigo: 'LEAD-2026-008', empresa: 'Retail Express',              contacto: 'Isabel Díaz',     fuente: 'Email Campaign', estado: 'FRIO',       score: 22, potencial: 90,   industria: 'Retail',        ejecutivo: 'Pedro Díaz' },
]

const FUENTES = ['Todos', 'Formulario Web', 'Referido', 'Evento EXPO', 'LinkedIn', 'Importación DB', 'Feria', 'Email Campaign']
const ESTADOS = ['Todos', 'CALIENTE', 'TIBIO', 'FRIO', 'CONVERTIDO', 'DESCARTADO']

function ScoreBar({ score }: { score: number }) {
  const col = score >= 75 ? CRM_COLOR : score >= 50 ? '#F59E0B' : '#0EA5E9'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 64, height: 6, borderRadius: 3, bgcolor: 'text.disabled', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${score}%`, bgcolor: col, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: col }}>{score}</Typography>
    </Box>
  )
}

export default function CRMLeads() {
  const [busqueda, setBus]  = useState('')
  const [estado, setEstado] = useState('Todos')
  const [fuente, setFuente] = useState('Todos')

  const filtrados = LEADS.filter(l => {
    const matchB = l.empresa.toLowerCase().includes(busqueda.toLowerCase()) || l.contacto.toLowerCase().includes(busqueda.toLowerCase())
    const matchE = estado === 'Todos' || l.estado === estado
    const matchF = fuente === 'Todos' || l.fuente === fuente
    return matchB && matchE && matchF
  })

  const calientes  = LEADS.filter(l => l.estado === 'CALIENTE').length
  const tibios     = LEADS.filter(l => l.estado === 'TIBIO').length
  const frios      = LEADS.filter(l => l.estado === 'FRIO').length
  const convertidos = LEADS.filter(l => l.estado === 'CONVERTIDO').length
  const pipeline   = LEADS.reduce((s, l) => s + l.potencial, 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Whatshot sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Gestión de Leads</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Scoring IA · Clasificación · Pipeline inicial
            </Typography>
          </Box>
        </Box>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Calientes', value: calientes, color: CRM_COLOR,  icon: <Whatshot  sx={{ fontSize: 20 }} /> },
            { label: 'Tibios',    value: tibios,    color: '#F59E0B',  icon: <Thermostat sx={{ fontSize: 20 }} /> },
            { label: 'Fríos',     value: frios,     color: '#0EA5E9',  icon: <AcUnit    sx={{ fontSize: 20 }} /> },
            { label: 'Convertidos', value: convertidos, color: '#059669', icon: <TrendingUp sx={{ fontSize: 20 }} /> },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: alpha(s.color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { color: s.color } }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, border: `1px solid #E5E7EB`, borderRadius: 2, px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 180 }}>
            <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
            <InputBase placeholder="Buscar lead..." value={busqueda} onChange={e => setBus(e.target.value)} sx={{ flex: 1, color: 'text.primary', fontSize: 13.5 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {ESTADOS.map(e => {
            const info = ESTADO_COLOR[e]
            return (
              <Chip key={e} label={e === 'Todos' ? 'Todos los estados' : e} size="small" onClick={() => setEstado(e)}
                sx={{ cursor: 'pointer', bgcolor: estado === e ? (info?.color || CRM_COLOR) : '#F0F2F5', color: estado === e ? '#FFF' : '#64748B', fontWeight: estado === e ? 700 : 400 }} />
            )
          })}
        </Box>

        {/* Tabla */}
        <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>Leads ({filtrados.length})</Typography>
            <Typography sx={{ fontSize: 12, color: CRM_COLOR, fontWeight: 700 }}>
              Pipeline potencial: ${(pipeline / 1000).toFixed(1)}B
            </Typography>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Empresa', 'Contacto', 'Industria', 'Fuente', 'Estado', 'Score IA', 'Potencial', 'Ejecutivo'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l, i) => {
                  const info = ESTADO_COLOR[l.estado] || { color: '#64748B', bg: '#F0F2F5', icon: null }
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.codigo}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary', fontWeight: 600, whiteSpace: 'nowrap' }}>{l.empresa}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{l.contacto}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{l.industria}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>{l.fuente}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {info.icon}
                          <Chip label={l.estado} size="small" sx={{ bgcolor: info.bg, color: info.color, fontSize: 9.5, fontWeight: 700 }} />
                        </Box>
                      </td>
                      <td style={{ padding: '10px 14px' }}><ScoreBar score={l.score} /></td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: CRM_COLOR }}>${l.potencial}M</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{l.ejecutivo}</td>
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
