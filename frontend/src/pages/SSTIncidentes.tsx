import React, { useState, useEffect } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { ReportProblem, Add, CheckCircle, HourglassEmpty, Search, Close } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'

const SST_COLOR = '#C53030'
const PAGE_BG = '#F0F2F5'
const BORDER = '#E5E7EB'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: '#F9FAFB', '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SEL = { color: 'text.primary', bgcolor: '#F9FAFB', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }

type TipoInc = 'ACCIDENTE_TRABAJO' | 'INCIDENTE' | 'ENFERMEDAD_LABORAL' | 'CASI_ACCIDENTE'
type Gravedad = 'LEVE' | 'MODERADO' | 'GRAVE' | 'MUY_GRAVE' | 'MORTAL'
type EstadoInc = 'REPORTADO' | 'EN_INVESTIGACION' | 'INVESTIGADO' | 'CERRADO'

interface Incidente {
  id: number; numero: string; tipo: TipoInc; gravedad?: Gravedad; estado: EstadoInc
  fecha_evento: string; trabajador?: string; cargo?: string; area?: string
  descripcion?: string; dias_incapacidad: number; investigador?: string
}

const TIPO_LABEL: Record<TipoInc, string> = {
  ACCIDENTE_TRABAJO: 'Accidente de Trabajo',
  INCIDENTE:         'Incidente',
  ENFERMEDAD_LABORAL:'Enfermedad Laboral',
  CASI_ACCIDENTE:    'Casi Accidente',
}

const GRAVEDAD_META: Record<Gravedad, { label: string; color: string }> = {
  LEVE:      { label: 'Leve',      color: '#22c55e' },
  MODERADO:  { label: 'Moderado',  color: '#f59e0b' },
  GRAVE:     { label: 'Grave',     color: '#f97316' },
  MUY_GRAVE: { label: 'Muy grave', color: '#ef4444' },
  MORTAL:    { label: 'Mortal',    color: '#7f1d1d' },
}

const ESTADO_META: Record<EstadoInc, { label: string; color: string }> = {
  REPORTADO:       { label: 'Reportado',        color: '#f59e0b' },
  EN_INVESTIGACION:{ label: 'En Investigación', color: '#3b82f6' },
  INVESTIGADO:     { label: 'Investigado',      color: '#8b5cf6' },
  CERRADO:         { label: 'Cerrado',          color: '#64748b' },
}

const TIPOS: TipoInc[] = ['ACCIDENTE_TRABAJO', 'INCIDENTE', 'ENFERMEDAD_LABORAL', 'CASI_ACCIDENTE']
const GRAVEDADES: Gravedad[] = ['LEVE', 'MODERADO', 'GRAVE', 'MUY_GRAVE', 'MORTAL']

const INICIAL: Incidente[] = [
  { id: 1, numero: 'SST-INC-2026-00006', tipo: 'INCIDENTE', gravedad: 'LEVE', estado: 'INVESTIGADO', fecha_evento: '2026-06-18', trabajador: 'Pedro Gómez', cargo: 'Operario Bodega', area: 'Bodega Central', descripcion: 'Caída menor al bajar escalera sin apoyo', dias_incapacidad: 0, investigador: 'A. Torres' },
  { id: 2, numero: 'SST-INC-2026-00005', tipo: 'ACCIDENTE_TRABAJO', gravedad: 'MODERADO', estado: 'EN_INVESTIGACION', fecha_evento: '2026-06-12', trabajador: 'Laura Díaz', cargo: 'Auxiliar Logístico', area: 'Planta Producción', descripcion: 'Golpe en mano por atrapamiento en maquinaria', dias_incapacidad: 3, investigador: 'C. Rojas' },
  { id: 3, numero: 'SST-INC-2026-00004', tipo: 'CASI_ACCIDENTE', estado: 'CERRADO', fecha_evento: '2026-06-05', trabajador: 'Jorge Rueda', cargo: 'Conductor', area: 'Patio Vehículos', descripcion: 'Derrumbe parcial de estantería, sin lesionados', dias_incapacidad: 0, investigador: 'M. Vargas' },
  { id: 4, numero: 'SST-INC-2026-00003', tipo: 'ACCIDENTE_TRABAJO', gravedad: 'GRAVE', estado: 'CERRADO', fecha_evento: '2026-05-20', trabajador: 'Sandra López', cargo: 'Técnico Mantenimiento', area: 'Taller', descripcion: 'Lesión en espalda baja por sobreesfuerzo', dias_incapacidad: 15, investigador: 'A. Torres' },
]

export default function SSTIncidentes() {
  const [items, setItems] = useState<Incidente[]>(INICIAL)
  const [open, setOpen]   = useState(false)
  const [filtro, setFiltro] = useState<EstadoInc | ''>('')
  const [tipo,    setTipo]    = useState<TipoInc>('INCIDENTE')
  const [gravedad, setGravedad] = useState<Gravedad>('LEVE')
  const [fecha,   setFecha]   = useState('')
  const [trabajador, setTrabajador] = useState('')
  const [area,    setArea]    = useState('')
  const [desc,    setDesc]    = useState('')

  const visibles = filtro ? items.filter(i => i.estado === filtro) : items

  const kpis = [
    { label: 'Total',             value: items.length,                                                 color: SST_COLOR },
    { label: 'En investigación',  value: items.filter(i => i.estado === 'EN_INVESTIGACION').length,     color: '#3b82f6' },
    { label: 'Con incapacidad',   value: items.filter(i => i.dias_incapacidad > 0).length,              color: '#f59e0b' },
    { label: 'Días incapacidad',  value: items.reduce((a, i) => a + i.dias_incapacidad, 0),             color: '#ef4444' },
  ]

  function handleCrear() {
    if (!fecha) return
    const nuevo: Incidente = {
      id: items.length + 1,
      numero: `SST-INC-2026-${String(items.length + 7).padStart(5, '0')}`,
      tipo, gravedad, estado: 'REPORTADO', fecha_evento: fecha,
      trabajador, area, descripcion: desc, dias_incapacidad: 0,
    }
    setItems(prev => [nuevo, ...prev])
    setOpen(false); setFecha(''); setTrabajador(''); setArea(''); setDesc('')
    setTipo('INCIDENTE'); setGravedad('LEVE')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReportProblem sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Incidentes y Accidentes</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Registro, investigación y seguimiento de eventos de seguridad</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: SST_COLOR, fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SST_COLOR }}>Reportar Evento</Button>
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

        {/* Filtros de estado */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {(['', 'REPORTADO', 'EN_INVESTIGACION', 'INVESTIGADO', 'CERRADO'] as const).map(e => (
            <Chip key={e} label={e === '' ? 'Todos' : ESTADO_META[e as EstadoInc]?.label}
              onClick={() => setFiltro(e as EstadoInc | '')}
              sx={{ bgcolor: filtro === e ? alpha(SST_COLOR, 0.2) : '#fff', color: filtro === e ? SST_COLOR : 'text.secondary', border: `1px solid ${filtro === e ? alpha(SST_COLOR, 0.4) : BORDER}`, cursor: 'pointer', fontSize: 11 }} />
          ))}
        </Box>

        {/* Lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibles.map(inc => {
            const est = ESTADO_META[inc.estado]
            const grav = inc.gravedad ? GRAVEDAD_META[inc.gravedad] : null
            return (
              <Card key={inc.id} sx={{ border: `1px solid ${grav ? alpha(grav.color, 0.2) : BORDER}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: SST_COLOR }}>{inc.numero}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{TIPO_LABEL[inc.tipo]}</Typography>
                      {inc.trabajador && <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{inc.trabajador} · {inc.cargo} · {inc.area}</Typography>}
                      {inc.descripcion && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{inc.descripcion}</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                      <Chip label={est.label} size="small" sx={{ bgcolor: alpha(est.color, 0.15), color: est.color, fontWeight: 700, fontSize: 10 }} />
                      {grav && <Chip label={grav.label} size="small" sx={{ bgcolor: alpha(grav.color, 0.12), color: grav.color, fontSize: 10 }} />}
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{inc.fecha_evento}</Typography>
                      {inc.dias_incapacidad > 0 && <Chip label={`${inc.dias_incapacidad}d incap.`} size="small" sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444', fontSize: 10 }} />}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {/* Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Reportar Evento de Seguridad</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Tipo *</InputLabel>
                <Select value={tipo} label="Tipo *" onChange={e => setTipo(e.target.value as TipoInc)} sx={SX_SEL}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{TIPO_LABEL[t]}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Gravedad</InputLabel>
                <Select value={gravedad} label="Gravedad" onChange={e => setGravedad(e.target.value as Gravedad)} sx={SX_SEL}>
                  {GRAVEDADES.map(g => <MenuItem key={g} value={g}>{GRAVEDAD_META[g].label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Fecha del evento *" type="date" value={fecha} onChange={e => setFecha(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
            <TextField label="Trabajador involucrado" value={trabajador} onChange={e => setTrabajador(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <TextField label="Área" value={area} onChange={e => setArea(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <TextField label="Descripción del evento" value={desc} onChange={e => setDesc(e.target.value)} fullWidth multiline rows={3} size="small" sx={SX_INPUT} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #F1F5F9' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrear} disabled={!fecha} sx={{ bgcolor: SST_COLOR }}>Reportar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
