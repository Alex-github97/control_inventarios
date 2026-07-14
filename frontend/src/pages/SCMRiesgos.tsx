import React, { useState } from 'react'
import { Box, Typography, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { GppBad, Warning, Info, Add, Shield } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SCM_COLOR = '#0C4D8C'
const PAGE_BG   = '#F0F2F5'
const BORDER    = `rgba(12,77,140,0.25)`

type Impacto  = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO'
type Prob     = 'BAJA' | 'MEDIA' | 'ALTA'
type EstadoR  = 'IDENTIFICADO' | 'EN_MITIGACION' | 'MITIGADO' | 'MATERIALIZADO'

interface Riesgo {
  id: number; titulo: string; categoria: string; impacto: Impacto; probabilidad: Prob
  estado: EstadoR; responsable: string; descripcion: string
}

const RIESGOS_INIT: Riesgo[] = [
  { id: 1, titulo: 'Escasez de acero laminado en caliente', categoria: 'Proveedor', impacto: 'CRÍTICO', probabilidad: 'MEDIA', estado: 'EN_MITIGACION', responsable: 'J. Martínez', descripcion: 'Reducción de oferta global por paros siderúrgicos en Asia.' },
  { id: 2, titulo: 'Retrasos en importaciones por cambio arancelario', categoria: 'Regulatorio', impacto: 'ALTO', probabilidad: 'ALTA', estado: 'IDENTIFICADO', responsable: 'C. Rojas', descripcion: 'Nuevas tarifas aduanales sobre equipos electrónicos.' },
  { id: 3, titulo: 'Concentración en proveedor único de lubricantes', categoria: 'Operativo', impacto: 'ALTO', probabilidad: 'BAJA', estado: 'EN_MITIGACION', responsable: 'A. Torres', descripcion: 'Solo un proveedor homologado para lubricantes críticos de planta.' },
  { id: 4, titulo: 'Variación tipo de cambio USD/COP >10%', categoria: 'Financiero', impacto: 'MEDIO', probabilidad: 'ALTA', estado: 'IDENTIFICADO', responsable: 'Dir. Financiero', descripcion: 'Impacto en costos de importación no cubiertos con hedge.' },
  { id: 5, titulo: 'Falla en sistema WMS bodega central', categoria: 'Tecnológico', impacto: 'ALTO', probabilidad: 'BAJA', estado: 'MITIGADO', responsable: 'TI', descripcion: 'Plan de contingencia manual activado; backup diario en site alterno.' },
]

const IMPACTO_META: Record<Impacto, { color: string; icon: React.ReactNode }> = {
  CRÍTICO: { color: '#ef4444', icon: <GppBad sx={{ fontSize: 14 }} /> },
  ALTO:    { color: '#f97316', icon: <Warning sx={{ fontSize: 14 }} /> },
  MEDIO:   { color: '#f59e0b', icon: <Warning sx={{ fontSize: 14 }} /> },
  BAJO:    { color: '#64748b', icon: <Info sx={{ fontSize: 14 }} /> },
}

const ESTADO_META: Record<EstadoR, { label: string; color: string }> = {
  IDENTIFICADO:   { label: 'Identificado',    color: '#f59e0b' },
  EN_MITIGACION:  { label: 'En Mitigación',   color: '#3b82f6' },
  MITIGADO:       { label: 'Mitigado',         color: '#22c55e' },
  MATERIALIZADO:  { label: 'Materializado',    color: '#ef4444' },
}

const IMPACTOS: Impacto[]  = ['BAJO', 'MEDIO', 'ALTO', 'CRÍTICO']
const PROBS: Prob[]        = ['BAJA', 'MEDIA', 'ALTA']
const ESTADOS: EstadoR[]   = ['IDENTIFICADO', 'EN_MITIGACION', 'MITIGADO', 'MATERIALIZADO']
const CATEGORIAS = ['Proveedor', 'Regulatorio', 'Operativo', 'Financiero', 'Tecnológico', 'Logístico', 'Otro']

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: '#F9FAFB', '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SELECT = { color: 'text.primary', bgcolor: '#F9FAFB', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }

interface Form { titulo: string; categoria: string; impacto: Impacto; probabilidad: Prob; responsable: string; descripcion: string }
const EMPTY: Form = { titulo: '', categoria: 'Operativo', impacto: 'MEDIO', probabilidad: 'MEDIA', responsable: '', descripcion: '' }

export default function SCMRiesgos() {
  const [riesgos, setRiesgos] = useState<Riesgo[]>(RIESGOS_INIT)
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState<Form>(EMPTY)
  const [filtro, setFiltro]   = useState<EstadoR | ''>('')

  const visibles = filtro ? riesgos.filter(r => r.estado === filtro) : riesgos

  function handleGuardar() {
    if (!form.titulo.trim()) return
    const nuevo: Riesgo = { id: riesgos.length + 1, ...form, estado: 'IDENTIFICADO' }
    setRiesgos(prev => [nuevo, ...prev])
    setOpen(false); setForm(EMPTY)
  }

  const conteo: Record<EstadoR, number> = { IDENTIFICADO: 0, EN_MITIGACION: 0, MITIGADO: 0, MATERIALIZADO: 0 }
  riesgos.forEach(r => conteo[r.estado]++)

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Gestión de Riesgos SCM</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Registro de riesgos de cadena de suministro y planes de mitigación</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SCM_COLOR }}>Nuevo Riesgo</Button>
        </Box>

        {/* Resumen estados */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {(Object.entries(ESTADO_META) as [EstadoR, typeof ESTADO_META[EstadoR]][]).map(([k, v]) => (
            <Grid key={k} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card onClick={() => setFiltro(prev => prev === k ? '' : k)} sx={{ border: `2px solid ${filtro === k ? v.color : alpha(v.color, 0.2)}`, borderRadius: 2, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <CardContent sx={{ p: '12px !important' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>{v.label}</Typography>
                  <Typography sx={{ fontSize: 30, fontWeight: 800, color: v.color, lineHeight: 1.2 }}>{conteo[k]}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Lista de riesgos */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibles.map(r => {
            const imp = IMPACTO_META[r.impacto]
            const est = ESTADO_META[r.estado]
            return (
              <Card key={r.id} sx={{ border: `1px solid ${alpha(imp.color, 0.2)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ color: imp.color }}>{imp.icon}</Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{r.titulo}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>{r.descripcion}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={r.categoria} size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontSize: 10 }} />
                        <Chip label={`Impacto: ${r.impacto}`} size="small" sx={{ bgcolor: alpha(imp.color, 0.12), color: imp.color, fontSize: 10, fontWeight: 700 }} />
                        <Chip label={`Prob.: ${r.probabilidad}`} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 10 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip label={est.label} size="small" sx={{ bgcolor: alpha(est.color, 0.15), color: est.color, fontWeight: 700, fontSize: 10 }} />
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Resp.: {r.responsable}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {/* Dialog nuevo riesgo */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Registrar Nuevo Riesgo</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Título *" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} fullWidth size="small" sx={SX_INPUT} />
            <TextField label="Descripción" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} fullWidth multiline rows={2} size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Categoría</InputLabel>
                <Select value={form.categoria} label="Categoría" onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} sx={SX_SELECT}>
                  {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Impacto</InputLabel>
                <Select value={form.impacto} label="Impacto" onChange={e => setForm(f => ({ ...f, impacto: e.target.value as Impacto }))} sx={SX_SELECT}>
                  {IMPACTOS.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'text.secondary' }}>Probabilidad</InputLabel>
                <Select value={form.probabilidad} label="Probabilidad" onChange={e => setForm(f => ({ ...f, probabilidad: e.target.value as Prob }))} sx={SX_SELECT}>
                  {PROBS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Responsable" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} fullWidth size="small" sx={SX_INPUT} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #F1F5F9' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleGuardar} disabled={!form.titulo.trim()} sx={{ bgcolor: SCM_COLOR }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
