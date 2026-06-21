import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Grid, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, Paper, Tabs, Tab, Button, Slider,
  LinearProgress, alpha,
} from '@mui/material'
import { Explore, TrendingUp, TrendingDown, Star } from '@mui/icons-material'

const APS_COLOR = '#7C3AED'

const escenarios = [
  { id: 1, nombre: 'Plan Base S&OP Jun-26', tipo: 'BASE', estado: 'APROBADO', demanda: 0, capacidad: 0, costo: 0, creado: 'Sistema APS', fecha: '2026-06-01' },
  { id: 2, nombre: 'Escenario Optimista Q3', tipo: 'OPTIMISTA', estado: 'COMPLETADO', demanda: 15, capacidad: 10, costo: 5, creado: 'J. Rodríguez', fecha: '2026-06-15' },
  { id: 3, nombre: 'Escenario Pesimista Recesión', tipo: 'PESIMISTA', estado: 'COMPLETADO', demanda: -20, capacidad: -5, costo: 12, creado: 'M. García', fecha: '2026-06-15' },
  { id: 4, nombre: 'What-If: Proveedor X falla', tipo: 'WHAT_IF', estado: 'COMPLETADO', demanda: 0, capacidad: -30, costo: 25, creado: 'L. Torres', fecha: '2026-06-17' },
  { id: 5, nombre: 'What-If: Pico demanda Export', tipo: 'WHAT_IF', estado: 'EN_SIMULACION', demanda: 35, capacidad: 0, costo: 0, creado: 'A. Martínez', fecha: '2026-06-19' },
]

const comparativa = [
  { kpi: 'OTIF',               base: 96.2, optimista: 97.8, pesimista: 88.4, whatif1: 84.2, whatif2: 97.1 },
  { kpi: 'Costo Total ($M)',   base: 4850, optimista: 5120, pesimista: 4210, whatif1: 5380, whatif2: 5230 },
  { kpi: 'Revenue ($M)',       base: 8420, optimista: 9680, pesimista: 6740, whatif1: 8420, whatif2: 9840 },
  { kpi: 'Inv. Value ($M)',    base: 435,  optimista: 510,  pesimista: 380,  whatif1: 620,  whatif2: 490 },
  { kpi: 'Service Level %',   base: 97.1, optimista: 98.4, pesimista: 91.2, whatif1: 88.6, whatif2: 97.8 },
  { kpi: 'CO2 (ton)',          base: 145,  optimista: 168,  pesimista: 112,  whatif1: 145,  whatif2: 189 },
  { kpi: 'Lead Time (días)',   base: 12,   optimista: 10,   pesimista: 18,   whatif1: 22,   whatif2: 11 },
]

function tipoColor(t: string) {
  const m: Record<string, string> = { BASE: '#3B82F6', OPTIMISTA: '#10B981', PESIMISTA: '#EF4444', WHAT_IF: '#F59E0B', SIMULACION: '#8B5CF6' }
  return m[t] || APS_COLOR
}

function estadoColor(e: string) {
  const m: Record<string, string> = { APROBADO: '#10B981', COMPLETADO: '#3B82F6', EN_SIMULACION: '#F59E0B', BORRADOR: 'rgba(255,255,255,0.3)' }
  return m[e] || 'rgba(255,255,255,0.3)'
}

function delta(val: number, base: number, kpi: string) {
  const d = val - base
  const upGood = !['Costo Total ($M)', 'Inv. Value ($M)', 'CO2 (ton)', 'Lead Time (días)'].includes(kpi)
  const isUp = d > 0
  const isGood = upGood ? isUp : !isUp
  return { d, isGood }
}

export default function APSEscenarios() {
  const [tab, setTab] = useState(0)
  const [simulando, setSimulando] = useState(false)
  const [progSim, setProgSim] = useState(0)
  const [demandaDelta, setDemandaDelta] = useState(0)
  const [capDelta, setCapDelta] = useState(0)
  const [costoDelta, setCostoDelta] = useState(0)
  const [ltDelta, setLtDelta] = useState(0)

  const lanzarSim = () => {
    setSimulando(true)
    setProgSim(0)
    const iv = setInterval(() => {
      setProgSim(p => {
        if (p >= 100) { clearInterval(iv); setSimulando(false); return 100 }
        return p + 8
      })
    }, 200)
  }

  const otifEst = +(96.2 + demandaDelta * 0.1 - capDelta * 0.15 - costoDelta * 0.05).toFixed(1)
  const costoEst = +(4850 * (1 + costoDelta / 100) * (1 - capDelta * 0.01) ).toFixed(0)
  const revenueEst = +(8420 * (1 + demandaDelta / 100)).toFixed(0)
  const serviceEst = +(97.1 + demandaDelta * 0.05 - capDelta * 0.12).toFixed(1)

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#0F172A', minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: '12px', background: `linear-gradient(135deg, ${APS_COLOR} 0%, #6D28D9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Explore sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 700 }}>Simulador de Escenarios What-If</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>Simula el impacto de cambios en demanda, capacidad y costos antes de comprometerte con un plan</Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Chip label={`${escenarios.length} escenarios`} size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.15), color: APS_COLOR, fontWeight: 700 }} />
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 }, '& .Mui-selected': { color: APS_COLOR }, '& .MuiTabs-indicator': { bgcolor: APS_COLOR } }}>
          <Tab label="Escenarios" />
          <Tab label="Comparativa" />
          <Tab label="Simulación" />
        </Tabs>

        {tab === 0 && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Plan Base Activo', value: '1', color: '#3B82F6' },
                { label: 'Escenarios Completados', value: '3', color: '#10B981' },
                { label: 'En Simulación', value: '1', color: '#F59E0B' },
                { label: 'Aprobados', value: '1', color: APS_COLOR },
              ].map(k => (
                <Grid key={k.label} size={{ xs: 6, md: 3 }}>
                  <Box sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2, borderLeft: `4px solid ${k.color}` }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'uppercase' }}>{k.label}</Typography>
                    <Typography sx={{ color: '#F8FAFC', fontSize: 32, fontWeight: 800 }}>{k.value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 15 }}>Biblioteca de Escenarios</Typography>
                <Button size="small" variant="contained" sx={{ bgcolor: APS_COLOR, fontSize: 12, '&:hover': { bgcolor: '#6D28D9' } }}>+ Nuevo Escenario</Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Nombre', 'Tipo', 'Estado', 'Δ Demanda', 'Δ Capacidad', 'Δ Costo MP', 'Creado Por', 'Fecha'].map(h => (
                      <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {escenarios.map(e => (
                    <TableRow key={e.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                      <TableCell sx={{ color: '#E2E8F0', border: 'none', fontSize: 12, fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {e.id === 1 && <Star sx={{ fontSize: 14, color: '#F59E0B' }} />}
                          {e.nombre}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ border: 'none' }}><Chip label={e.tipo} size="small" sx={{ bgcolor: alpha(tipoColor(e.tipo), 0.15), color: tipoColor(e.tipo), fontSize: 10 }} /></TableCell>
                      <TableCell sx={{ border: 'none' }}><Chip label={e.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(estadoColor(e.estado), 0.15), color: estadoColor(e.estado), fontSize: 10 }} /></TableCell>
                      <TableCell sx={{ color: e.demanda > 0 ? '#10B981' : e.demanda < 0 ? '#EF4444' : 'rgba(255,255,255,0.4)', border: 'none', fontSize: 12 }}>{e.demanda > 0 ? '+' : ''}{e.demanda}%</TableCell>
                      <TableCell sx={{ color: e.capacidad > 0 ? '#10B981' : e.capacidad < 0 ? '#EF4444' : 'rgba(255,255,255,0.4)', border: 'none', fontSize: 12 }}>{e.capacidad > 0 ? '+' : ''}{e.capacidad}%</TableCell>
                      <TableCell sx={{ color: e.costo > 0 ? '#EF4444' : 'rgba(255,255,255,0.4)', border: 'none', fontSize: 12 }}>{e.costo > 0 ? '+' : ''}{e.costo}%</TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.5)', border: 'none', fontSize: 12 }}>{e.creado}</TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: 12 }}>{e.fecha}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        {tab === 1 && (
          <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 15 }}>Comparativa de KPIs por Escenario</Typography>
              <Chip icon={<Star sx={{ fontSize: 12 }} />} label="Ganador: Optimista" size="small" sx={{ bgcolor: alpha('#10B981', 0.15), color: '#10B981', fontWeight: 700 }} />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: 11 }}>KPI</TableCell>
                  {['Base', 'Optimista', 'Pesimista', 'What-If 1', 'What-If 2'].map(h => (
                    <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {comparativa.map(c => (
                  <TableRow key={c.kpi} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                    <TableCell sx={{ color: '#E2E8F0', border: 'none', fontSize: 12, fontWeight: 600 }}>{c.kpi}</TableCell>
                    <TableCell sx={{ color: '#3B82F6', border: 'none', fontSize: 12, fontWeight: 700 }}>{c.base.toLocaleString()}</TableCell>
                    {[c.optimista, c.pesimista, c.whatif1, c.whatif2].map((val, i) => {
                      const { d, isGood } = delta(val, c.base, c.kpi)
                      return (
                        <TableCell key={i} sx={{ border: 'none' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ color: isGood ? '#10B981' : '#EF4444', fontSize: 12 }}>{val.toLocaleString()}</Typography>
                            {d !== 0 && (isGood ? <TrendingUp sx={{ fontSize: 12, color: '#10B981' }} /> : <TrendingDown sx={{ fontSize: 12, color: '#EF4444' }} />)}
                          </Box>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {tab === 2 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 3 }}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 3, fontSize: 15 }}>Parámetros de Simulación</Typography>

                {[
                  { label: 'Variación Demanda (%)', val: demandaDelta, set: setDemandaDelta, min: -40, max: 60 },
                  { label: 'Variación Capacidad (%)', val: capDelta, set: setCapDelta, min: -50, max: 30 },
                  { label: 'Variación Costo MP (%)', val: costoDelta, set: setCostoDelta, min: -20, max: 50 },
                  { label: 'Incremento Lead Time Prov. (días)', val: ltDelta, set: setLtDelta, min: 0, max: 30 },
                ].map(s => (
                  <Box key={s.label} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{s.label}</Typography>
                      <Typography sx={{ color: s.val > 0 ? '#10B981' : s.val < 0 ? '#EF4444' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700 }}>{s.val > 0 ? '+' : ''}{s.val}{s.label.includes('días') ? 'd' : '%'}</Typography>
                    </Box>
                    <Slider value={s.val} min={s.min} max={s.max} step={1} onChange={(_, v) => s.set(v as number)}
                      sx={{ color: APS_COLOR, '& .MuiSlider-thumb': { bgcolor: APS_COLOR }, '& .MuiSlider-track': { bgcolor: APS_COLOR }, '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.1)' } }} />
                  </Box>
                ))}

                <Button fullWidth variant="contained" onClick={lanzarSim} disabled={simulando}
                  sx={{ bgcolor: APS_COLOR, py: 1.5, fontWeight: 700, '&:hover': { bgcolor: '#6D28D9' } }}>
                  {simulando ? 'Simulando...' : 'Lanzar Simulación Completa'}
                </Button>
                {simulando && (
                  <LinearProgress variant="determinate" value={progSim} sx={{ mt: 2, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: APS_COLOR } }} />
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 3 }}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 3, fontSize: 15 }}>Impacto Estimado (Preview)</Typography>
                {[
                  { label: 'OTIF', val: `${otifEst}%`, base: '96.2%', good: otifEst >= 96.2 },
                  { label: 'Costo Total', val: `$${costoEst.toLocaleString()}M`, base: '$4,850M', good: costoEst <= 4850 },
                  { label: 'Revenue', val: `$${revenueEst.toLocaleString()}M`, base: '$8,420M', good: revenueEst >= 8420 },
                  { label: 'Service Level', val: `${serviceEst}%`, base: '97.1%', good: serviceEst >= 97.1 },
                ].map(k => (
                  <Box key={k.label} sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.04)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{k.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Base: {k.base}</Typography>
                        {k.good ? <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} /> : <TrendingDown sx={{ fontSize: 14, color: '#EF4444' }} />}
                      </Box>
                    </Box>
                    <Typography sx={{ color: k.good ? '#10B981' : '#EF4444', fontSize: 24, fontWeight: 800, mt: 0.5 }}>{k.val}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
