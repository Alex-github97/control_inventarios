import React, { useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add,
  Visibility,
  Download,
  Assignment,
  CheckBox,
  LocalShipping,
  Close,
  ReportProblem,
  CheckCircle,
  Warning,
  Schedule,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const TMS_COLOR = '#0369A1'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DespachoPendiente {
  id: number
  numero: string
  cliente: string
  nItems: number
  pesoTotal: number
  origen: string
  destino: string
  fechaLimite: string
  estado: string
  urgente: boolean
}

interface DespachoEnProceso {
  id: number
  numero: string
  viajeCodigo: string
  conductor: string
  cliente: string
  pctCompletado: number
  estado: string
}

interface DespachoDespachado {
  id: number
  numero: string
  viajeCodigo: string
  cliente: string
  fechaDespacho: string
  fechaEntrega: string
  otif: 'ON_TIME' | 'TARDE'
}

interface ItemDespacho {
  id: number
  descripcion: string
  cantidad: number
  pesoKg: number
  confirmado: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const HOY = new Date().toISOString().split('T')[0]
const AYER = new Date(Date.now() - 86400000).toISOString().split('T')[0]

const DESPACHOS_PENDIENTES: DespachoPendiente[] = [
  { id: 1, numero: 'D-2024-101', cliente: 'Almacenes Éxito S.A.', nItems: 48, pesoTotal: 3200, origen: 'Bogotá', destino: 'Medellín', fechaLimite: HOY, estado: 'PENDIENTE', urgente: true },
  { id: 2, numero: 'D-2024-102', cliente: 'Bavaria S.A.S.', nItems: 120, pesoTotal: 8500, origen: 'Bogotá', destino: 'Cali', fechaLimite: HOY, estado: 'PENDIENTE', urgente: true },
  { id: 3, numero: 'D-2024-103', cliente: 'Grupo Nutresa', nItems: 35, pesoTotal: 1800, origen: 'Medellín', destino: 'Barranquilla', fechaLimite: new Date(Date.now() + 86400000).toISOString().split('T')[0], estado: 'CONSOLIDANDO', urgente: false },
  { id: 4, numero: 'D-2024-104', cliente: 'Cencosud Colombia', nItems: 72, pesoTotal: 4500, origen: 'Bogotá', destino: 'Bucaramanga', fechaLimite: new Date(Date.now() + 86400000).toISOString().split('T')[0], estado: 'PENDIENTE', urgente: false },
  { id: 5, numero: 'D-2024-105', cliente: 'Postobón S.A.', nItems: 200, pesoTotal: 12000, origen: 'Cali', destino: 'Pasto', fechaLimite: AYER, estado: 'PENDIENTE', urgente: true },
]

const DESPACHOS_EN_PROCESO: DespachoEnProceso[] = [
  { id: 1, numero: 'D-2024-090', viajeCodigo: 'V-2024-001', conductor: 'Carlos Herrera', cliente: 'Colgate-Palmolive', pctCompletado: 65, estado: 'CARGANDO' },
  { id: 2, numero: 'D-2024-091', viajeCodigo: 'V-2024-002', conductor: 'Luis Pérez', cliente: 'Grupo Éxito', pctCompletado: 40, estado: 'EN_RUTA' },
  { id: 3, numero: 'D-2024-092', viajeCodigo: 'V-2024-003', conductor: 'Andrés Torres', cliente: 'Bavaria S.A.S.', pctCompletado: 85, estado: 'EN_RUTA' },
  { id: 4, numero: 'D-2024-093', viajeCodigo: 'V-2024-004', conductor: 'Jhon Morales', cliente: 'Alpina Productos', pctCompletado: 20, estado: 'CARGANDO' },
]

const DESPACHOS_DESPACHADOS: DespachoDespachado[] = [
  { id: 1, numero: 'D-2024-080', viajeCodigo: 'V-2024-095', cliente: 'Almacenes Éxito S.A.', fechaDespacho: AYER, fechaEntrega: HOY, otif: 'ON_TIME' },
  { id: 2, numero: 'D-2024-081', viajeCodigo: 'V-2024-096', cliente: 'Bavaria S.A.S.', fechaDespacho: AYER, fechaEntrega: HOY, otif: 'TARDE' },
  { id: 3, numero: 'D-2024-082', viajeCodigo: 'V-2024-097', cliente: 'Grupo Nutresa', fechaDespacho: AYER, fechaEntrega: HOY, otif: 'ON_TIME' },
  { id: 4, numero: 'D-2024-083', viajeCodigo: 'V-2024-098', cliente: 'Cencosud Colombia', fechaDespacho: AYER, fechaEntrega: AYER, otif: 'ON_TIME' },
  { id: 5, numero: 'D-2024-084', viajeCodigo: 'V-2024-099', cliente: 'Postobón S.A.', fechaDespacho: AYER, fechaEntrega: HOY, otif: 'TARDE' },
  { id: 6, numero: 'D-2024-085', viajeCodigo: 'V-2024-100', cliente: 'Colgate-Palmolive', fechaDespacho: AYER, fechaEntrega: AYER, otif: 'ON_TIME' },
  { id: 7, numero: 'D-2024-086', viajeCodigo: 'V-2024-101', cliente: 'Alpina Productos', fechaDespacho: AYER, fechaEntrega: HOY, otif: 'ON_TIME' },
  { id: 8, numero: 'D-2024-087', viajeCodigo: 'V-2024-102', cliente: 'Unilever Colombia', fechaDespacho: AYER, fechaEntrega: AYER, otif: 'TARDE' },
]

const ITEMS_DESPACHO: ItemDespacho[] = [
  { id: 1, descripcion: 'Cajas producto A - SKU 10023', cantidad: 12, pesoKg: 480, confirmado: false },
  { id: 2, descripcion: 'Pallets producto B - SKU 20045', cantidad: 4, pesoKg: 1200, confirmado: false },
  { id: 3, descripcion: 'Bolsas producto C - SKU 30012', cantidad: 80, pesoKg: 640, confirmado: false },
  { id: 4, descripcion: 'Cajas producto D - SKU 40089', cantidad: 24, pesoKg: 720, confirmado: false },
]

const VIAJES_DISPONIBLES = [
  { codigo: 'V-2024-006', label: 'V-2024-006 — FTL Bogotá→Medellín — Mauricio Silva' },
  { codigo: 'V-2024-009', label: 'V-2024-009 — LTL Bogotá→Ibagué — Ricardo Leal' },
  { codigo: 'V-2024-010', label: 'V-2024-010 — EXPRESS Medellín→Cali — Sergio Díaz' },
]

const fmt = (n: number) => `${n.toLocaleString('es-CO')} kg`

// ─── Dialog Iniciar Despacho ──────────────────────────────────────────────────

function IniciarDespachoDialog({ despacho, open, onClose, onConfirmar }: {
  despacho: DespachoPendiente | null
  open: boolean
  onClose: () => void
  onConfirmar: (id: number) => void
}) {
  const [items, setItems] = useState<ItemDespacho[]>(ITEMS_DESPACHO.map(i => ({ ...i })))
  const [viajeDestino, setViajeDestino] = useState('')
  const [conductorRecibe, setConductorRecibe] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [sellos, setSellos] = useState('')

  const toggleItem = (id: number) => setItems(p => p.map(i => i.id === id ? { ...i, confirmado: !i.confirmado } : i))
  const todosConfirmados = items.every(i => i.confirmado)

  const handleConfirmar = () => {
    if (!despacho) return
    onConfirmar(despacho.id)
    onClose()
  }

  if (!despacho) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Assignment sx={{ color: TMS_COLOR }} />
            <Typography fontWeight={700}>Iniciar Despacho — {despacho.numero}</Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}><Close /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography fontSize={13} color="text.secondary" mb={2}>{despacho.cliente} • {despacho.origen} → {despacho.destino}</Typography>

        <Typography fontSize={12} fontWeight={700} mb={1} color="text.secondary">ITEMS A DESPACHAR — Confirmar consolidación</Typography>
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
          {items.map((item, i) => (
            <Box key={item.id} sx={{ px: 2, py: 1, borderBottom: i < items.length - 1 ? '1px solid #F3F4F6' : 'none', bgcolor: item.confirmado ? alpha('#16A34A', 0.04) : 'transparent' }}>
              <FormControlLabel
                control={<Checkbox checked={item.confirmado} onChange={() => toggleItem(item.id)} size="small" sx={{ '&.Mui-checked': { color: '#16A34A' } }} />}
                label={
                  <Box>
                    <Typography fontSize={12} fontWeight={600}>{item.descripcion}</Typography>
                    <Typography fontSize={11} color="text.secondary">Cant: {item.cantidad} • Peso: {item.pesoKg.toLocaleString()} kg</Typography>
                  </Box>
                }
              />
            </Box>
          ))}
        </Paper>

        {!todosConfirmados && (
          <Stack direction="row" spacing={0.5} alignItems="center" mb={2}>
            <Warning sx={{ fontSize: 14, color: '#D97706' }} />
            <Typography fontSize={12} color="#D97706">{items.filter(i => !i.confirmado).length} ítem(s) sin confirmar</Typography>
          </Stack>
        )}

        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Viaje Destino</InputLabel>
            <Select value={viajeDestino} label="Viaje Destino" onChange={e => setViajeDestino(e.target.value)}>
              {VIAJES_DISPONIBLES.map(v => <MenuItem key={v.codigo} value={v.codigo}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Conductor que recibe" size="small" fullWidth value={conductorRecibe} onChange={e => setConductorRecibe(e.target.value)} />
          <TextField label="Sellos / Precintos" size="small" fullWidth value={sellos} onChange={e => setSellos(e.target.value)} placeholder="Ej: SE-2024-4512, SE-2024-4513" />
          <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={<CheckBox />}
          disabled={!viajeDestino || !conductorRecibe || !todosConfirmados}
          onClick={handleConfirmar}
          sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#0284C7' } }}
        >
          Confirmar Despacho
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TMSDespachos() {
  const [tab, setTab] = useState(0)
  const [pendientes, setPendientes] = useState<DespachoPendiente[]>(DESPACHOS_PENDIENTES)
  const [enProceso] = useState<DespachoEnProceso[]>(DESPACHOS_EN_PROCESO)
  const [despachados] = useState<DespachoDespachado[]>(DESPACHOS_DESPACHADOS)
  const [despachoIniciar, setDespachoIniciar] = useState<DespachoPendiente | null>(null)

  const handleConfirmarDespacho = (id: number) => {
    setPendientes(p => p.filter(d => d.id !== id))
    toast.success('Despacho iniciado exitosamente')
  }

  const isVencido = (fecha: string) => fecha <= HOY

  const estadoEnProcesoStyle: Record<string, { label: string; color: string; bg: string }> = {
    CARGANDO: { label: 'Cargando', color: '#B45309', bg: '#FEF3C7' },
    EN_RUTA: { label: 'En Ruta', color: '#0369A1', bg: '#E0F2FE' },
  }

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800} color={TMS_COLOR}>Gestión de Despachos</Typography>
            <Typography variant="body2" color="text.secondary">
              {pendientes.length} por despachar • {enProceso.length} en proceso • {despachados.length} completados
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip label={`${pendientes.filter(d => d.urgente).length} urgentes`} sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
          </Stack>
        </Stack>

        {/* Tabs */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #F3F4F6', bgcolor: '#F9FAFB' }}>
            <Tab label={`Por Despachar (${pendientes.length})`} sx={{ fontSize: 13, fontWeight: 600 }} />
            <Tab label={`En Proceso (${enProceso.length})`} sx={{ fontSize: 13, fontWeight: 600 }} />
            <Tab label={`Despachados (${despachados.length})`} sx={{ fontSize: 13, fontWeight: 600 }} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Tab 0: Por Despachar */}
            {tab === 0 && (
              <Grid container spacing={2}>
                {pendientes.map(d => {
                  const vencido = isVencido(d.fechaLimite)
                  return (
                    <Grid key={d.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card
                        elevation={0}
                        sx={{
                          border: `2px solid ${vencido ? '#FCA5A5' : '#E5E7EB'}`,
                          borderRadius: '12px',
                          height: '100%',
                          bgcolor: vencido ? '#FFF5F5' : 'transparent',
                          transition: 'box-shadow 0.2s',
                          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Typography fontSize={14} fontWeight={800} color={TMS_COLOR}>{d.numero}</Typography>
                            <Stack direction="row" spacing={0.5}>
                              {vencido && <Chip label="VENCIDO" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 800, fontSize: 10 }} />}
                              <Chip
                                label={d.estado}
                                size="small"
                                sx={{
                                  bgcolor: d.estado === 'CONSOLIDANDO' ? '#FEF3C7' : '#F3F4F6',
                                  color: d.estado === 'CONSOLIDANDO' ? '#B45309' : '#4B5563',
                                  fontWeight: 700, fontSize: 10,
                                }}
                              />
                            </Stack>
                          </Stack>
                          <Typography fontSize={13} fontWeight={600} mb={0.5}>{d.cliente}</Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                            <LocalShipping sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography fontSize={12} color="text.secondary">{d.origen} → {d.destino}</Typography>
                          </Stack>
                          <Grid container spacing={1} mt={0.5}>
                            <Grid size={{ xs: 6 }}>
                              <Typography fontSize={11} color="text.secondary">N° Items</Typography>
                              <Typography fontSize={13} fontWeight={700}>{d.nItems}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography fontSize={11} color="text.secondary">Peso Total</Typography>
                              <Typography fontSize={13} fontWeight={700}>{fmt(d.pesoTotal)}</Typography>
                            </Grid>
                          </Grid>
                          <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                            <Schedule sx={{ fontSize: 12, color: vencido ? '#DC2626' : 'text.secondary' }} />
                            <Typography fontSize={11} color={vencido ? '#DC2626' : 'text.secondary'} fontWeight={vencido ? 700 : 400}>
                              Límite: {d.fechaLimite}
                            </Typography>
                          </Stack>
                        </CardContent>
                        <CardActions sx={{ px: 2, pb: 2 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            size="small"
                            startIcon={<Add />}
                            onClick={() => setDespachoIniciar(d)}
                            sx={{ bgcolor: vencido ? '#DC2626' : TMS_COLOR, '&:hover': { bgcolor: vencido ? '#B91C1C' : '#0284C7' }, fontWeight: 700 }}
                          >
                            Iniciar Despacho
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  )
                })}
                {pendientes.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <CheckCircle sx={{ fontSize: 48, color: '#16A34A', mb: 1 }} />
                      <Typography color="text.secondary">No hay despachos pendientes</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Tab 1: En Proceso */}
            {tab === 1 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>N° Despacho</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Viaje Asignado</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 200 }}>Progreso</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {enProceso.map(d => {
                      const e = estadoEnProcesoStyle[d.estado] || { label: d.estado, color: '#4B5563', bg: '#F3F4F6' }
                      return (
                        <TableRow key={d.id} hover>
                          <TableCell><Typography fontSize={12} fontWeight={700} color={TMS_COLOR}>{d.numero}</Typography></TableCell>
                          <TableCell>
                            <Typography fontSize={12} fontWeight={600}>{d.viajeCodigo}</Typography>
                            <Typography fontSize={11} color="text.secondary">{d.conductor}</Typography>
                          </TableCell>
                          <TableCell><Typography fontSize={12}>{d.cliente}</Typography></TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography fontSize={11} color="text.secondary">Completado</Typography>
                                <Typography fontSize={11} fontWeight={700}>{d.pctCompletado}%</Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={d.pctCompletado}
                                sx={{
                                  height: 6, borderRadius: 3,
                                  bgcolor: '#E5E7EB',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: d.pctCompletado >= 80 ? '#16A34A' : d.pctCompletado >= 40 ? TMS_COLOR : '#D97706',
                                    borderRadius: 3,
                                  }
                                }}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={e.label} size="small" sx={{ bgcolor: e.bg, color: e.color, fontWeight: 700, fontSize: 11 }} />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Ver detalle">
                                <IconButton size="small" sx={{ color: TMS_COLOR }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                              </Tooltip>
                              <Tooltip title="Registrar novedad">
                                <IconButton size="small" sx={{ color: '#D97706' }} onClick={() => toast('Función de novedad próximamente')}><ReportProblem sx={{ fontSize: 16 }} /></IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Tab 2: Despachados */}
            {tab === 2 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>N° Despacho</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Viaje</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Fecha Despacho</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Fecha Entrega</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>OTIF</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {despachados.map(d => (
                      <TableRow key={d.id} hover>
                        <TableCell><Typography fontSize={12} fontWeight={700} color={TMS_COLOR}>{d.numero}</Typography></TableCell>
                        <TableCell><Typography fontSize={12} fontWeight={600}>{d.viajeCodigo}</Typography></TableCell>
                        <TableCell><Typography fontSize={12}>{d.cliente}</Typography></TableCell>
                        <TableCell><Typography fontSize={12}>{d.fechaDespacho}</Typography></TableCell>
                        <TableCell><Typography fontSize={12}>{d.fechaEntrega}</Typography></TableCell>
                        <TableCell>
                          <Chip
                            icon={d.otif === 'ON_TIME' ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : <Warning sx={{ fontSize: '14px !important' }} />}
                            label={d.otif === 'ON_TIME' ? 'ON TIME' : 'TARDE'}
                            size="small"
                            sx={{
                              bgcolor: d.otif === 'ON_TIME' ? '#DCFCE7' : '#FEE2E2',
                              color: d.otif === 'ON_TIME' ? '#15803D' : '#DC2626',
                              fontWeight: 700, fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Ver detalle">
                              <IconButton size="small" sx={{ color: TMS_COLOR }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Descargar documentos">
                              <IconButton size="small" sx={{ color: '#4B5563' }} onClick={() => toast.success(`Descargando documentos ${d.numero}`)}><Download sx={{ fontSize: 16 }} /></IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        {/* Dialog */}
        <IniciarDespachoDialog
          despacho={despachoIniciar}
          open={!!despachoIniciar}
          onClose={() => setDespachoIniciar(null)}
          onConfirmar={handleConfirmarDespacho}
        />
      </Box>
    </Layout>
  )
}
