import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { AssignmentReturn, CheckCircle, Pending, Cancel, Add, HourglassEmpty } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SCM_COLOR = '#0C4D8C'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = `rgba(12,77,140,0.25)`

type EstadoD = 'PENDIENTE' | 'EN_PROCESO' | 'APROBADA' | 'RECHAZADA' | 'CERRADA'
type MotivoD = 'DEFECTO_CALIDAD' | 'CANTIDAD_INCORRECTA' | 'PRODUCTO_EQUIVOCADO' | 'DANOS_TRANSPORTE' | 'VENCIMIENTO' | 'OTRO'

interface Devolucion {
  id: number; numero: string; proveedor: string; oc_ref: string
  motivo: MotivoD; estado: EstadoD; valor: number
  fecha: string; descripcion: string; items: number
}

const DEVOLUCIONES: Devolucion[] = [
  { id: 1, numero: 'DEV-2026-0018', proveedor: 'Insuquím S.A.S',        oc_ref: 'OC-2026-0412', motivo: 'DEFECTO_CALIDAD',      estado: 'EN_PROCESO', valor: 4_200_000,  fecha: '15 jun 2026', descripcion: 'Lubricante 15W40 fuera de especificación viscosidad.',  items: 48  },
  { id: 2, numero: 'DEV-2026-0017', proveedor: 'Ferrosuministros Ltda',  oc_ref: 'OC-2026-0398', motivo: 'CANTIDAD_INCORRECTA',  estado: 'APROBADA',   valor: 1_850_000,  fecha: '12 jun 2026', descripcion: 'Se recibieron 80 unidades, OC indica 120.',               items: 40  },
  { id: 3, numero: 'DEV-2026-0015', proveedor: 'TecnoEquipos Col.',      oc_ref: 'OC-2026-0375', motivo: 'DANOS_TRANSPORTE',     estado: 'APROBADA',   valor: 12_800_000, fecha: '05 jun 2026', descripcion: 'Equipo de medición dañado en empaque durante envío.',    items: 1   },
  { id: 4, numero: 'DEV-2026-0013', proveedor: 'Papeles del Pacífico',   oc_ref: 'OC-2026-0360', motivo: 'PRODUCTO_EQUIVOCADO', estado: 'CERRADA',    valor: 320_000,    fecha: '01 jun 2026', descripcion: 'Se entregó resma A3 en lugar de A4 solicitada.',         items: 10  },
  { id: 5, numero: 'DEV-2026-0010', proveedor: 'Químicos Andinos',       oc_ref: 'OC-2026-0341', motivo: 'VENCIMIENTO',         estado: 'RECHAZADA',  valor: 980_000,    fecha: '20 may 2026', descripcion: 'Reclamación fuera del plazo acordado en contrato.',       items: 24  },
]

const ESTADO_META: Record<EstadoD, { label: string; color: string; icon: React.ReactNode }> = {
  PENDIENTE:  { label: 'Pendiente',   color: '#f59e0b', icon: <Pending sx={{ fontSize: 14 }} /> },
  EN_PROCESO: { label: 'En Proceso',  color: '#3b82f6', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  APROBADA:   { label: 'Aprobada',    color: '#22c55e', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  RECHAZADA:  { label: 'Rechazada',   color: '#ef4444', icon: <Cancel sx={{ fontSize: 14 }} /> },
  CERRADA:    { label: 'Cerrada',     color: '#64748b', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
}

const MOTIVO_LABEL: Record<MotivoD, string> = {
  DEFECTO_CALIDAD:      'Defecto de calidad',
  CANTIDAD_INCORRECTA:  'Cantidad incorrecta',
  PRODUCTO_EQUIVOCADO:  'Producto equivocado',
  DANOS_TRANSPORTE:     'Daños en transporte',
  VENCIMIENTO:          'Producto vencido',
  OTRO:                 'Otro',
}

const MOTIVOS = Object.keys(MOTIVO_LABEL) as MotivoD[]

function fmt(val: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
}
const SX_SELECT = { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' } }

export default function SCMDevoluciones() {
  const [devs, setDevs]           = useState<Devolucion[]>(DEVOLUCIONES)
  const [open, setOpen]           = useState(false)
  const [proveedor, setProveedor] = useState('')
  const [ocRef, setOcRef]         = useState('')
  const [motivo, setMotivo]       = useState<MotivoD>('DEFECTO_CALIDAD')
  const [desc, setDesc]           = useState('')
  const [valor, setValor]         = useState('')

  const kpis = [
    { label: 'Total devoluciones',    value: devs.length,                                                    color: SCM_COLOR },
    { label: 'En proceso',            value: devs.filter(d => d.estado === 'EN_PROCESO').length,              color: '#3b82f6' },
    { label: 'Valor recuperado',      value: fmt(devs.filter(d => d.estado === 'APROBADA' || d.estado === 'CERRADA').reduce((a, d) => a + d.valor, 0)), color: '#22c55e' },
    { label: 'Tasa aprobación',       value: `${Math.round(devs.filter(d => d.estado === 'APROBADA' || d.estado === 'CERRADA').length / devs.length * 100)}%`, color: '#8b5cf6' },
  ]

  function handleCrear() {
    if (!proveedor.trim() || !ocRef.trim()) return
    const nueva: Devolucion = {
      id: devs.length + 1, numero: `DEV-2026-${String(devs.length + 19).padStart(4, '0')}`,
      proveedor, oc_ref: ocRef, motivo, estado: 'PENDIENTE', valor: Number(valor) || 0,
      fecha: 'Hoy', descripcion: desc, items: 1,
    }
    setDevs(prev => [nueva, ...prev])
    setOpen(false); setProveedor(''); setOcRef(''); setDesc(''); setValor(''); setMotivo('DEFECTO_CALIDAD')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AssignmentReturn sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Devoluciones a Proveedor</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Gestión de retornos, RMA y logística inversa</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SCM_COLOR }}>Nueva Devolución</Button>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {devs.map(d => {
            const meta = ESTADO_META[d.estado]
            return (
              <Card key={d.id} sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#5B9BD5' }}>{d.numero}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>→ ref. {d.oc_ref}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff', mb: 0.3 }}>{d.proveedor}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', mb: 1 }}>{d.descripcion}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={MOTIVO_LABEL[d.motivo]} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                        <Chip label={`${d.items} ítem${d.items !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                      <Chip label={meta.label} size="small" icon={meta.icon as any} sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700, fontSize: 10, '& .MuiChip-icon': { color: meta.color } }} />
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fmt(d.valor)}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{d.fecha}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {/* Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0A1628', color: '#fff' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>Nueva Devolución a Proveedor</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Proveedor *" value={proveedor} onChange={e => setProveedor(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <TextField label="Referencia OC *" value={ocRef} onChange={e => setOcRef(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Motivo</InputLabel>
              <Select value={motivo} label="Motivo" onChange={e => setMotivo(e.target.value as MotivoD)} sx={SX_SELECT}>
                {MOTIVOS.map(m => <MenuItem key={m} value={m}>{MOTIVO_LABEL[m]}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Descripción" value={desc} onChange={e => setDesc(e.target.value)} fullWidth multiline rows={2} size="small" sx={SX_INPUT} />
            <TextField label="Valor estimado (COP)" value={valor} onChange={e => setValor(e.target.value)} type="number" fullWidth size="small" sx={SX_INPUT} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrear} disabled={!proveedor.trim() || !ocRef.trim()} sx={{ bgcolor: SCM_COLOR }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
