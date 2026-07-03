import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { Folder, Add, Download, CheckCircle, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const #E5E7EB  = 'rgba(197,48,48,0.2)'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SEL = { '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }

type TipoDoc = 'POLITICA' | 'PROCEDIMIENTO' | 'INSTRUCTIVO' | 'FORMATO' | 'PLAN' | 'PROGRAMA' | 'REGLAMENTO' | 'OTRO'

const TIPO_LABEL: Record<TipoDoc, string> = {
  POLITICA: 'Política', PROCEDIMIENTO: 'Procedimiento', INSTRUCTIVO: 'Instructivo',
  FORMATO: 'Formato', PLAN: 'Plan', PROGRAMA: 'Programa', REGLAMENTO: 'Reglamento', OTRO: 'Otro',
}

const TIPO_COLOR: Record<TipoDoc, string> = {
  POLITICA: '#ef4444', PROCEDIMIENTO: '#3b82f6', INSTRUCTIVO: '#8b5cf6',
  FORMATO: '#22c55e', PLAN: '#f59e0b', PROGRAMA: '#0891b2', REGLAMENTO: '#dc2626', OTRO: '#64748b',
}

const TIPOS: TipoDoc[] = ['POLITICA','PROCEDIMIENTO','INSTRUCTIVO','FORMATO','PLAN','PROGRAMA','REGLAMENTO','OTRO']

interface DocSST {
  id: number; codigo: string; nombre: string; tipo: TipoDoc; version: string
  responsable: string; fecha_aprobacion: string; fecha_revision: string
  vigente: boolean; descripcion: string
}

const DOCUMENTOS: DocSST[] = [
  { id: 1, codigo: 'POL-SST-001', nombre: 'Política de Seguridad y Salud en el Trabajo',            tipo: 'POLITICA',      version: '3.0', responsable: 'Gerencia',       fecha_aprobacion: '2026-01-15', fecha_revision: '2027-01-15', vigente: true,  descripcion: 'Política general SG-SST alineada con Decreto 1072/2015' },
  { id: 2, codigo: 'PRO-SST-001', nombre: 'Procedimiento de reporte e investigación de incidentes', tipo: 'PROCEDIMIENTO', version: '2.1', responsable: 'Coord. SST',    fecha_aprobacion: '2025-11-10', fecha_revision: '2026-11-10', vigente: true,  descripcion: 'Establece pasos para reportar, investigar y cerrar eventos' },
  { id: 3, codigo: 'PRO-SST-002', nombre: 'Procedimiento de inspecciones de seguridad',             tipo: 'PROCEDIMIENTO', version: '1.3', responsable: 'Coord. SST',    fecha_aprobacion: '2025-08-20', fecha_revision: '2026-08-20', vigente: true,  descripcion: 'Define frecuencia, alcance y registro de inspecciones' },
  { id: 4, codigo: 'PLA-SST-001', nombre: 'Plan anual de capacitación SST 2026',                    tipo: 'PLAN',          version: '1.0', responsable: 'RRHH + SST',    fecha_aprobacion: '2025-12-01', fecha_revision: '2026-12-01', vigente: true,  descripcion: 'Cronograma y temarios del programa de formación anual' },
  { id: 5, codigo: 'PLA-EME-001', nombre: 'Plan de preparación y respuesta ante emergencias',       tipo: 'PLAN',          version: '2.2', responsable: 'Coord. SST',    fecha_aprobacion: '2025-09-05', fecha_revision: '2026-09-05', vigente: true,  descripcion: 'Plan de emergencias corporativo conforme Resolución 0312' },
  { id: 6, codigo: 'FOR-SST-001', nombre: 'Formato entrega de EPP (GHD-F-001)',                     tipo: 'FORMATO',       version: '1.1', responsable: 'Coord. SST',    fecha_aprobacion: '2025-06-10', fecha_revision: '2026-06-10', vigente: true,  descripcion: 'Acta de entrega y recibido de elementos de protección' },
  { id: 7, codigo: 'REG-COI-001', nombre: 'Reglamento de higiene y seguridad industrial',           tipo: 'REGLAMENTO',    version: '4.0', responsable: 'Gerencia',       fecha_aprobacion: '2024-03-01', fecha_revision: '2026-03-01', vigente: false, descripcion: 'Pendiente actualización — venció ciclo revisión bienal' },
]

export default function SSTDocumentos() {
  const [items, setItems]   = useState<DocSST[]>(DOCUMENTOS)
  const [open, setOpen]     = useState(false)
  const [filtroT, setFiltroT] = useState<TipoDoc | ''>('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo]     = useState<TipoDoc>('PROCEDIMIENTO')
  const [version, setVersion] = useState('1.0')
  const [resp, setResp]     = useState('')
  const [fApro, setFApro]   = useState('')
  const [fRev, setFRev]     = useState('')
  const [desc, setDesc]     = useState('')

  const visibles = filtroT ? items.filter(d => d.tipo === filtroT) : items
  const vencidos = items.filter(d => !d.vigente).length

  const conteoTipo: Partial<Record<TipoDoc, number>> = {}
  items.forEach(d => { conteoTipo[d.tipo] = (conteoTipo[d.tipo] ?? 0) + 1 })

  const kpis = [
    { label: 'Total documentos', value: items.length,                              color: SST_COLOR },
    { label: 'Vigentes',         value: items.filter(d => d.vigente).length,        color: '#22c55e' },
    { label: 'Para actualizar',  value: vencidos,                                  color: '#f59e0b' },
    { label: 'Tipos distintos',  value: Object.keys(conteoTipo).length,            color: '#3b82f6' },
  ]

  function handleCrear() {
    if (!nombre || !fApro) return
    const nuevo: DocSST = {
      id: items.length + 1,
      codigo: `${tipo.slice(0,3)}-SST-${String(items.length + 1).padStart(3, '0')}`,
      nombre, tipo, version, responsable: resp, fecha_aprobacion: fApro,
      fecha_revision: fRev, vigente: true, descripcion: desc,
    }
    setItems(prev => [nuevo, ...prev])
    setOpen(false)
    setNombre(''); setVersion('1.0'); setResp(''); setFApro(''); setFRev(''); setDesc('')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Folder sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Documentos SG-SST</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Políticas, procedimientos, planes y formatos del sistema de gestión</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: SST_COLOR }}>Agregar Documento</Button>
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

        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label="Todos" onClick={() => setFiltroT('')}
            sx={{ bgcolor: filtroT === '' ? alpha(SST_COLOR, 0.2) : '#F9FAFB', color: filtroT === '' ? '#F87171' : 'text.secondary', cursor: 'pointer', fontSize: 11 }} />
          {TIPOS.filter(t => conteoTipo[t]).map(t => (
            <Chip key={t} label={`${TIPO_LABEL[t]} (${conteoTipo[t]})`}
              onClick={() => setFiltroT(prev => prev === t ? '' : t)}
              sx={{ bgcolor: filtroT === t ? alpha(TIPO_COLOR[t], 0.2) : '#F9FAFB', color: filtroT === t ? TIPO_COLOR[t] : 'text.secondary', cursor: 'pointer', fontSize: 11 }} />
          ))}
        </Box>

        {/* Lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibles.map(d => (
            <Card key={d.id} sx={{ border: `1px solid ${d.vigente ? #E5E7EB : alpha('#f59e0b', 0.3)}`, borderRadius: 2 }}>
              <CardContent sx={{ p: '14px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: TIPO_COLOR[d.tipo] }}>{d.codigo}</Typography>
                      <Chip label={TIPO_LABEL[d.tipo]} size="small" sx={{ bgcolor: alpha(TIPO_COLOR[d.tipo], 0.12), color: TIPO_COLOR[d.tipo], fontSize: 9 }} />
                      <Chip label={`v${d.version}`} size="small" sx={{ bgcolor: '#F9FAFB', color: 'text.secondary', fontSize: 9 }} />
                    </Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{d.nombre}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{d.descripcion}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                    {d.vigente
                      ? <Chip icon={<CheckCircle sx={{ fontSize: 13 }} />} label="Vigente" size="small" sx={{ bgcolor: alpha('#22c55e', 0.12), color: '#22c55e', fontSize: 10 }} />
                      : <Chip icon={<Warning sx={{ fontSize: 13 }} />} label="Requiere actualización" size="small" sx={{ bgcolor: alpha('#f59e0b', 0.12), color: '#fbbf24', fontSize: 10 }} />
                    }
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Aprobado: {d.fecha_aprobacion}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Revisión: {d.fecha_revision}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Resp.: {d.responsable}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>Agregar Documento SG-SST</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Nombre del documento *" value={nombre} onChange={e => setNombre(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo *</InputLabel>
                <Select value={tipo} label="Tipo *" onChange={e => setTipo(e.target.value as TipoDoc)} sx={SX_SEL}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{TIPO_LABEL[t]}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Versión" value={version} onChange={e => setVersion(e.target.value)} size="small" sx={{ ...SX_INPUT, width: 120 }} />
            </Box>
            <TextField label="Responsable / aprobador" value={resp} onChange={e => setResp(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Fecha aprobación *" type="date" value={fApro} onChange={e => setFApro(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
              <TextField label="Próxima revisión" type="date" value={fRev} onChange={e => setFRev(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
            </Box>
            <TextField label="Descripción / alcance" value={desc} onChange={e => setDesc(e.target.value)} fullWidth multiline rows={2} size="small" sx={SX_INPUT} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #F1F5F9' }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCrear} disabled={!nombre || !fApro} sx={{ bgcolor: SST_COLOR }}>Agregar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
