import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { School, Add, CheckCircle, Schedule, PlayArrow, People } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const #E5E7EB  = 'rgba(197,48,48,0.2)'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SEL = { '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }

type EstadoCap = 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'

interface Capacitacion {
  id: number; codigo: string; titulo: string; tipo: string; modalidad: string
  estado: EstadoCap; instructor: string; fecha_inicio: string; fecha_fin: string
  duracion_horas: number; max_participantes: number; participantes: number
  area_dirigida: string; evaluacion_prom?: number
}

const ESTADO_META: Record<EstadoCap, { label: string; color: string }> = {
  PROGRAMADA: { label: 'Programada', color: '#3b82f6' },
  EN_CURSO:   { label: 'En curso',   color: '#f59e0b' },
  COMPLETADA: { label: 'Completada', color: '#22c55e' },
  CANCELADA:  { label: 'Cancelada',  color: '#64748b' },
}

const CAPACITACIONES: Capacitacion[] = [
  { id: 1, codigo: 'CAP-SST-2026-00012', titulo: 'Inducción SG-SST para colaboradores nuevos',          tipo: 'INDUCCION',         modalidad: 'Presencial', estado: 'PROGRAMADA',  instructor: 'Coord. SST',     fecha_inicio: '2026-07-01', fecha_fin: '2026-07-01', duracion_horas: 8,  max_participantes: 25, participantes: 0,  area_dirigida: 'Todas las áreas' },
  { id: 2, codigo: 'CAP-SST-2026-00011', titulo: 'Manejo seguro de cargas y ergonomía',                 tipo: 'ESPECIFICA',        modalidad: 'Virtual',    estado: 'EN_CURSO',    instructor: 'ARL',            fecha_inicio: '2026-06-20', fecha_fin: '2026-06-27', duracion_horas: 4,  max_participantes: 40, participantes: 28, area_dirigida: 'Bodega y Logística' },
  { id: 3, codigo: 'CAP-SST-2026-00010', titulo: 'Primeros auxilios y RCP básico',                       tipo: 'PRIMEROS_AUXILIOS', modalidad: 'Presencial', estado: 'COMPLETADA',  instructor: 'Cruz Roja',      fecha_inicio: '2026-06-10', fecha_fin: '2026-06-10', duracion_horas: 8,  max_participantes: 20, participantes: 18, area_dirigida: 'Brigada de emergencias', evaluacion_prom: 87 },
  { id: 4, codigo: 'CAP-SST-2026-00009', titulo: 'Uso correcto de EPP por área de trabajo',              tipo: 'ESPECIFICA',        modalidad: 'Presencial', estado: 'COMPLETADA',  instructor: 'Coord. SST',     fecha_inicio: '2026-06-03', fecha_fin: '2026-06-03', duracion_horas: 2,  max_participantes: 50, participantes: 47, area_dirigida: 'Operaciones', evaluacion_prom: 92 },
  { id: 5, codigo: 'CAP-SST-2026-00008', titulo: 'Plan de emergencias y evacuación',                     tipo: 'EMERGENCIAS',       modalidad: 'Presencial', estado: 'COMPLETADA',  instructor: 'Bomberos',       fecha_inicio: '2026-05-28', fecha_fin: '2026-05-28', duracion_horas: 4,  max_participantes: 100, participantes: 85, area_dirigida: 'Toda la empresa', evaluacion_prom: 79 },
]

const TIPOS_CAP = ['INDUCCION', 'REINDUCCION', 'ESPECIFICA', 'EMERGENCIAS', 'PRIMEROS_AUXILIOS']
const MODALIDADES = ['Presencial', 'Virtual', 'E-learning', 'Mixto']

export default function SSTCapacitacion() {
  const [items, setItems]   = useState<Capacitacion[]>(CAPACITACIONES)
  const [open, setOpen]     = useState(false)
  const [filtro, setFiltro] = useState<EstadoCap | ''>('')
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo]     = useState('ESPECIFICA')
  const [modal, setModal]   = useState('Presencial')
  const [instr, setInstr]   = useState('')
  const [fIni, setFIni]     = useState('')
  const [fFin, setFFin]     = useState('')
  const [horas, setHoras]   = useState('4')
  const [maxP, setMaxP]     = useState('30')
  const [area, setArea]     = useState('')

  const visibles = filtro ? items.filter(i => i.estado === filtro) : items

  const totalHoras = items.filter(i => i.estado === 'COMPLETADA').reduce((a, c) => a + c.duracion_horas, 0)
  const totalPart  = items.reduce((a, c) => a + c.participantes, 0)

  const kpis = [
    { label: 'Total capacitaciones', value: items.length,                                          color: SST_COLOR },
    { label: 'Completadas',          value: items.filter(i => i.estado === 'COMPLETADA').length,   color: '#22c55e' },
    { label: 'Horas ejecutadas',     value: totalHoras,                                            color: '#3b82f6', suffix: 'h' },
    { label: 'Participantes total',  value: totalPart,                                             color: '#8b5cf6' },
  ]

  function handleCrear() {
    if (!titulo || !fIni) return
    const nuevo: Capacitacion = {
      id: items.length + 1,
      codigo: `CAP-SST-2026-${String(items.length + 13).padStart(5, '0')}`,
      titulo, tipo, modalidad: modal, estado: 'PROGRAMADA', instructor: instr,
      fecha_inicio: fIni, fecha_fin: fFin || fIni,
      duracion_horas: Number(horas), max_participantes: Number(maxP),
      participantes: 0, area_dirigida: area,
    }
    setItems(prev => [nuevo, ...prev])
    setOpen(false)
    setTitulo(''); setInstr(''); setFIni(''); setFFin(''); setHoras('4'); setMaxP('30'); setArea('')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <School sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Plan de Capacitación SST</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Programa anual de formación, evaluaciones y certificaciones</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SST_COLOR }}>Programar Capacitación</Button>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}{(k as any).suffix}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {(['', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'] as const).map(e => (
            <Chip key={e} label={e === '' ? 'Todos' : ESTADO_META[e as EstadoCap]?.label}
              onClick={() => setFiltro(e as EstadoCap | '')}
              sx={{ bgcolor: filtro === e ? alpha(SST_COLOR, 0.2) : '#F9FAFB', color: filtro === e ? '#F87171' : 'text.secondary', border: `1px solid ${filtro === e ? alpha(SST_COLOR, 0.4) : 'transparent'}`, cursor: 'pointer', fontSize: 11 }} />
          ))}
        </Box>

        {/* Lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibles.map(c => {
            const meta = ESTADO_META[c.estado]
            const pct = c.max_participantes > 0 ? Math.round(c.participantes / c.max_participantes * 100) : 0
            return (
              <Card key={c.id} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#F87171' }}>{c.codigo}</Typography>
                        <Chip label={c.tipo} size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.1), color: '#F87171', fontSize: 9 }} />
                        <Chip label={c.modalidad} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.disabled', fontSize: 9 }} />
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{c.titulo}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1 }}>Instructor: {c.instructor} · Área: {c.area_dirigida}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip icon={<People sx={{ fontSize: 12 }} />} label={`${c.participantes}/${c.max_participantes}`} size="small" sx={{ bgcolor: '#F9FAFB', color: 'text.secondary', fontSize: 10 }} />
                        <Chip label={`${c.duracion_horas}h`} size="small" sx={{ bgcolor: '#F9FAFB', color: 'text.secondary', fontSize: 10 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                      <Chip label={meta.label} size="small" sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700, fontSize: 10 }} />
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{c.fecha_inicio}</Typography>
                      {c.evaluacion_prom !== undefined && <Chip label={`Eval: ${c.evaluacion_prom}%`} size="small" sx={{ bgcolor: alpha('#22c55e', 0.12), color: '#22c55e', fontSize: 10, fontWeight: 700 }} />}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {/* Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Programar Capacitación SST</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Título de la capacitación *" value={titulo} onChange={e => setTitulo(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select value={tipo} label="Tipo" onChange={e => setTipo(e.target.value)} sx={SX_SEL}>
                  {TIPOS_CAP.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Modalidad</InputLabel>
                <Select value={modal} label="Modalidad" onChange={e => setModal(e.target.value)} sx={SX_SEL}>
                  {MODALIDADES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Instructor / proveedor" value={instr} onChange={e => setInstr(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Fecha inicio *" type="date" value={fIni} onChange={e => setFIni(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
              <TextField label="Fecha fin" type="date" value={fFin} onChange={e => setFFin(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Horas" value={horas} onChange={e => setHoras(e.target.value)} type="number" size="small" sx={SX_INPUT} />
              <TextField label="Cupos máx." value={maxP} onChange={e => setMaxP(e.target.value)} type="number" size="small" sx={SX_INPUT} />
              <TextField label="Área / Grupo" value={area} onChange={e => setArea(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #F1F5F9' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrear} disabled={!titulo || !fIni} sx={{ bgcolor: SST_COLOR }}>Programar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
