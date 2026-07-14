import React, { useState } from 'react'
import { Box, Typography, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LocalFireDepartment, Add, Groups, EventRepeat, CheckCircle, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const PAGE_BG   = '#F0F2F5'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: '#F9FAFB', '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}

interface BrigadaMiembro { nombre: string; cargo: string; rol: string; certificado: boolean }
interface Simulacro { fecha: string; tipo: string; participantes: number; resultado: string; observaciones: string }

const BRIGADA: BrigadaMiembro[] = [
  { nombre: 'Andrés Torres',  cargo: 'Coord. SST',      rol: 'Coordinador emergencias', certificado: true  },
  { nombre: 'Carmen Rojas',   cargo: 'Aux. SST',         rol: 'Primeros auxilios',       certificado: true  },
  { nombre: 'Marco Vargas',   cargo: 'Jefe Mantenimiento',rol: 'Evacuación y rescate',   certificado: true  },
  { nombre: 'Patricia Núñez', cargo: 'Aux. Bodega',      rol: 'Primeros auxilios',       certificado: false },
  { nombre: 'Luis Herrera',   cargo: 'Técnico Elec.',    rol: 'Control de incendios',    certificado: true  },
  { nombre: 'Diana Castro',   cargo: 'Aux. Admin.',      rol: 'Comunicaciones',          certificado: true  },
]

const SIMULACROS_INIT: Simulacro[] = [
  { fecha: '2026-03-15', tipo: 'Evacuación general',         participantes: 87,  resultado: 'Satisfactorio', observaciones: 'Tiempo evacuación: 4 min 20 seg. Señalización correcta.' },
  { fecha: '2025-09-10', tipo: 'Derrame de sustancia química', participantes: 25, resultado: 'Aceptable',     observaciones: 'Personal brigada respondió. Falló comunicación al punto de encuentro.' },
  { fecha: '2025-03-20', tipo: 'Evacuación general',          participantes: 91,  resultado: 'Satisfactorio', observaciones: 'Tiempo evacuación: 3 min 50 seg. Se realizaron mejoras vs simulacro anterior.' },
]

const PLANES = [
  { nombre: 'Plan de evacuación y emergencias',      estado: 'Vigente',           version: 'v2.2', ultima_revision: '2026-01-10', proxima_revision: '2027-01-10' },
  { nombre: 'Plan de respuesta a incendios',         estado: 'Vigente',           version: 'v1.5', ultima_revision: '2025-11-01', proxima_revision: '2026-11-01' },
  { nombre: 'Plan de respuesta a derrames',          estado: 'En actualización',  version: 'v1.0', ultima_revision: '2024-06-15', proxima_revision: '2025-06-15' },
  { nombre: 'Plan de comunicación en emergencias',   estado: 'Vigente',           version: 'v1.2', ultima_revision: '2025-08-20', proxima_revision: '2026-08-20' },
]

export default function SSTEmergencias() {
  const [simulacros, setSimulacros] = useState<Simulacro[]>(SIMULACROS_INIT)
  const [openSim, setOpenSim]       = useState(false)
  const [simFecha, setSimFecha]     = useState('')
  const [simTipo, setSimTipo]       = useState('')
  const [simPart, setSimPart]       = useState('')
  const [simRes, setSimRes]         = useState('Satisfactorio')
  const [simObs, setSimObs]         = useState('')

  const certif = BRIGADA.filter(b => b.certificado).length

  const kpis = [
    { label: 'Miembros brigada',    value: BRIGADA.length, color: SST_COLOR },
    { label: 'Certificados',        value: certif,         color: '#22c55e' },
    { label: 'Simulacros 2026',     value: simulacros.filter(s => s.fecha.startsWith('2026')).length, color: '#3b82f6' },
    { label: 'Planes vigentes',     value: PLANES.filter(p => p.estado === 'Vigente').length, color: '#f59e0b' },
  ]

  function handleCrearSim() {
    if (!simFecha || !simTipo) return
    setSimulacros(prev => [
      { fecha: simFecha, tipo: simTipo, participantes: Number(simPart) || 0, resultado: simRes, observaciones: simObs },
      ...prev,
    ])
    setOpenSim(false); setSimFecha(''); setSimTipo(''); setSimPart(''); setSimRes('Satisfactorio'); setSimObs('')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocalFireDepartment sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Plan de Emergencias</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Brigada, planes de respuesta y simulacros · Resolución 0312/2019</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenSim(true)} sx={{ bgcolor: SST_COLOR }}>Registrar Simulacro</Button>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2.5}>
          {/* Brigada */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Groups sx={{ color: SST_COLOR, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 15 }}>Brigada de Emergencias</Typography>
                  <Chip label={`${certif}/${BRIGADA.length} certificados`} size="small" sx={{ bgcolor: alpha('#22c55e', 0.12), color: '#22c55e', fontSize: 10, ml: 'auto' }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {BRIGADA.map((m, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, bgcolor: '#F9FAFB', borderRadius: 1 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha(SST_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#F87171' }}>{m.nombre.charAt(0)}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>{m.nombre}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{m.rol}</Typography>
                      </Box>
                      {m.certificado
                        ? <CheckCircle sx={{ fontSize: 16, color: '#22c55e' }} />
                        : <Warning sx={{ fontSize: 16, color: '#f59e0b' }} />
                      }
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Planes y Simulacros */}
          <Grid size={{ xs: 12, md: 6 }}>
            {/* Planes */}
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, mb: 2.5 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 15, mb: 2 }}>Planes de Respuesta</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {PLANES.map((p, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, bgcolor: '#F9FAFB', borderRadius: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>{p.nombre}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Rev: {p.proxima_revision} · {p.version}</Typography>
                      </Box>
                      <Chip label={p.estado} size="small" sx={{ bgcolor: p.estado === 'Vigente' ? alpha('#22c55e', 0.12) : alpha('#f59e0b', 0.12), color: p.estado === 'Vigente' ? '#22c55e' : '#fbbf24', fontSize: 10 }} />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Simulacros */}
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EventRepeat sx={{ color: SST_COLOR, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 15 }}>Simulacros realizados</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {simulacros.map((s, i) => (
                    <Box key={i} sx={{ p: '10px 12px', bgcolor: '#F9FAFB', borderRadius: 1, borderLeft: `3px solid ${s.resultado === 'Satisfactorio' ? '#22c55e' : '#f59e0b'}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{s.tipo}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.fecha}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip label={`${s.participantes} participantes`} size="small" sx={{ bgcolor: '#F9FAFB', color: 'text.secondary', fontSize: 10 }} />
                        <Chip label={s.resultado} size="small" sx={{ bgcolor: alpha(s.resultado === 'Satisfactorio' ? '#22c55e' : '#f59e0b', 0.12), color: s.resultado === 'Satisfactorio' ? '#22c55e' : '#fbbf24', fontSize: 10 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Dialog simulacro */}
        <Dialog open={openSim} onClose={() => setOpenSim(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { color: 'text.primary' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Registrar Simulacro</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Fecha *" type="date" value={simFecha} onChange={e => setSimFecha(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
              <TextField label="Participantes" value={simPart} onChange={e => setSimPart(e.target.value)} type="number" size="small" sx={SX_INPUT} />
            </Box>
            <TextField label="Tipo de simulacro *" value={simTipo} onChange={e => setSimTipo(e.target.value)} fullWidth size="small" sx={SX_INPUT} placeholder="Ej: Evacuación general, Conato incendio..." />
            <TextField label="Resultado" value={simRes} onChange={e => setSimRes(e.target.value)} fullWidth size="small" sx={SX_INPUT} placeholder="Satisfactorio / Aceptable / No satisfactorio" />
            <TextField label="Observaciones" value={simObs} onChange={e => setSimObs(e.target.value)} fullWidth multiline rows={3} size="small" sx={SX_INPUT} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #F1F5F9' }}>
            <Button onClick={() => setOpenSim(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrearSim} disabled={!simFecha || !simTipo} sx={{ bgcolor: SST_COLOR }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
