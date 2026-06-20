import React, { useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Paper,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  alpha,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  DirectionsBus,
  Person,
  LocalShipping,
  CheckCircle,
  WarningAmber,
  Schedule,
  FmdGood,
  Inventory,
  Add,
  AssignmentTurnedIn,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const TMS_COLOR = '#0369A1'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrdenPendiente {
  id: number
  numeroOrden: string
  cliente: string
  origen: string
  destino: string
  pesoKg: number
  volumenM3: number
  fechaRequerida: string
  tipoServicio: string
  urgencia: 'HOY' | 'MANANA' | 'ESTA_SEMANA'
  valorEstimado: number
}

interface VehiculoDisponible {
  id: number
  placa: string
  tipo: string
  capacidadKg: number
  capacidadM3: number
  capacidadDisponibleKg: number
  capacidadDisponibleM3: number
  ubicacion: string
}

interface ConductorDisponible {
  id: number
  nombre: string
  licencia: string
  horasTrabajadas: number
  horasMaxima: number
  estado: 'DISPONIBLE' | 'DESCANSANDO'
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ORDENES: OrdenPendiente[] = [
  { id: 1, numeroOrden: 'OP-2024-0891', cliente: 'Almacenes Éxito S.A.', origen: 'Bogotá', destino: 'Medellín', pesoKg: 8500, volumenM3: 32, fechaRequerida: new Date().toISOString().split('T')[0], tipoServicio: 'FTL', urgencia: 'HOY', valorEstimado: 1900000 },
  { id: 2, numeroOrden: 'OP-2024-0892', cliente: 'Bavaria S.A.S.', origen: 'Bogotá', destino: 'Cali', pesoKg: 12000, volumenM3: 48, fechaRequerida: new Date().toISOString().split('T')[0], tipoServicio: 'FTL', urgencia: 'HOY', valorEstimado: 2200000 },
  { id: 3, numeroOrden: 'OP-2024-0893', cliente: 'Grupo Nutresa', origen: 'Medellín', destino: 'Barranquilla', pesoKg: 3200, volumenM3: 14, fechaRequerida: new Date(Date.now() + 86400000).toISOString().split('T')[0], tipoServicio: 'LTL', urgencia: 'MANANA', valorEstimado: 950000 },
  { id: 4, numeroOrden: 'OP-2024-0894', cliente: 'Cencosud Colombia', origen: 'Bogotá', destino: 'Bucaramanga', pesoKg: 5600, volumenM3: 22, fechaRequerida: new Date(Date.now() + 86400000).toISOString().split('T')[0], tipoServicio: 'FTL', urgencia: 'MANANA', valorEstimado: 1400000 },
  { id: 5, numeroOrden: 'OP-2024-0895', cliente: 'Postobón S.A.', origen: 'Cali', destino: 'Pasto', pesoKg: 7800, volumenM3: 30, fechaRequerida: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], tipoServicio: 'FTL', urgencia: 'ESTA_SEMANA', valorEstimado: 1650000 },
  { id: 6, numeroOrden: 'OP-2024-0896', cliente: 'Colgate-Palmolive', origen: 'Bogotá', destino: 'Pereira', pesoKg: 2400, volumenM3: 9, fechaRequerida: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], tipoServicio: 'LTL', urgencia: 'ESTA_SEMANA', valorEstimado: 620000 },
]

const VEHICULOS: VehiculoDisponible[] = [
  { id: 1, placa: 'VEH-001', tipo: 'Tractocamión', capacidadKg: 28000, capacidadM3: 120, capacidadDisponibleKg: 28000, capacidadDisponibleM3: 120, ubicacion: 'Bodega Bogotá' },
  { id: 2, placa: 'VEH-002', tipo: 'Camión 12 ton', capacidadKg: 12000, capacidadM3: 50, capacidadDisponibleKg: 12000, capacidadDisponibleM3: 50, ubicacion: 'Bodega Bogotá' },
  { id: 3, placa: 'VEH-003', tipo: 'Camión 8 ton', capacidadKg: 8000, capacidadM3: 35, capacidadDisponibleKg: 4500, capacidadDisponibleM3: 18, ubicacion: 'Terminal Medellín' },
  { id: 4, placa: 'VEH-004', tipo: 'Furgón 5 ton', capacidadKg: 5000, capacidadM3: 22, capacidadDisponibleKg: 5000, capacidadDisponibleM3: 22, ubicacion: 'Bodega Cali' },
  { id: 5, placa: 'VEH-005', tipo: 'Tractocamión', capacidadKg: 28000, capacidadM3: 120, capacidadDisponibleKg: 28000, capacidadDisponibleM3: 120, ubicacion: 'Bodega Bogotá' },
]

const CONDUCTORES: ConductorDisponible[] = [
  { id: 1, nombre: 'Carlos Herrera', licencia: 'C1-123456', horasTrabajadas: 2, horasMaxima: 10, estado: 'DISPONIBLE' },
  { id: 2, nombre: 'Luis Pérez', licencia: 'C1-234567', horasTrabajadas: 0, horasMaxima: 10, estado: 'DISPONIBLE' },
  { id: 3, nombre: 'Andrés Torres', licencia: 'CE-345678', horasTrabajadas: 6, horasMaxima: 10, estado: 'DISPONIBLE' },
  { id: 4, nombre: 'Jhon Morales', licencia: 'C1-456789', horasTrabajadas: 9, horasMaxima: 10, estado: 'DESCANSANDO' },
  { id: 5, nombre: 'Mauricio Silva', licencia: 'C2-567890', horasTrabajadas: 0, horasMaxima: 10, estado: 'DISPONIBLE' },
  { id: 6, nombre: 'Felipe Castro', licencia: 'CE-678901', horasTrabajadas: 4, horasMaxima: 10, estado: 'DISPONIBLE' },
  { id: 7, nombre: 'Diego Vargas', licencia: 'C1-789012', horasTrabajadas: 1, horasMaxima: 10, estado: 'DISPONIBLE' },
  { id: 8, nombre: 'Ricardo Leal', licencia: 'C2-890123', horasTrabajadas: 8, horasMaxima: 10, estado: 'DESCANSANDO' },
]

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const urgenciaStyle: Record<string, { label: string; color: string; bg: string }> = {
  HOY: { label: 'HOY', color: '#DC2626', bg: '#FEE2E2' },
  MANANA: { label: 'MAÑANA', color: '#B45309', bg: '#FEF3C7' },
  ESTA_SEMANA: { label: 'ESTA SEMANA', color: '#2563EB', bg: '#DBEAFE' },
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TMSPlaneacion() {
  const [ordenes, setOrdenes] = useState<OrdenPendiente[]>(ORDENES)
  const [tabRecursos, setTabRecursos] = useState(0)
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenPendiente | null>(null)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoDisponible | null>(null)
  const [conductorSeleccionado, setConductorSeleccionado] = useState<ConductorDisponible | null>(null)
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')

  const ordenesFiltradas = ordenes.filter(o => {
    if (filtroUrgencia !== 'TODOS' && o.urgencia !== filtroUrgencia) return false
    if (filtroTipo !== 'TODOS' && o.tipoServicio !== filtroTipo) return false
    return true
  })

  const capacidadInsuficiente = ordenSeleccionada && vehiculoSeleccionado &&
    (vehiculoSeleccionado.capacidadDisponibleKg < ordenSeleccionada.pesoKg || vehiculoSeleccionado.capacidadDisponibleM3 < ordenSeleccionada.volumenM3)

  const conductorSinHoras = conductorSeleccionado && conductorSeleccionado.horasTrabajadas >= conductorSeleccionado.horasMaxima

  const canCrear = ordenSeleccionada && vehiculoSeleccionado && conductorSeleccionado && !capacidadInsuficiente && !conductorSinHoras

  const handleCrearViaje = () => {
    if (!ordenSeleccionada) return
    setOrdenes(p => p.filter(o => o.id !== ordenSeleccionada.id))
    toast.success(`Viaje creado para orden ${ordenSeleccionada.numeroOrden}`)
    setOrdenSeleccionada(null)
    setVehiculoSeleccionado(null)
    setConductorSeleccionado(null)
  }

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800} color={TMS_COLOR}>Planificación de Transporte</Typography>
            <Typography variant="body2" color="text.secondary">{ordenes.length} órdenes pendientes de asignación</Typography>
          </Box>
          <Chip icon={<Schedule />} label={`${ordenes.filter(o => o.urgencia === 'HOY').length} urgentes hoy`} sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
        </Stack>

        <Grid container spacing={2} mb={2}>
          {/* Panel Izquierdo: Órdenes Pendientes */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden', height: '100%' }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F3F4F6' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography fontWeight={700} fontSize={15}>Órdenes Pendientes de Asignación</Typography>
                  <Chip label={`${ordenesFiltradas.length}`} size="small" sx={{ bgcolor: alpha(TMS_COLOR, 0.1), color: TMS_COLOR, fontWeight: 700 }} />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Urgencia</InputLabel>
                    <Select value={filtroUrgencia} label="Urgencia" onChange={e => setFiltroUrgencia(e.target.value)}>
                      <MenuItem value="TODOS">Todas</MenuItem>
                      <MenuItem value="HOY">Hoy</MenuItem>
                      <MenuItem value="MANANA">Mañana</MenuItem>
                      <MenuItem value="ESTA_SEMANA">Esta semana</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>Tipo</InputLabel>
                    <Select value={filtroTipo} label="Tipo" onChange={e => setFiltroTipo(e.target.value)}>
                      <MenuItem value="TODOS">Todos</MenuItem>
                      <MenuItem value="FTL">FTL</MenuItem>
                      <MenuItem value="LTL">LTL</MenuItem>
                      <MenuItem value="EXPRESS">Express</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
              <Stack spacing={0} divider={<Divider />} sx={{ maxHeight: 520, overflowY: 'auto' }}>
                {ordenesFiltradas.map(orden => {
                  const u = urgenciaStyle[orden.urgencia]
                  const isSelected = ordenSeleccionada?.id === orden.id
                  return (
                    <Box
                      key={orden.id}
                      sx={{
                        px: 2, py: 1.5, cursor: 'pointer',
                        bgcolor: isSelected ? alpha(TMS_COLOR, 0.06) : 'transparent',
                        borderLeft: isSelected ? `3px solid ${TMS_COLOR}` : '3px solid transparent',
                        '&:hover': { bgcolor: alpha(TMS_COLOR, 0.04) },
                        transition: 'all 0.15s',
                      }}
                      onClick={() => setOrdenSeleccionada(isSelected ? null : orden)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Typography fontSize={13} fontWeight={700} color={TMS_COLOR}>{orden.numeroOrden}</Typography>
                            <Chip label={u.label} size="small" sx={{ bgcolor: u.bg, color: u.color, fontWeight: 800, fontSize: 10, height: 18 }} />
                            <Chip label={orden.tipoServicio} size="small" sx={{ bgcolor: alpha(TMS_COLOR, 0.08), color: TMS_COLOR, fontWeight: 600, fontSize: 10, height: 18 }} />
                          </Stack>
                          <Typography fontSize={12} fontWeight={600}>{orden.cliente}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
                            <FmdGood sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography fontSize={11} color="text.secondary">{orden.origen} → {orden.destino}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={2} mt={0.5}>
                            <Typography fontSize={11} color="text.secondary"><b>{orden.pesoKg.toLocaleString()}</b> kg</Typography>
                            <Typography fontSize={11} color="text.secondary"><b>{orden.volumenM3}</b> m³</Typography>
                            <Typography fontSize={11} color="text.secondary">Req: <b>{orden.fechaRequerida}</b></Typography>
                          </Stack>
                        </Box>
                        <Box textAlign="right">
                          <Typography fontSize={13} fontWeight={700} color={TMS_COLOR}>{fmt(orden.valorEstimado)}</Typography>
                          {isSelected && <Chip label="Seleccionada" size="small" sx={{ bgcolor: TMS_COLOR, color: '#fff', fontWeight: 700, fontSize: 10, mt: 0.5 }} />}
                        </Box>
                      </Stack>
                    </Box>
                  )
                })}
              </Stack>
            </Paper>
          </Grid>

          {/* Panel Derecho: Recursos Disponibles */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden', height: '100%' }}>
              <Box sx={{ borderBottom: '1px solid #F3F4F6' }}>
                <Tabs value={tabRecursos} onChange={(_, v) => setTabRecursos(v)} sx={{ px: 2 }}>
                  <Tab icon={<DirectionsBus />} iconPosition="start" label={`Vehículos (${VEHICULOS.length})`} sx={{ fontSize: 13 }} />
                  <Tab icon={<Person />} iconPosition="start" label={`Conductores (${CONDUCTORES.length})`} sx={{ fontSize: 13 }} />
                </Tabs>
              </Box>

              {tabRecursos === 0 && (
                <Stack spacing={0} divider={<Divider />} sx={{ maxHeight: 520, overflowY: 'auto' }}>
                  {VEHICULOS.map(v => {
                    const isSelected = vehiculoSeleccionado?.id === v.id
                    const pctKg = Math.round((v.capacidadDisponibleKg / v.capacidadKg) * 100)
                    return (
                      <Box
                        key={v.id}
                        sx={{
                          px: 2, py: 1.5, cursor: 'pointer',
                          bgcolor: isSelected ? alpha(TMS_COLOR, 0.06) : 'transparent',
                          borderLeft: isSelected ? `3px solid ${TMS_COLOR}` : '3px solid transparent',
                          '&:hover': { bgcolor: alpha(TMS_COLOR, 0.04) },
                          transition: 'all 0.15s',
                        }}
                        onClick={() => setVehiculoSeleccionado(isSelected ? null : v)}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                              <DirectionsBus sx={{ fontSize: 16, color: TMS_COLOR }} />
                              <Typography fontSize={13} fontWeight={700}>{v.placa}</Typography>
                              <Chip label={v.tipo} size="small" sx={{ fontSize: 10, bgcolor: '#F3F4F6', color: '#374151' }} />
                            </Stack>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <FmdGood sx={{ fontSize: 11, color: 'text.secondary' }} />
                              <Typography fontSize={11} color="text.secondary">{v.ubicacion}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={2} mt={0.5}>
                              <Typography fontSize={11} color="text.secondary">Disp: <b>{v.capacidadDisponibleKg.toLocaleString()} kg</b></Typography>
                              <Typography fontSize={11} color="text.secondary"><b>{v.capacidadDisponibleM3} m³</b></Typography>
                            </Stack>
                          </Box>
                          <Box textAlign="right">
                            <Typography fontSize={11} color="text.secondary" mb={0.5}>Cap. disponible</Typography>
                            <Box sx={{ width: 70, height: 6, bgcolor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${pctKg}%`, bgcolor: pctKg > 50 ? '#16A34A' : pctKg > 20 ? '#D97706' : '#DC2626', borderRadius: 3 }} />
                            </Box>
                            <Typography fontSize={10} color="text.secondary" mt={0.25}>{pctKg}% libre</Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              )}

              {tabRecursos === 1 && (
                <Stack spacing={0} divider={<Divider />} sx={{ maxHeight: 520, overflowY: 'auto' }}>
                  {CONDUCTORES.map(c => {
                    const isSelected = conductorSeleccionado?.id === c.id
                    const pctHoras = Math.round((c.horasTrabajadas / c.horasMaxima) * 100)
                    return (
                      <Box
                        key={c.id}
                        sx={{
                          px: 2, py: 1.5, cursor: 'pointer',
                          bgcolor: isSelected ? alpha(TMS_COLOR, 0.06) : 'transparent',
                          borderLeft: isSelected ? `3px solid ${TMS_COLOR}` : '3px solid transparent',
                          '&:hover': { bgcolor: alpha(TMS_COLOR, 0.04) },
                          transition: 'all 0.15s',
                        }}
                        onClick={() => setConductorSeleccionado(isSelected ? null : c)}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                              <Person sx={{ fontSize: 16, color: TMS_COLOR }} />
                              <Typography fontSize={13} fontWeight={700}>{c.nombre}</Typography>
                              <Chip
                                label={c.estado === 'DISPONIBLE' ? 'Disponible' : 'Descansando'}
                                size="small"
                                sx={{ fontSize: 10, bgcolor: c.estado === 'DISPONIBLE' ? '#DCFCE7' : '#FEF3C7', color: c.estado === 'DISPONIBLE' ? '#15803D' : '#B45309', fontWeight: 700 }}
                              />
                            </Stack>
                            <Typography fontSize={11} color="text.secondary">Lic. {c.licencia}</Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography fontSize={11} color="text.secondary" mb={0.5}>Horas trabajadas</Typography>
                            <Box sx={{ width: 70, height: 6, bgcolor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${pctHoras}%`, bgcolor: pctHoras < 70 ? '#16A34A' : pctHoras < 90 ? '#D97706' : '#DC2626', borderRadius: 3 }} />
                            </Box>
                            <Typography fontSize={10} color="text.secondary" mt={0.25}>{c.horasTrabajadas}/{c.horasMaxima}h</Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Zona de Planificación */}
        {(ordenSeleccionada || vehiculoSeleccionado || conductorSeleccionado) && (
          <Paper elevation={0} sx={{ border: `2px solid ${TMS_COLOR}`, borderRadius: '14px', p: 3, bgcolor: alpha(TMS_COLOR, 0.02) }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
              <Box>
                <Typography fontWeight={800} fontSize={16} color={TMS_COLOR} mb={2}>
                  <AssignmentTurnedIn sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Nueva Asignación
                </Typography>
                <Grid container spacing={3}>
                  {/* Orden */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography fontSize={11} color="text.secondary" fontWeight={600} mb={0.5}>ORDEN SELECCIONADA</Typography>
                    {ordenSeleccionada ? (
                      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography fontSize={13} fontWeight={700} color={TMS_COLOR}>{ordenSeleccionada.numeroOrden}</Typography>
                          <Typography fontSize={12}>{ordenSeleccionada.cliente}</Typography>
                          <Typography fontSize={11} color="text.secondary">{ordenSeleccionada.origen} → {ordenSeleccionada.destino}</Typography>
                          <Typography fontSize={11} color="text.secondary">{ordenSeleccionada.pesoKg.toLocaleString()} kg • {ordenSeleccionada.volumenM3} m³</Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <Box sx={{ border: '2px dashed #E5E7EB', borderRadius: 2, p: 2, textAlign: 'center' }}>
                        <Typography fontSize={12} color="text.disabled">Selecciona una orden</Typography>
                      </Box>
                    )}
                  </Grid>

                  {/* Vehículo */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography fontSize={11} color="text.secondary" fontWeight={600} mb={0.5}>VEHÍCULO SELECCIONADO</Typography>
                    {vehiculoSeleccionado ? (
                      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography fontSize={13} fontWeight={700} color={TMS_COLOR}>{vehiculoSeleccionado.placa}</Typography>
                          <Typography fontSize={12}>{vehiculoSeleccionado.tipo}</Typography>
                          <Typography fontSize={11} color="text.secondary">Cap: {vehiculoSeleccionado.capacidadDisponibleKg.toLocaleString()} kg disp.</Typography>
                          <Typography fontSize={11} color="text.secondary">{vehiculoSeleccionado.ubicacion}</Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <Box sx={{ border: '2px dashed #E5E7EB', borderRadius: 2, p: 2, textAlign: 'center' }}>
                        <Typography fontSize={12} color="text.disabled">Selecciona un vehículo</Typography>
                      </Box>
                    )}
                  </Grid>

                  {/* Conductor */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography fontSize={11} color="text.secondary" fontWeight={600} mb={0.5}>CONDUCTOR SELECCIONADO</Typography>
                    {conductorSeleccionado ? (
                      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography fontSize={13} fontWeight={700} color={TMS_COLOR}>{conductorSeleccionado.nombre}</Typography>
                          <Typography fontSize={12}>Lic. {conductorSeleccionado.licencia}</Typography>
                          <Typography fontSize={11} color="text.secondary">{conductorSeleccionado.horasTrabajadas}/{conductorSeleccionado.horasMaxima}h trabajadas hoy</Typography>
                          <Chip label={conductorSeleccionado.estado} size="small" sx={{ bgcolor: conductorSeleccionado.estado === 'DISPONIBLE' ? '#DCFCE7' : '#FEF3C7', color: conductorSeleccionado.estado === 'DISPONIBLE' ? '#15803D' : '#B45309', fontWeight: 700, fontSize: 10, mt: 0.5 }} />
                        </CardContent>
                      </Card>
                    ) : (
                      <Box sx={{ border: '2px dashed #E5E7EB', borderRadius: 2, p: 2, textAlign: 'center' }}>
                        <Typography fontSize={12} color="text.disabled">Selecciona un conductor</Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>

              {/* Resumen y botón */}
              <Box sx={{ minWidth: 250 }}>
                {ordenSeleccionada && (
                  <Stack spacing={1} mb={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontSize={12} color="text.secondary">Valor Flete Estimado</Typography>
                      <Typography fontSize={12} fontWeight={700} color={TMS_COLOR}>{fmt(ordenSeleccionada.valorEstimado)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontSize={12} color="text.secondary">Ruta</Typography>
                      <Typography fontSize={12} fontWeight={600}>{ordenSeleccionada.origen} → {ordenSeleccionada.destino}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontSize={12} color="text.secondary">Fecha Requerida</Typography>
                      <Typography fontSize={12} fontWeight={600}>{ordenSeleccionada.fechaRequerida}</Typography>
                    </Stack>
                  </Stack>
                )}

                {capacidadInsuficiente && (
                  <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 1, py: 0.5, fontSize: 12 }}>
                    Vehículo sin capacidad suficiente para esta orden
                  </Alert>
                )}
                {conductorSinHoras && (
                  <Alert severity="error" icon={<WarningAmber />} sx={{ mb: 1, py: 0.5, fontSize: 12 }}>
                    Conductor ha excedido horas máximas permitidas
                  </Alert>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={!canCrear}
                  startIcon={<Add />}
                  onClick={handleCrearViaje}
                  sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#0284C7' }, fontWeight: 700 }}
                >
                  Crear Viaje
                </Button>
                {!ordenSeleccionada || !vehiculoSeleccionado || !conductorSeleccionado ? (
                  <Typography fontSize={11} color="text.secondary" textAlign="center" mt={0.5}>
                    Selecciona orden, vehículo y conductor
                  </Typography>
                ) : canCrear ? (
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} mt={0.5}>
                    <CheckCircle sx={{ fontSize: 13, color: '#16A34A' }} />
                    <Typography fontSize={11} color="#16A34A">Listo para crear</Typography>
                  </Stack>
                ) : null}
              </Box>
            </Stack>
          </Paper>
        )}

        {!ordenSeleccionada && !vehiculoSeleccionado && !conductorSeleccionado && (
          <Paper elevation={0} sx={{ border: '2px dashed #E5E7EB', borderRadius: '14px', p: 4, textAlign: 'center' }}>
            <LocalShipping sx={{ fontSize: 40, color: '#D1D5DB', mb: 1 }} />
            <Typography color="text.disabled" fontSize={14}>Selecciona una orden y los recursos para iniciar la planificación</Typography>
          </Paper>
        )}
      </Box>
    </Layout>
  )
}
