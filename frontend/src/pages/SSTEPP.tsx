import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { SafetyDivider, Add, CheckCircle, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const BORDER = 'rgba(197,48,48,0.2)'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SEL = { '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }

type TipoEPP = 'CABEZA' | 'OJOS_CARA' | 'AUDITIVO' | 'RESPIRATORIO' | 'MANOS' | 'PIES' | 'CUERPO' | 'CAIDAS'

const EPP_LABEL: Record<TipoEPP, string> = {
  CABEZA: 'Cabeza (Casco)', OJOS_CARA: 'Ojos y cara', AUDITIVO: 'Auditivo',
  RESPIRATORIO: 'Respiratorio', MANOS: 'Manos (Guantes)', PIES: 'Pies (Botas)',
  CUERPO: 'Cuerpo (Overol)', CAIDAS: 'Protección caídas',
}

const EPP_ICON: Record<TipoEPP, string> = {
  CABEZA: '⛑️', OJOS_CARA: '🥽', AUDITIVO: '🎧', RESPIRATORIO: '😷',
  MANOS: '🧤', PIES: '👢', CUERPO: '🦺', CAIDAS: '🪝',
}

const TIPOS_EPP: TipoEPP[] = ['CABEZA','OJOS_CARA','AUDITIVO','RESPIRATORIO','MANOS','PIES','CUERPO','CAIDAS']

interface EntregaEPP {
  id: number; numero: string; trabajador: string; cargo: string; area: string
  tipo_epp: TipoEPP; descripcion_epp: string; cantidad: number
  fecha_entrega: string; fecha_vencimiento?: string; firma_recibido: boolean; devuelto: boolean
}

const ENTREGAS: EntregaEPP[] = [
  { id: 1, numero: 'EPP-2026-00018', trabajador: 'Pedro Gómez',   cargo: 'Operario Bodega',   area: 'Bodega',    tipo_epp: 'CUERPO',       descripcion_epp: 'Chaleco reflectivo talla L',     cantidad: 2, fecha_entrega: '2026-06-10', fecha_vencimiento: '2027-06-10', firma_recibido: true,  devuelto: false },
  { id: 2, numero: 'EPP-2026-00017', trabajador: 'Laura Díaz',    cargo: 'Técnico Mant.',     area: 'Taller',    tipo_epp: 'OJOS_CARA',    descripcion_epp: 'Gafas de seguridad ANSI Z87',  cantidad: 1, fecha_entrega: '2026-06-08', fecha_vencimiento: '2027-06-08', firma_recibido: true,  devuelto: false },
  { id: 3, numero: 'EPP-2026-00016', trabajador: 'Jorge Rueda',   cargo: 'Conductor',         area: 'Transporte',tipo_epp: 'CABEZA',       descripcion_epp: 'Casco HDPE tipo II',            cantidad: 1, fecha_entrega: '2026-05-30', firma_recibido: true,  devuelto: false },
  { id: 4, numero: 'EPP-2026-00015', trabajador: 'Sandra López',  cargo: 'Aux. Producción',   area: 'Planta',    tipo_epp: 'RESPIRATORIO', descripcion_epp: 'Respirador N95 — 10 und',       cantidad: 10, fecha_entrega: '2026-05-25', fecha_vencimiento: '2026-11-25', firma_recibido: true,  devuelto: false },
  { id: 5, numero: 'EPP-2026-00014', trabajador: 'Carlos Mora',   cargo: 'Soldador',          area: 'Taller',    tipo_epp: 'OJOS_CARA',   descripcion_epp: 'Careta para soldar autoscure', cantidad: 1, fecha_entrega: '2026-05-10', fecha_vencimiento: '2028-05-10', firma_recibido: false, devuelto: false },
]

export default function SSTEPP() {
  const [items, setItems]     = useState<EntregaEPP[]>(ENTREGAS)
  const [open, setOpen]       = useState(false)
  const [filtroT, setFiltroT] = useState<TipoEPP | ''>('')
  const [trabajador, setTrabajador] = useState('')
  const [cargo, setCargo]     = useState('')
  const [area, setArea]       = useState('')
  const [tipo, setTipo]       = useState<TipoEPP>('CUERPO')
  const [descEpp, setDescEpp] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [fechaEnt, setFechaEnt] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')

  const visibles = filtroT ? items.filter(i => i.tipo_epp === filtroT) : items

  const proxVencer = items.filter(i => {
    if (!i.fecha_vencimiento || i.devuelto) return false
    const dias = (new Date(i.fecha_vencimiento).getTime() - Date.now()) / (1000 * 86400)
    return dias <= 90
  }).length

  const kpis = [
    { label: 'Entregas activas',  value: items.filter(i => !i.devuelto).length, color: SST_COLOR },
    { label: 'Sin firma',         value: items.filter(i => !i.firma_recibido).length, color: '#ef4444' },
    { label: 'Próx. a vencer',    value: proxVencer, color: '#f59e0b' },
    { label: 'Devueltas',         value: items.filter(i => i.devuelto).length, color: '#64748b' },
  ]

  function handleCrear() {
    if (!trabajador || !fechaEnt) return
    const nuevo: EntregaEPP = {
      id: items.length + 1,
      numero: `EPP-2026-${String(items.length + 19).padStart(5, '0')}`,
      trabajador, cargo, area, tipo_epp: tipo, descripcion_epp: descEpp,
      cantidad: Number(cantidad) || 1, fecha_entrega: fechaEnt,
      fecha_vencimiento: fechaVenc || undefined, firma_recibido: false, devuelto: false,
    }
    setItems(prev => [nuevo, ...prev])
    setOpen(false)
    setTrabajador(''); setCargo(''); setArea(''); setDescEpp(''); setCantidad('1')
    setFechaEnt(''); setFechaVenc(''); setTipo('CUERPO')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SafetyDivider sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Gestión de EPP</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Elementos de Protección Personal — entrega, trazabilidad y vencimientos</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SST_COLOR }}>Registrar Entrega</Button>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filtros por tipo */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label="Todos" onClick={() => setFiltroT('')}
            sx={{ bgcolor: filtroT === '' ? alpha(SST_COLOR, 0.2) : '#F9FAFB', color: filtroT === '' ? '#F87171' : 'text.secondary', cursor: 'pointer', fontSize: 11 }} />
          {TIPOS_EPP.map(t => (
            <Chip key={t} label={`${EPP_ICON[t]} ${EPP_LABEL[t]}`} onClick={() => setFiltroT(prev => prev === t ? '' : t)}
              sx={{ bgcolor: filtroT === t ? alpha(SST_COLOR, 0.2) : '#F9FAFB', color: filtroT === t ? '#F87171' : 'text.secondary', cursor: 'pointer', fontSize: 11 }} />
          ))}
        </Box>

        {/* Lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibles.map(e => {
            const venceProx = e.fecha_vencimiento && !e.devuelto &&
              (new Date(e.fecha_vencimiento).getTime() - Date.now()) / (1000 * 86400) <= 90
            return (
              <Card key={e.id} sx={{ border: `1px solid ${venceProx ? alpha('#f59e0b', 0.3) : BORDER}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ fontSize: 24 }}>{EPP_ICON[e.tipo_epp]}</Box>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#F87171' }}>{e.numero}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{e.trabajador}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{e.cargo} · {e.area}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{e.descripcion_epp} × {e.cantidad}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                      {e.firma_recibido
                        ? <Chip icon={<CheckCircle sx={{ fontSize: 13 }} />} label="Firmado" size="small" sx={{ bgcolor: alpha('#22c55e', 0.12), color: '#22c55e', fontSize: 10 }} />
                        : <Chip icon={<Warning sx={{ fontSize: 13 }} />} label="Sin firma" size="small" sx={{ bgcolor: alpha('#ef4444', 0.12), color: '#ef4444', fontSize: 10 }} />
                      }
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Entrega: {e.fecha_entrega}</Typography>
                      {e.fecha_vencimiento && <Typography sx={{ fontSize: 11, color: venceProx ? '#fbbf24' : 'text.disabled' }}>Vence: {e.fecha_vencimiento}</Typography>}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {/* Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Registrar Entrega de EPP</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Trabajador *" value={trabajador} onChange={e => setTrabajador(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Cargo" value={cargo} onChange={e => setCargo(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
              <TextField label="Área" value={area} onChange={e => setArea(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de EPP *</InputLabel>
              <Select value={tipo} label="Tipo de EPP *" onChange={e => setTipo(e.target.value as TipoEPP)} sx={SX_SEL}>
                {TIPOS_EPP.map(t => <MenuItem key={t} value={t}>{EPP_ICON[t]} {EPP_LABEL[t]}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Descripción del EPP" value={descEpp} onChange={e => setDescEpp(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Cantidad" value={cantidad} onChange={e => setCantidad(e.target.value)} type="number" fullWidth size="small" sx={SX_INPUT} />
              <TextField label="Fecha entrega *" type="date" value={fechaEnt} onChange={e => setFechaEnt(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
              <TextField label="Fecha vencimiento" type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #F1F5F9' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrear} disabled={!trabajador || !fechaEnt} sx={{ bgcolor: SST_COLOR }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
