import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { Checklist, Add, CheckCircle, Schedule, PlayArrow, Cancel } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const PAGE_BG = '#F0F2F5'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: '#F9FAFB', '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SEL = { color: 'text.primary', bgcolor: '#F9FAFB', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }

type EstadoInsp = 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'

interface Inspeccion {
  id: number; numero: string; tipo: 'PLANEADA' | 'NO_PLANEADA'
  area: string; estado: EstadoInsp; fecha_programada: string
  inspector: string; descripcion: string; hallazgos_count: number; puntuacion?: number
}

const ESTADO_META: Record<EstadoInsp, { label: string; color: string; icon: React.ReactNode }> = {
  PROGRAMADA: { label: 'Programada', color: '#3b82f6',  icon: <Schedule sx={{ fontSize: 14 }} /> },
  EN_CURSO:   { label: 'En curso',   color: '#f59e0b',  icon: <PlayArrow sx={{ fontSize: 14 }} /> },
  COMPLETADA: { label: 'Completada', color: '#22c55e',  icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  CANCELADA:  { label: 'Cancelada',  color: '#64748b',  icon: <Cancel sx={{ fontSize: 14 }} /> },
}

const INSPECCIONES: Inspeccion[] = [
  { id: 1, numero: 'SST-INSP-2026-00023', tipo: 'PLANEADA',     area: 'Bodega Central',        estado: 'PROGRAMADA',  fecha_programada: '2026-06-25', inspector: 'A. Torres',   descripcion: 'Inspección mensual orden y aseo', hallazgos_count: 0 },
  { id: 2, numero: 'SST-INSP-2026-00022', tipo: 'PLANEADA',     area: 'Planta Producción',     estado: 'EN_CURSO',    fecha_programada: '2026-06-23', inspector: 'C. Rojas',    descripcion: 'Revisión condiciones equipos y maquinaria', hallazgos_count: 2 },
  { id: 3, numero: 'SST-INSP-2026-00021', tipo: 'NO_PLANEADA',  area: 'Taller Mecánico',       estado: 'COMPLETADA',  fecha_programada: '2026-06-20', inspector: 'M. Vargas',   descripcion: 'Inspección EPP operarios soldadura', hallazgos_count: 4, puntuacion: 72 },
  { id: 4, numero: 'SST-INSP-2026-00020', tipo: 'PLANEADA',     area: 'Oficinas Admin.',        estado: 'COMPLETADA',  fecha_programada: '2026-06-15', inspector: 'A. Torres',   descripcion: 'Inspección ergonómica puestos trabajo', hallazgos_count: 1, puntuacion: 88 },
  { id: 5, numero: 'SST-INSP-2026-00019', tipo: 'PLANEADA',     area: 'Patio Vehículos',       estado: 'CANCELADA',   fecha_programada: '2026-06-10', inspector: 'J. Martínez', descripcion: 'Inspección señalización y demarcación', hallazgos_count: 0 },
]

export default function SSTInspecciones() {
  const [items, setItems]   = useState<Inspeccion[]>(INSPECCIONES)
  const [open, setOpen]     = useState(false)
  const [vista, setVista]   = useState<'PLANEADA' | 'TODAS'>('TODAS')
  const [filtroE, setFiltroE] = useState<EstadoInsp | ''>('')
  const [area, setArea]     = useState('')
  const [tipo, setTipo]     = useState<'PLANEADA' | 'NO_PLANEADA'>('PLANEADA')
  const [fecha, setFecha]   = useState('')
  const [insp, setInsp]     = useState('')
  const [desc, setDesc]     = useState('')

  const visibles = items
    .filter(i => vista === 'TODAS' ? true : i.tipo === 'PLANEADA')
    .filter(i => filtroE ? i.estado === filtroE : true)

  const kpis = [
    { label: 'Total año',       value: items.length,                                              color: SST_COLOR },
    { label: 'Programadas',     value: items.filter(i => i.estado === 'PROGRAMADA').length,        color: '#3b82f6' },
    { label: 'Completadas',     value: items.filter(i => i.estado === 'COMPLETADA').length,        color: '#22c55e' },
    { label: 'Hallazgos total', value: items.reduce((a, i) => a + i.hallazgos_count, 0),           color: '#f59e0b' },
  ]

  function handleCrear() {
    if (!fecha || !area) return
    const nuevo: Inspeccion = {
      id: items.length + 1,
      numero: `SST-INSP-2026-${String(items.length + 24).padStart(5, '0')}`,
      tipo, area, estado: 'PROGRAMADA', fecha_programada: fecha,
      inspector: insp, descripcion: desc, hallazgos_count: 0,
    }
    setItems(prev => [nuevo, ...prev])
    setOpen(false); setArea(''); setFecha(''); setInsp(''); setDesc('')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Checklist sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Inspecciones SST</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Inspecciones planeadas, no planeadas y seguimiento de hallazgos</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <ToggleButtonGroup value={vista} exclusive onChange={(_, v) => v && setVista(v)} size="small"
              sx={{ '& .MuiToggleButton-root': { color: 'text.secondary', borderColor: '#E5E7EB', '&.Mui-selected': { bgcolor: alpha(SST_COLOR, 0.2), color: '#F87171' } } }}>
              <ToggleButton value="TODAS">Todas</ToggleButton>
              <ToggleButton value="PLANEADA">Planeadas</ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SST_COLOR }}>Nueva Inspección</Button>
          </Box>
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

        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {(['', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'] as const).map(e => (
            <Chip key={e} label={e === '' ? 'Todos' : ESTADO_META[e as EstadoInsp]?.label}
              onClick={() => setFiltroE(e as EstadoInsp | '')}
              sx={{ bgcolor: filtroE === e ? alpha(SST_COLOR, 0.2) : '#F9FAFB', color: filtroE === e ? '#C53030' : '#64748B', border: `1px solid ${filtroE === e ? alpha(SST_COLOR, 0.4) : '#E5E7EB'}`, cursor: 'pointer', fontSize: 11 }} />
          ))}
        </Box>

        {/* Lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibles.map(i => {
            const meta = ESTADO_META[i.estado]
            return (
              <Card key={i.id} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#C53030' }}>{i.numero}</Typography>
                        <Chip label={i.tipo === 'PLANEADA' ? 'Planeada' : 'No Planeada'} size="small" sx={{ bgcolor: i.tipo === 'PLANEADA' ? alpha('#3b82f6', 0.12) : alpha('#f59e0b', 0.12), color: i.tipo === 'PLANEADA' ? '#60a5fa' : '#fbbf24', fontSize: 10 }} />
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{i.area}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>{i.descripcion}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip label={`Inspector: ${i.inspector}`} size="small" sx={{ bgcolor: '#F9FAFB', color: 'text.secondary', fontSize: 10 }} />
                        <Chip label={`${i.hallazgos_count} hallazgos`} size="small" sx={{ bgcolor: i.hallazgos_count > 0 ? alpha('#f59e0b', 0.12) : '#F9FAFB', color: i.hallazgos_count > 0 ? '#fbbf24' : '#64748B', fontSize: 10 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                      <Chip label={meta.label} size="small" icon={meta.icon as any} sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700, fontSize: 10, '& .MuiChip-icon': { color: meta.color } }} />
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{i.fecha_programada}</Typography>
                      {i.puntuacion !== undefined && <Chip label={`Score: ${i.puntuacion}%`} size="small" sx={{ bgcolor: alpha(i.puntuacion >= 80 ? '#22c55e' : '#f59e0b', 0.12), color: i.puntuacion >= 80 ? '#22c55e' : '#f59e0b', fontSize: 10, fontWeight: 700 }} />}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {/* Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Programar Nueva Inspección</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Tipo</InputLabel>
                <Select value={tipo} label="Tipo" onChange={e => setTipo(e.target.value as 'PLANEADA' | 'NO_PLANEADA')} sx={SX_SEL}>
                  <MenuItem value="PLANEADA">Planeada</MenuItem>
                  <MenuItem value="NO_PLANEADA">No planeada</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Fecha programada *" type="date" value={fecha} onChange={e => setFecha(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
            </Box>
            <TextField label="Área a inspeccionar *" value={area} onChange={e => setArea(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <TextField label="Inspector responsable" value={insp} onChange={e => setInsp(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <TextField label="Descripción / objetivo" value={desc} onChange={e => setDesc(e.target.value)} fullWidth multiline rows={2} size="small" sx={SX_INPUT} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #F1F5F9' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrear} disabled={!fecha || !area} sx={{ bgcolor: SST_COLOR }}>Programar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
