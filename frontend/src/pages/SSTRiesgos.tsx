import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { GppBad, Add, Warning, CheckCircle, Info } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(197,48,48,0.2)'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
}
const SX_SEL = { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' } }

type NivelR = 'ACEPTABLE' | 'BAJO' | 'MEDIO' | 'ALTO' | 'INACEPTABLE'
type ClaseP = 'FISICO' | 'QUIMICO' | 'BIOLOGICO' | 'BIOMECANICO' | 'PSICOSOCIAL' | 'SEGURIDAD' | 'FENOMENOS_NATURALES' | 'PUBLICO'

interface Riesgo {
  id: number; codigo: string; proceso: string; area: string; actividad: string
  clase_peligro: ClaseP; descripcion_peligro: string; efecto_posible: string
  nivel_riesgo: NivelR; probabilidad: number; impacto: number
  controles_existentes: string; responsable: string
}

const NIVEL_META: Record<NivelR, { color: string; label: string }> = {
  INACEPTABLE: { color: '#ef4444', label: 'Inaceptable' },
  ALTO:        { color: '#f97316', label: 'Alto' },
  MEDIO:       { color: '#f59e0b', label: 'Medio' },
  BAJO:        { color: '#22c55e', label: 'Bajo' },
  ACEPTABLE:   { color: '#3b82f6', label: 'Aceptable' },
}

const CLASE_LABEL: Record<ClaseP, string> = {
  FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico',
  BIOMECANICO: 'Biomecánico', PSICOSOCIAL: 'Psicosocial', SEGURIDAD: 'Seguridad',
  FENOMENOS_NATURALES: 'Fenómenos naturales', PUBLICO: 'Público',
}

const RIESGOS_INIT: Riesgo[] = [
  { id: 1, codigo: 'IPER-2026-00001', proceso: 'Operación bodega', area: 'Bodega Central', actividad: 'Cargue y descargue manual', clase_peligro: 'BIOMECANICO', descripcion_peligro: 'Levantamiento de cargas pesadas >25 kg', efecto_posible: 'Lumbago, hernia discal', nivel_riesgo: 'ALTO', probabilidad: 7, impacto: 8, controles_existentes: 'Capacitación postural', responsable: 'Coord. Bodega' },
  { id: 2, codigo: 'IPER-2026-00002', proceso: 'Mantenimiento', area: 'Taller Mecánico', actividad: 'Soldadura eléctrica', clase_peligro: 'FISICO', descripcion_peligro: 'Radiación ultravioleta y chispas', efecto_posible: 'Quemaduras oculares, piel', nivel_riesgo: 'INACEPTABLE', probabilidad: 9, impacto: 9, controles_existentes: 'Careta de soldar EPP básico', responsable: 'Jefe Taller' },
  { id: 3, codigo: 'IPER-2026-00003', proceso: 'Administración', area: 'Oficinas', actividad: 'Trabajo con computador', clase_peligro: 'PSICOSOCIAL', descripcion_peligro: 'Carga mental, estrés por multitarea', efecto_posible: 'Burnout, trastornos ansiedad', nivel_riesgo: 'MEDIO', probabilidad: 6, impacto: 5, controles_existentes: 'Pausas activas', responsable: 'RRHH' },
  { id: 4, codigo: 'IPER-2026-00004', proceso: 'Transporte', area: 'Patio Vehículos', actividad: 'Conducción en zona urbana', clase_peligro: 'SEGURIDAD', descripcion_peligro: 'Accidentes de tránsito', efecto_posible: 'Lesiones graves, muerte', nivel_riesgo: 'ALTO', probabilidad: 6, impacto: 9, controles_existentes: 'Selección conductores, revisión técnico-mecánica', responsable: 'Jefe Flota' },
  { id: 5, codigo: 'IPER-2026-00005', proceso: 'Producción', area: 'Planta', actividad: 'Uso de solventes y pinturas', clase_peligro: 'QUIMICO', descripcion_peligro: 'Exposición a vapores orgánicos', efecto_posible: 'Intoxicación, daño hepático', nivel_riesgo: 'MEDIO', probabilidad: 5, impacto: 7, controles_existentes: 'Ventilación forzada, EPP respiratorio', responsable: 'Jefe Producción' },
]

const CLASES: ClaseP[] = ['FISICO','QUIMICO','BIOLOGICO','BIOMECANICO','PSICOSOCIAL','SEGURIDAD','FENOMENOS_NATURALES','PUBLICO']
const NIVELES: NivelR[] = ['ACEPTABLE','BAJO','MEDIO','ALTO','INACEPTABLE']

export default function SSTRiesgos() {
  const [riesgos, setRiesgos] = useState<Riesgo[]>(RIESGOS_INIT)
  const [open, setOpen]       = useState(false)
  const [filtroN, setFiltroN] = useState<NivelR | ''>('')
  const [proceso, setProceso] = useState('')
  const [area, setArea]       = useState('')
  const [actividad, setAct]   = useState('')
  const [clase, setClase]     = useState<ClaseP>('BIOMECANICO')
  const [desc, setDesc]       = useState('')
  const [efecto, setEfecto]   = useState('')
  const [nivel, setNivel]     = useState<NivelR>('MEDIO')
  const [prob, setProb]       = useState('5')
  const [imp, setImp]         = useState('5')
  const [controles, setControles] = useState('')
  const [resp, setResp]       = useState('')

  const visibles = filtroN ? riesgos.filter(r => r.nivel_riesgo === filtroN) : riesgos

  const conteo: Record<NivelR, number> = { INACEPTABLE: 0, ALTO: 0, MEDIO: 0, BAJO: 0, ACEPTABLE: 0 }
  riesgos.forEach(r => conteo[r.nivel_riesgo]++)

  function handleGuardar() {
    if (!actividad.trim()) return
    const nuevo: Riesgo = {
      id: riesgos.length + 1,
      codigo: `IPER-2026-${String(riesgos.length + 6).padStart(5, '0')}`,
      proceso, area, actividad, clase_peligro: clase,
      descripcion_peligro: desc, efecto_posible: efecto,
      nivel_riesgo: nivel, probabilidad: Number(prob), impacto: Number(imp),
      controles_existentes: controles, responsable: resp,
    }
    setRiesgos(prev => [nuevo, ...prev])
    setOpen(false)
    setProceso(''); setArea(''); setAct(''); setDesc(''); setEfecto(''); setControles(''); setResp('')
    setProb('5'); setImp('5'); setClase('BIOMECANICO'); setNivel('MEDIO')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GppBad sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Matriz IPER</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Identificación de Peligros y Evaluación de Riesgos · Decreto 1072/2015</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SST_COLOR }}>Nuevo Riesgo</Button>
        </Box>

        {/* Conteo por nivel (clickeable = filtro) */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {NIVELES.slice().reverse().map(n => {
            const meta = NIVEL_META[n]
            return (
              <Grid key={n} size={{ xs: 12, sm: 6, md: 'auto' }} sx={{ flex: 1 }}>
                <Card onClick={() => setFiltroN(prev => prev === n ? '' : n)}
                  sx={{ bgcolor: CARD_BG, border: `2px solid ${filtroN === n ? meta.color : alpha(meta.color, 0.2)}`, borderRadius: 2, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                  <CardContent sx={{ p: '12px !important' }}>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{meta.label}</Typography>
                    <Typography sx={{ fontSize: 30, fontWeight: 900, color: meta.color, lineHeight: 1.2 }}>{conteo[n]}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {/* Lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibles.map(r => {
            const nmeta = NIVEL_META[r.nivel_riesgo]
            return (
              <Card key={r.id} sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(nmeta.color, 0.25)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#F87171' }}>{r.codigo}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.proceso} / {r.area}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff', mb: 0.25 }}>{r.actividad}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', mb: 1 }}>{r.descripcion_peligro} → {r.efecto_posible}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={CLASE_LABEL[r.clase_peligro]} size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.12), color: '#F87171', fontSize: 10 }} />
                        <Chip label={`P:${r.probabilidad} × I:${r.impacto}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                        {r.controles_existentes && <Chip label={r.controles_existentes} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', fontSize: 10 }} />}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip label={nmeta.label} size="small" sx={{ bgcolor: alpha(nmeta.color, 0.18), color: nmeta.color, fontWeight: 800, fontSize: 11 }} />
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Resp.: {r.responsable}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {/* Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0A1628', color: '#fff' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>Registrar Peligro en Matriz IPER</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Proceso" value={proceso} onChange={e => setProceso(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
              <TextField label="Área" value={area} onChange={e => setArea(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            </Box>
            <TextField label="Actividad / Tarea *" value={actividad} onChange={e => setAct(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Clase de peligro</InputLabel>
                <Select value={clase} label="Clase de peligro" onChange={e => setClase(e.target.value as ClaseP)} sx={SX_SEL}>
                  {CLASES.map(c => <MenuItem key={c} value={c}>{CLASE_LABEL[c]}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Nivel de riesgo</InputLabel>
                <Select value={nivel} label="Nivel de riesgo" onChange={e => setNivel(e.target.value as NivelR)} sx={SX_SEL}>
                  {NIVELES.map(n => <MenuItem key={n} value={n}>{NIVEL_META[n].label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Descripción del peligro" value={desc} onChange={e => setDesc(e.target.value)} fullWidth multiline rows={2} size="small" sx={SX_INPUT} />
            <TextField label="Efecto / consecuencia posible" value={efecto} onChange={e => setEfecto(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Probabilidad (1-10)" value={prob} onChange={e => setProb(e.target.value)} type="number" fullWidth size="small" sx={SX_INPUT} />
              <TextField label="Impacto (1-10)" value={imp} onChange={e => setImp(e.target.value)} type="number" fullWidth size="small" sx={SX_INPUT} />
              <TextField label="Responsable" value={resp} onChange={e => setResp(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            </Box>
            <TextField label="Controles existentes" value={controles} onChange={e => setControles(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleGuardar} disabled={!actividad.trim()} sx={{ bgcolor: SST_COLOR }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
