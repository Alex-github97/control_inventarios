// APS Module - Gestión de Restricciones (Theory of Constraints)
import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Button, Switch, TextField, MenuItem, Select, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Badge, alpha, Stepper, Step, StepLabel, StepContent,
  Divider, IconButton, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Block, Warning, Speed, TrendingDown, Add, Edit, Save, Close,
  CheckCircle, RadioButtonUnchecked, PlayCircle, Inventory,
  FilterList, Search,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR      = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ── Mock data ──────────────────────────────────────────────────────────────

const RESTRICCIONES_MOCK = [
  { id: 1, nombre: 'Capacidad Línea A - Turno Noche',   tipo: 'DURA',   entidad: 'Planta 1 - Línea A',      vmin: 0,   vmax: 80,  impacto: 12.4, activa: true  },
  { id: 2, nombre: 'Stock Mínimo Producto Premium',      tipo: 'DURA',   entidad: 'CEDI Bogotá',             vmin: 500, vmax: 9999, impacto: 8.7,  activa: true  },
  { id: 3, nombre: 'Ventana Recepción Proveedor XYZ',    tipo: 'DURA',   entidad: 'Planta 2 - Recepción',    vmin: 6,   vmax: 14,  impacto: 5.2,  activa: true  },
  { id: 4, nombre: 'Capacidad Máx. Almacén Frío',        tipo: 'DURA',   entidad: 'Almacén Refrigerado B1',  vmin: 0,   vmax: 2000, impacto: 9.1,  activa: false },
  { id: 5, nombre: 'Lead Time Importación',              tipo: 'DURA',   entidad: 'Proveedor Brasil',        vmin: 21,  vmax: 45,  impacto: 14.3, activa: true  },
  { id: 6, nombre: 'Restricción Transporte Nocturno',    tipo: 'DURA',   entidad: 'Ruta Norte',              vmin: 0,   vmax: 0,   impacto: 3.8,  activa: true  },
  { id: 7, nombre: 'Nivel Servicio Mínimo Canal Moderno', tipo: 'BLANDA', entidad: 'Canal Supermercados',    vmin: 95,  vmax: 100, impacto: 6.5,  activa: true  },
  { id: 8, nombre: 'Lote Mínimo Producción SKU-100',     tipo: 'BLANDA', entidad: 'Planta 1 - Empaque',     vmin: 200, vmax: 9999, impacto: 2.1,  activa: true  },
  { id: 9, nombre: 'Presupuesto Semanal Compras',        tipo: 'BLANDA', entidad: 'Departamento Compras',    vmin: 0,   vmax: 150000, impacto: 4.3, activa: false },
  { id: 10, nombre: 'Cota Inventario WIP Línea B',       tipo: 'BLANDA', entidad: 'Planta 2 - Línea B',     vmin: 0,   vmax: 500, impacto: 3.6,  activa: true  },
]

const TOC_STEPS = [
  {
    paso: 1,
    titulo: 'IDENTIFICAR el cuello de botella',
    descripcion: 'Encontrar la restricción que limita el throughput del sistema.',
    status: 'COMPLETADO',
    cuellos: [
      { recurso: 'Línea A - Turno Noche', utilizacion: 98, perdida_throughput: '$180K/sem', tipo: 'Capacidad' },
      { recurso: 'Proveedor Brasil', utilizacion: 94, perdida_throughput: '$120K/sem', tipo: 'Lead Time' },
      { recurso: 'Almacén Frío B1', utilizacion: 91, perdida_throughput: '$85K/sem', tipo: 'Almacenamiento' },
    ],
  },
  {
    paso: 2,
    titulo: 'EXPLOTAR el cuello de botella',
    descripcion: 'Maximizar el uso de la restricción sin inversión adicional.',
    status: 'ACTIVO',
    acciones: [
      { accion: 'Eliminar paradas no programadas en Línea A', ganancia: '+$25K/sem', responsable: 'Jefe Producción' },
      { accion: 'Priorizar SKUs de mayor margen en horas pico', ganancia: '+$18K/sem', responsable: 'Planificación' },
      { accion: 'Reducir tiempo de alistamiento (SMED)', ganancia: '+$12K/sem', responsable: 'Mejora Continua' },
    ],
  },
  {
    paso: 3,
    titulo: 'SUBORDINAR todo lo demás',
    descripcion: 'Sincronizar el resto del sistema al ritmo del cuello.',
    status: 'PENDIENTE',
    ajustes: [
      { recurso: 'Línea B', ajuste: 'Reducir velocidad 15% para sincronizar', impacto: 'Neutral' },
      { recurso: 'Almacén MP', ajuste: 'Adelantar reposición 2 días', impacto: 'Positivo' },
      { recurso: 'Despachos', ajuste: 'Reprogramar salidas a curva de Línea A', impacto: 'Positivo' },
    ],
  },
  {
    paso: 4,
    titulo: 'ELEVAR el cuello de botella',
    descripcion: 'Invertir en aumentar la capacidad de la restricción.',
    status: 'PENDIENTE',
    inversiones: [
      { inversion: 'Turno adicional Línea A (3 meses)', costo: '$45K', roi: '4.0x en 6 meses' },
      { inversion: 'Compresor adicional Almacén Frío', costo: '$120K', roi: '2.8x en 12 meses' },
      { inversion: 'Contrato spot proveedor local backup', costo: '$15K/mes', roi: '3.5x en 3 meses' },
    ],
  },
  {
    paso: 5,
    titulo: 'VOLVER AL PASO 1',
    descripcion: 'Revisar si la restricción se desplazó. No dejar que la inercia se convierta en la restricción.',
    status: 'PENDIENTE',
    proxima_revision: '2026-07-15',
    nota: 'Al elevar Línea A, el cuello podría desplazarse a Almacén Frío B1 o Proveedor Brasil. Programar sesión de re-evaluación.',
  },
]

interface Parametro {
  id: number; sku: string; descripcion: string; ubicacion: string;
  ss: number; smin: number; smax: number; pr: number;
  ltc: number; ltp: number; ns: number; lote: number;
}

const PARAMETROS_MOCK: Parametro[] = [
  { id: 1, sku: 'SKU-001', descripcion: 'Prod. Premium A',  ubicacion: 'CEDI Bogotá',   ss: 150, smin: 200, smax: 1200, pr: 350, ltc: 7,  ltp: 2, ns: 97, lote: 100 },
  { id: 2, sku: 'SKU-002', descripcion: 'Prod. Estándar B', ubicacion: 'CEDI Bogotá',   ss: 300, smin: 400, smax: 2500, pr: 700, ltc: 14, ltp: 1, ns: 95, lote: 200 },
  { id: 3, sku: 'SKU-003', descripcion: 'Insumo Crítico C', ubicacion: 'Planta 1',      ss: 80,  smin: 100, smax: 600,  pr: 200, ltc: 21, ltp: 3, ns: 99, lote: 50  },
  { id: 4, sku: 'SKU-004', descripcion: 'Materia Prima D',  ubicacion: 'Planta 2',      ss: 500, smin: 600, smax: 3000, pr: 1000,ltc: 30, ltp: 0, ns: 98, lote: 500 },
  { id: 5, sku: 'SKU-005', descripcion: 'Refrig. Especial', ubicacion: 'Alm. Frío B1',  ss: 40,  smin: 50,  smax: 400,  pr: 90,  ltc: 5,  ltp: 4, ns: 99, lote: 20  },
  { id: 6, sku: 'SKU-006', descripcion: 'Prod. Económico F',ubicacion: 'CEDI Medellín', ss: 200, smin: 250, smax: 1800, pr: 450, ltc: 10, ltp: 1, ns: 94, lote: 150 },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{ background: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.25)}` }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
        </Box>
        <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
      </CardContent>
    </Card>
  )
}

function StepStatus({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    COMPLETADO: { color: '#059669', label: 'COMPLETADO' },
    ACTIVO:     { color: '#7C3AED', label: 'ACTIVO' },
    PENDIENTE:  { color: '#6B7280', label: 'PENDIENTE' },
  }
  const cfg = map[status] ?? map['PENDIENTE']
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ background: alpha(cfg.color, 0.15), color: cfg.color, fontWeight: 700, fontSize: '0.7rem' }}
    />
  )
}

function TabRestriccciones({ restricciones, setRestricciones }: {
  restricciones: typeof RESTRICCIONES_MOCK
  setRestricciones: React.Dispatch<React.SetStateAction<typeof RESTRICCIONES_MOCK>>
}) {
  const [filterTipo, setFilterTipo] = useState<'TODAS' | 'DURA' | 'BLANDA'>('TODAS')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newRestr, setNewRestr] = useState({ nombre: '', tipo: 'DURA', entidad: '', vmin: '', vmax: '', impacto: '' })

  const filtered = restricciones.filter(r => filterTipo === 'TODAS' || r.tipo === filterTipo)
  const duras  = restricciones.filter(r => r.tipo === 'DURA').length
  const blandas = restricciones.filter(r => r.tipo === 'BLANDA').length

  const handleToggle = (id: number) => {
    setRestricciones(prev => prev.map(r => r.id === id ? { ...r, activa: !r.activa } : r))
  }

  const handleSave = () => {
    const nuevo = {
      id: Date.now(),
      nombre: newRestr.nombre,
      tipo: newRestr.tipo as 'DURA' | 'BLANDA',
      entidad: newRestr.entidad,
      vmin: Number(newRestr.vmin),
      vmax: Number(newRestr.vmax),
      impacto: Number(newRestr.impacto),
      activa: true,
    }
    setRestricciones(prev => [...prev, nuevo])
    setDialogOpen(false)
    setNewRestr({ nombre: '', tipo: 'DURA', entidad: '', vmin: '', vmax: '', impacto: '' })
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(['TODAS', 'DURA', 'BLANDA'] as const).map(t => (
            <Button
              key={t}
              size="small"
              variant={filterTipo === t ? 'contained' : 'outlined'}
              onClick={() => setFilterTipo(t)}
              sx={filterTipo === t ? { background: APS_COLOR, '&:hover': { background: APS_COLOR_DARK } } : { borderColor: alpha(APS_COLOR, 0.4), color: APS_COLOR }}
            >
              {t === 'TODAS' ? 'Todas' : t === 'DURA' ? (
                <Badge badgeContent={duras} color="error">Duras&nbsp;&nbsp;</Badge>
              ) : (
                <Badge badgeContent={blandas} color="warning">Blandas&nbsp;&nbsp;</Badge>
              )}
            </Button>
          ))}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
          sx={{ background: APS_COLOR, '&:hover': { background: APS_COLOR_DARK } }}
        >
          Nueva Restricción
        </Button>
      </Box>

      {/* Table */}
      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: alpha(APS_COLOR, 0.06) }}>
              {['Nombre', 'Tipo', 'Entidad Afectada', 'Val. Mín', 'Val. Máx', 'Impacto (%)', 'Activa'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id} hover sx={{ '&:hover': { background: alpha(APS_COLOR, 0.03) } }}>
                <TableCell sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{r.nombre}</TableCell>
                <TableCell>
                  <Chip
                    label={r.tipo}
                    size="small"
                    sx={{
                      background: r.tipo === 'DURA' ? alpha('#DC2626', 0.12) : alpha('#D97706', 0.12),
                      color: r.tipo === 'DURA' ? '#DC2626' : '#D97706',
                      fontWeight: 700, fontSize: '0.7rem',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{r.entidad}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem' }}>{r.vmin}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem' }}>{r.vmax}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: `${Math.min(r.impacto * 5, 70)}px`, height: 6, borderRadius: 3,
                      background: r.impacto > 10 ? '#DC2626' : r.impacto > 6 ? '#D97706' : '#059669',
                    }} />
                    <Typography variant="caption" fontWeight={600}>{r.impacto}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={r.activa}
                    onChange={() => handleToggle(r.id)}
                    size="small"
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: APS_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: APS_COLOR } }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700} color={APS_COLOR}>Nueva Restricción</Typography>
          <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nombre de la Restricción" value={newRestr.nombre} onChange={e => setNewRestr(p => ({ ...p, nombre: e.target.value }))} fullWidth size="small" />
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={newRestr.tipo} onChange={e => setNewRestr(p => ({ ...p, tipo: e.target.value }))}>
                <MenuItem value="DURA">DURA</MenuItem>
                <MenuItem value="BLANDA">BLANDA</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Entidad Afectada" value={newRestr.entidad} onChange={e => setNewRestr(p => ({ ...p, entidad: e.target.value }))} fullWidth size="small" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Valor Mínimo" value={newRestr.vmin} onChange={e => setNewRestr(p => ({ ...p, vmin: e.target.value }))} type="number" size="small" fullWidth />
              <TextField label="Valor Máximo" value={newRestr.vmax} onChange={e => setNewRestr(p => ({ ...p, vmax: e.target.value }))} type="number" size="small" fullWidth />
            </Box>
            <TextField label="Impacto Throughput (%)" value={newRestr.impacto} onChange={e => setNewRestr(p => ({ ...p, impacto: e.target.value }))} type="number" size="small" fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" size="small">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" size="small" disabled={!newRestr.nombre || !newRestr.entidad}
            sx={{ background: APS_COLOR, '&:hover': { background: APS_COLOR_DARK } }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function TabTOC() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <Box>
      <Stepper orientation="vertical" activeStep={activeStep} nonLinear>
        {TOC_STEPS.map((step, idx) => (
          <Step key={step.paso} completed={step.status === 'COMPLETADO'} onClick={() => setActiveStep(idx)} sx={{ cursor: 'pointer' }}>
            <StepLabel
              StepIconProps={{
                sx: {
                  color: step.status === 'COMPLETADO' ? '#059669' : step.status === 'ACTIVO' ? APS_COLOR : '#6B7280',
                  '&.Mui-completed': { color: '#059669' },
                  '&.Mui-active': { color: APS_COLOR },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography fontWeight={700} sx={{ color: step.status === 'ACTIVO' ? APS_COLOR : 'text.primary' }}>
                  Paso {step.paso}: {step.titulo}
                </Typography>
                <StepStatus status={step.status} />
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{step.descripcion}</Typography>

              {step.paso === 1 && step.cuellos && (
                <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 1 }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ background: alpha('#059669', 0.06) }}>
                      {['Recurso / Restricción', 'Utilización', 'Pérdida Throughput', 'Tipo'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.73rem', color: '#059669' }}>{h}</TableCell>
                      ))}
                    </TableRow></TableHead>
                    <TableBody>
                      {step.cuellos.map((c, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontWeight: i === 0 ? 700 : 400, fontSize: '0.78rem' }}>{i === 0 && '🔴 '}{c.recurso}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: `${c.utilizacion * 0.8}px`, height: 6, borderRadius: 3, background: c.utilizacion > 90 ? '#DC2626' : '#D97706' }} />
                              <Typography variant="caption" fontWeight={700}>{c.utilizacion}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#DC2626', fontSize: '0.78rem' }}>{c.perdida_throughput}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem' }}>{c.tipo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {step.paso === 2 && step.acciones && (
                <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 1 }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ background: alpha(APS_COLOR, 0.06) }}>
                      {['Acción Inmediata (sin inversión)', 'Ganancia Est.', 'Responsable'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.73rem', color: APS_COLOR }}>{h}</TableCell>
                      ))}
                    </TableRow></TableHead>
                    <TableBody>
                      {step.acciones.map((a, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontSize: '0.78rem' }}>{a.accion}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#059669', fontSize: '0.78rem' }}>{a.ganancia}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{a.responsable}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {step.paso === 3 && step.ajustes && (
                <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 1 }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ background: alpha('#6B7280', 0.06) }}>
                      {['Recurso', 'Ajuste Requerido', 'Impacto'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.73rem' }}>{h}</TableCell>
                      ))}
                    </TableRow></TableHead>
                    <TableBody>
                      {step.ajustes.map((a, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{a.recurso}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem' }}>{a.ajuste}</TableCell>
                          <TableCell>
                            <Chip label={a.impacto} size="small" sx={{ background: alpha(a.impacto === 'Positivo' ? '#059669' : '#6B7280', 0.12), color: a.impacto === 'Positivo' ? '#059669' : '#6B7280', fontWeight: 600, fontSize: '0.7rem' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {step.paso === 4 && step.inversiones && (
                <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 1 }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ background: alpha('#D97706', 0.06) }}>
                      {['Inversión Recomendada', 'Costo Est.', 'ROI Estimado'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.73rem', color: '#D97706' }}>{h}</TableCell>
                      ))}
                    </TableRow></TableHead>
                    <TableBody>
                      {step.inversiones.map((inv, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontSize: '0.78rem' }}>{inv.inversion}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#D97706', fontSize: '0.78rem' }}>{inv.costo}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#059669', fontSize: '0.78rem' }}>{inv.roi}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {step.paso === 5 && (
                <Paper variant="outlined" sx={{ p: 2, background: alpha(APS_COLOR, 0.04), mb: 1 }}>
                  <Typography variant="body2" fontWeight={600} color={APS_COLOR} gutterBottom>
                    Próxima revisión: {step.proxima_revision}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{step.nota}</Typography>
                  <Button variant="outlined" size="small" sx={{ mt: 1.5, borderColor: APS_COLOR, color: APS_COLOR }}
                    startIcon={<PlayCircle />}>
                    Programar Sesión de Revisión
                  </Button>
                </Paper>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  )
}

function TabParametros() {
  const [parametros, setParametros] = useState<Parametro[]>(PARAMETROS_MOCK)
  const [editId, setEditId] = useState<number | null>(null)
  const [editBuffer, setEditBuffer] = useState<Partial<Parametro>>({})

  const startEdit = (p: Parametro) => {
    setEditId(p.id)
    setEditBuffer({ ...p })
  }

  const saveEdit = () => {
    setParametros(prev => prev.map(p => p.id === editId ? { ...p, ...editBuffer } : p))
    setEditId(null)
  }

  const headers = [
    { key: 'sku', label: 'SKU' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'ss', label: 'Stock Seg.' },
    { key: 'smin', label: 'Stock Mín' },
    { key: 'smax', label: 'Stock Máx' },
    { key: 'pr', label: 'Pto. Reorden' },
    { key: 'ltc', label: 'LT Compra (d)' },
    { key: 'ltp', label: 'LT Prod. (d)' },
    { key: 'ns', label: 'Nv. Serv. (%)' },
    { key: 'lote', label: 'Lote Mín' },
  ]

  return (
    <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}`, overflow: 'auto' }}>
      <Table size="small" sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow sx={{ background: alpha(APS_COLOR, 0.06) }}>
            {headers.map(h => (
              <TableCell key={h.key} sx={{ fontWeight: 700, fontSize: '0.73rem', color: APS_COLOR, whiteSpace: 'nowrap' }}>{h.label}</TableCell>
            ))}
            <TableCell sx={{ fontWeight: 700, fontSize: '0.73rem', color: APS_COLOR }}>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {parametros.map(p => {
            const isEditing = editId === p.id
            return (
              <TableRow key={p.id} hover sx={{ '&:hover': { background: alpha(APS_COLOR, 0.03) } }}>
                {(['sku', 'descripcion', 'ubicacion'] as (keyof Parametro)[]).map(k => (
                  <TableCell key={String(k)} sx={{ fontSize: '0.78rem', fontWeight: k === 'sku' ? 700 : 400 }}>{String(p[k])}</TableCell>
                ))}
                {(['ss', 'smin', 'smax', 'pr', 'ltc', 'ltp', 'ns', 'lote'] as (keyof Parametro)[]).map(k => (
                  <TableCell key={String(k)}>
                    {isEditing ? (
                      <TextField
                        value={editBuffer[k] ?? ''}
                        onChange={e => setEditBuffer(prev => ({ ...prev, [k]: Number(e.target.value) }))}
                        type="number"
                        size="small"
                        sx={{ width: 70 }}
                        inputProps={{ style: { fontSize: '0.75rem', padding: '4px 6px' } }}
                      />
                    ) : (
                      <Typography variant="caption" fontWeight={500}>{String(p[k])}</Typography>
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {isEditing ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Guardar"><IconButton size="small" onClick={saveEdit} sx={{ color: '#059669' }}><Save fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Cancelar"><IconButton size="small" onClick={() => setEditId(null)} sx={{ color: '#DC2626' }}><Close fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  ) : (
                    <Tooltip title="Editar"><IconButton size="small" onClick={() => startEdit(p)} sx={{ color: APS_COLOR }}><Edit fontSize="small" /></IconButton></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Paper>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function APSRestricciones() {
  const [tab, setTab] = useState(0)
  const [restricciones, setRestricciones] = useState(RESTRICCIONES_MOCK)

  const kpis = [
    { label: 'Total Restricciones',         value: String(restricciones.length), icon: <Block />,       color: APS_COLOR },
    { label: 'Restricciones Duras',          value: String(restricciones.filter(r => r.tipo === 'DURA').length), icon: <Warning />, color: '#DC2626' },
    { label: 'Cuellos de Botella Activos',   value: '2',         icon: <Speed />,        color: '#D97706' },
    { label: 'Impacto Throughput',           value: '$450K/sem', icon: <TrendingDown />, color: '#059669' },
  ]

  return (
    <Layout title="Restricciones APS - TOC">
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Block sx={{ color: APS_COLOR, fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800} color={APS_COLOR}>
              Gestión de Restricciones
            </Typography>
            <Chip label="APS · TOC" size="small" sx={{ background: alpha(APS_COLOR, 0.12), color: APS_COLOR, fontWeight: 700 }} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Theory of Constraints — identificación, explotación y elevación de cuellos de botella
          </Typography>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard {...k} />
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.2)}`, borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: `1px solid ${alpha(APS_COLOR, 0.15)}`,
              '& .MuiTab-root': { fontWeight: 600, fontSize: '0.82rem' },
              '& .Mui-selected': { color: APS_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: APS_COLOR },
            }}
          >
            <Tab label="Restricciones" />
            <Tab label="TOC - 5 Pasos" />
            <Tab label="Parámetros" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tab === 0 && <TabRestriccciones restricciones={restricciones} setRestricciones={setRestricciones} />}
            {tab === 1 && <TabTOC />}
            {tab === 2 && <TabParametros />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
