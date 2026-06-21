import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, alpha, Divider, TextField, IconButton, Select,
  MenuItem, FormControl, InputLabel, Collapse,
} from '@mui/material'
import {
  AccountTree as TreeIcon,
  Science as ScienceIcon,
  Engineering as EngineeringIcon,
  PriceChange as CostIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChevronRight as ChevronIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'
const CARD_BG = '#0F1E35'
const DARK_BG = '#060C1A'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface BOMNode {
  codigo: string
  nombre: string
  cantidad: number
  um: string
  merma: number
  nivel: number
  children?: BOMNode[]
  proveedor?: string
}

interface Ingrediente {
  orden: number
  ingrediente: string
  cantidad: number
  porcentaje: number
  unidad: string
  esCritico: boolean
  notas: string
}

interface ECO {
  numero: string
  descripcion: string
  bomAfectado: string
  versionAnterior: string
  versionNueva: string
  estado: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO'
  fechaEfectiva: string
  impactoCosto: number
}

interface ComponenteCosto {
  codigo: string
  nombre: string
  costoUnitario: number
  cantidad: number
  costoTotal: number
  porcentajeBOM: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const BOM_TREE: BOMNode = {
  codigo: 'PT-001',
  nombre: 'Producto Terminado Premium',
  cantidad: 1,
  um: 'un',
  merma: 0,
  nivel: 0,
  children: [
    {
      codigo: 'MP-001',
      nombre: 'Resina PVC grado alimentario',
      cantidad: 2.5,
      um: 'kg',
      merma: 3.2,
      nivel: 1,
      proveedor: 'Plastinova SAS',
      children: [
        { codigo: 'SUB-001', nombre: 'Monómero VCM (CAS 75-01-4)', cantidad: 2.1, um: 'kg', merma: 1.0, nivel: 2, proveedor: 'Petroquímica Latam' },
        { codigo: 'SUB-002', nombre: 'Catalizador peróxido dilauril', cantidad: 0.08, um: 'kg', merma: 0.5, nivel: 2, proveedor: 'Albemarle Colombia' },
      ],
    },
    {
      codigo: 'MP-002',
      nombre: 'Pigmento azul cobalto',
      cantidad: 1.2,
      um: 'kg',
      merma: 1.8,
      nivel: 1,
      proveedor: 'Colorantes del Norte',
    },
    {
      codigo: 'EMP-001',
      nombre: 'Caja corrugada 30x20x15cm',
      cantidad: 1,
      um: 'un',
      merma: 0,
      nivel: 1,
      proveedor: 'Cartones del Valle',
    },
    {
      codigo: 'MP-007',
      nombre: 'Lubricante estéarico',
      cantidad: 0.08,
      um: 'kg',
      merma: 0.5,
      nivel: 1,
      proveedor: 'Lubrinova SAS',
    },
  ],
}

const INGREDIENTES: Ingrediente[] = [
  { orden: 1, ingrediente: 'Resina PVC grado alimentario', cantidad: 2500, porcentaje: 55.6, unidad: 'g', esCritico: true, notas: 'Viscosidad K-67, temperatura ≤25°C' },
  { orden: 2, ingrediente: 'Carbonato de calcio industrial', cantidad: 800, porcentaje: 17.8, unidad: 'g', esCritico: false, notas: 'Malla 325, blancura ≥97%' },
  { orden: 3, ingrediente: 'Plastificante DEHP', cantidad: 650, porcentaje: 14.4, unidad: 'g', esCritico: true, notas: 'Grado técnico, agregar lentamente' },
  { orden: 4, ingrediente: 'Pigmento azul cobalto', cantidad: 120, porcentaje: 2.7, unidad: 'g', esCritico: false, notas: 'Dispersar en plastificante antes' },
  { orden: 5, ingrediente: 'Estabilizante Ca-Zn', cantidad: 180, porcentaje: 4.0, unidad: 'g', esCritico: true, notas: 'Agregar simultáneamente con lubricante' },
  { orden: 6, ingrediente: 'Lubricante estéarico', cantidad: 80, porcentaje: 1.8, unidad: 'g', esCritico: false, notas: 'Puede sustituirse por cera parafínica' },
  { orden: 7, ingrediente: 'Dióxido de titanio TiO2', cantidad: 75, porcentaje: 1.7, unidad: 'g', esCritico: false, notas: 'Para brillo y opacidad' },
  { orden: 8, ingrediente: 'Antioxidante Irganox 1010', cantidad: 95, porcentaje: 2.1, unidad: 'g', esCritico: true, notas: 'CRÍTICO — no omitir. Adicionar al final' },
]

const ECOS: ECO[] = [
  { numero: 'ECO-2025-012', descripcion: 'Incremento % estabilizante Ca-Zn por nueva norma NTC 4321', bomAfectado: 'PT-001, PT-002', versionAnterior: 'v2.0', versionNueva: 'v2.1', estado: 'APROBADO', fechaEfectiva: '2025-07-01', impactoCosto: 1850 },
  { numero: 'ECO-2025-011', descripcion: 'Sustitución pigmento azul Phtalo → Cobalto', bomAfectado: 'PT-002', versionAnterior: 'v1.8', versionNueva: 'v2.0', estado: 'APROBADO', fechaEfectiva: '2025-06-01', impactoCosto: 3200 },
  { numero: 'ECO-2025-010', descripcion: 'Reducción % DEHP — reformulación ambiental', bomAfectado: 'PT-001, PT-003', versionAnterior: 'v1.9', versionNueva: 'v2.0', estado: 'PENDIENTE', fechaEfectiva: '2025-08-15', impactoCosto: -1200 },
  { numero: 'ECO-2025-009', descripcion: 'Cambio proveedor resina PVC: Plastinova → PolyCol', bomAfectado: 'PT-001, PT-002, PT-004', versionAnterior: 'v1.8', versionNueva: 'v1.9', estado: 'RECHAZADO', fechaEfectiva: 'N/A', impactoCosto: -4500 },
  { numero: 'ECO-2025-008', descripcion: 'Adición antioxidante secundario AO-412S', bomAfectado: 'PT-003', versionAnterior: 'v1.5', versionNueva: 'v1.6', estado: 'APROBADO', fechaEfectiva: '2025-04-20', impactoCosto: 980 },
  { numero: 'ECO-2025-007', descripcion: 'Rediseño caja empaque — aumento espesor 3→5mm', bomAfectado: 'PT-001, PT-002, PT-003, PT-004', versionAnterior: 'v1.2', versionNueva: 'v1.3', estado: 'APROBADO', fechaEfectiva: '2025-03-01', impactoCosto: 620 },
  { numero: 'ECO-2025-006', descripcion: 'Ajuste merma resina: 2.8% → 3.2% (real vs teórico)', bomAfectado: 'PT-001', versionAnterior: 'v1.9', versionNueva: 'v2.0', estado: 'APROBADO', fechaEfectiva: '2025-02-15', impactoCosto: 750 },
  { numero: 'ECO-2025-005', descripcion: 'Inclusión lubricante adicional turno nocturno (T>35°C)', bomAfectado: 'PT-002, PT-005', versionAnterior: 'v1.7', versionNueva: 'v1.8', estado: 'PENDIENTE', fechaEfectiva: '2025-09-01', impactoCosto: 420 },
]

const COMPONENTES_COSTO: ComponenteCosto[] = [
  { codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', costoUnitario: 8200, cantidad: 2.5, costoTotal: 20500, porcentajeBOM: 30.4 },
  { codigo: 'MP-003', nombre: 'Plastificante DEHP', costoUnitario: 6500, cantidad: 0.65, costoTotal: 4225, porcentajeBOM: 6.3 },
  { codigo: 'MP-005', nombre: 'Carbonato de calcio industrial', costoUnitario: 1200, cantidad: 0.8, costoTotal: 960, porcentajeBOM: 1.4 },
  { codigo: 'MP-002', nombre: 'Pigmento azul cobalto', costoUnitario: 28000, cantidad: 0.12, costoTotal: 3360, porcentajeBOM: 5.0 },
  { codigo: 'MP-004', nombre: 'Estabilizante Ca-Zn', costoUnitario: 45000, cantidad: 0.18, costoTotal: 8100, porcentajeBOM: 12.0 },
  { codigo: 'MP-007', nombre: 'Lubricante estéarico', costoUnitario: 3800, cantidad: 0.08, costoTotal: 304, porcentajeBOM: 0.5 },
  { codigo: 'MP-006', nombre: 'Dióxido de titanio TiO2', costoUnitario: 32000, cantidad: 0.075, costoTotal: 2400, porcentajeBOM: 3.6 },
  { codigo: 'MP-010', nombre: 'Antioxidante Irganox 1010', costoUnitario: 95000, cantidad: 0.095, costoTotal: 9025, porcentajeBOM: 13.4 },
  { codigo: 'EMP-001', nombre: 'Caja corrugada 30x20x15cm', costoUnitario: 1326, cantidad: 1, costoTotal: 1326, porcentajeBOM: 1.97 },
]

const ecoEstadoColor = (e: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO') =>
  ({ APROBADO: '#32AC5C', PENDIENTE: '#EAB308', RECHAZADO: '#EF4444' })[e]

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function BOMNodeRow({ node, expanded, onToggle }: { node: BOMNode; expanded: Set<string>; onToggle: (code: string) => void }) {
  const isExpanded = expanded.has(node.codigo)
  const hasChildren = node.children && node.children.length > 0
  const indent = node.nivel * 24

  return (
    <>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', py: 1.2, px: 2,
          pl: `${8 + indent}px`,
          borderBottom: `1px solid ${alpha('#fff', 0.05)}`,
          '&:hover': { background: alpha('#fff', 0.03) },
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        onClick={() => hasChildren && onToggle(node.codigo)}
      >
        <Box sx={{ width: 20, mr: 0.5, color: 'grey.500', display: 'flex', alignItems: 'center' }}>
          {hasChildren ? (isExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />) : <ChevronIcon sx={{ fontSize: 14, opacity: 0.3 }} />}
        </Box>
        <Box sx={{ p: 0.5, mr: 1, borderRadius: 1, background: alpha(MES_COLOR, node.nivel === 0 ? 0.2 : 0.08), color: MES_COLOR }}>
          <TreeIcon sx={{ fontSize: 14 }} />
        </Box>
        <Typography variant="body2" color={MES_COLOR} fontFamily="monospace" fontWeight={700} sx={{ mr: 1.5, minWidth: 80 }}>{node.codigo}</Typography>
        <Typography variant="body2" color="grey.200" sx={{ flex: 1 }}>{node.nombre}</Typography>
        <Typography variant="body2" color="white" fontWeight={600} sx={{ mr: 1, minWidth: 60, textAlign: 'right' }}>{node.cantidad}</Typography>
        <Typography variant="caption" color="grey.500" sx={{ mr: 2, minWidth: 30 }}>{node.um}</Typography>
        <Chip label={`Merma: ${node.merma}%`} size="small" sx={{ background: alpha(node.merma > 2 ? '#EAB308' : '#32AC5C', 0.12), color: node.merma > 2 ? '#EAB308' : '#32AC5C', fontSize: 9, height: 18, mr: 1 }} />
        {node.proveedor && <Typography variant="caption" color="grey.500" sx={{ minWidth: 140, textAlign: 'right', display: { xs: 'none', md: 'block' } }}>{node.proveedor}</Typography>}
      </Box>
      {hasChildren && isExpanded && node.children!.map(child => (
        <BOMNodeRow key={child.codigo} node={child} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MESBOM() {
  const [tab, setTab] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['PT-001']))
  const [searchVal, setSearchVal] = useState('PT-001')
  const [versionSeleccionada, setVersionSeleccionada] = useState('v2.1')
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)

  const toggleNode = (codigo: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(codigo) ? next.delete(codigo) : next.add(codigo)
      return next
    })
  }

  const totalMPs = 48200
  const totalMO = 12400
  const totalIF = 6800
  const costoTotal = totalMPs + totalMO + totalIF // 67400
  const precioVenta = 98000
  const margen = ((precioVenta - costoTotal) / precioVenta * 100).toFixed(1)

  const tabSx = {
    '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 },
    '& .Mui-selected': { color: MES_COLOR },
    '& .MuiTabs-indicator': { backgroundColor: MES_COLOR },
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: DARK_BG, minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.15), color: MES_COLOR }}>
            <TreeIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">MES — BOM & Recetas</Typography>
            <Typography variant="body2" color="grey.400">Bill of Materials, fórmulas de producción, ECOs y análisis de costos</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabSx}>
            {['BOM Explorer', 'Recetas & Fórmulas', 'Cambios', 'Costo BOM'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: BOM Explorer ──────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            <Stack direction="row" spacing={2} mb={3} alignItems="center">
              <TextField
                size="small" placeholder="Buscar producto (ej. PT-001)" value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                sx={{ width: 320, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.05), '& fieldset': { borderColor: alpha('#fff', 0.15) }, '&:hover fieldset': { borderColor: MES_COLOR }, color: 'white', fontSize: 14 } }}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: 'grey.500', mr: 1, fontSize: 18 }} /> }}
              />
              <Button variant="contained" sx={{ background: MES_DARK, color: 'white', textTransform: 'none', fontWeight: 700, '&:hover': { background: MES_COLOR } }}>
                Buscar BOM
              </Button>
              <Button variant="outlined" onClick={() => setShowCostBreakdown(!showCostBreakdown)} sx={{ textTransform: 'none', borderColor: alpha(MES_COLOR, 0.4), color: MES_COLOR, fontWeight: 600, '&:hover': { borderColor: MES_COLOR, background: alpha(MES_COLOR, 0.1) } }}>
                {showCostBreakdown ? 'Ocultar costo' : 'Ver costo'}
              </Button>
            </Stack>

            {showCostBreakdown && (
              <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} color="white" mb={1.5}>Costo unitario PT-001</Typography>
                  <Grid container spacing={3}>
                    {[
                      { label: 'Materias Primas', value: fmt(totalMPs), pct: 72, color: MES_COLOR },
                      { label: 'Mano de Obra', value: fmt(totalMO), pct: 18, color: '#10B981' },
                      { label: 'Ind. Fabricación', value: fmt(totalIF), pct: 10, color: '#8B5CF6' },
                    ].map((item, i) => (
                      <Grid key={i} size={{ xs: 12, md: 4 }}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="grey.400">{item.label}</Typography>
                          <Typography variant="caption" color={item.color} fontWeight={700}>{item.value} ({item.pct}%)</Typography>
                        </Stack>
                        <Box sx={{ height: 8, borderRadius: 4, background: alpha('#fff', 0.08) }}>
                          <Box sx={{ height: '100%', width: `${item.pct}%`, borderRadius: 4, background: item.color }} />
                        </Box>
                      </Grid>
                    ))}
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ borderColor: alpha('#fff', 0.08) }} />
                      <Stack direction="row" spacing={4} mt={1.5}>
                        <Box><Typography variant="caption" color="grey.400">Costo total</Typography><Typography variant="h6" color="white" fontWeight={700}>{fmt(costoTotal)}</Typography></Box>
                        <Box><Typography variant="caption" color="grey.400">Precio venta</Typography><Typography variant="h6" color={MES_COLOR} fontWeight={700}>{fmt(precioVenta)}</Typography></Box>
                        <Box><Typography variant="caption" color="grey.400">Margen bruto</Typography><Typography variant="h6" color="#32AC5C" fontWeight={700}>{margen}%</Typography></Box>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <CardContent sx={{ pb: 0 }}>
                <Stack direction="row" spacing={3} mb={1.5}>
                  <Typography variant="caption" color="grey.400" sx={{ minWidth: 100 }}>Código</Typography>
                  <Typography variant="caption" color="grey.400" sx={{ flex: 1 }}>Componente</Typography>
                  <Typography variant="caption" color="grey.400" sx={{ minWidth: 60, textAlign: 'right' }}>Cant.</Typography>
                  <Typography variant="caption" color="grey.400" sx={{ minWidth: 30 }}>UM</Typography>
                  <Typography variant="caption" color="grey.400" sx={{ minWidth: 80 }}>Merma</Typography>
                  <Typography variant="caption" color="grey.400" sx={{ minWidth: 140, display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>Proveedor</Typography>
                </Stack>
                <Divider sx={{ borderColor: alpha('#fff', 0.08), mb: 0 }} />
              </CardContent>
              <Box sx={{ pb: 1 }}>
                <BOMNodeRow node={BOM_TREE} expanded={expanded} onToggle={toggleNode} />
              </Box>
            </Card>
          </Box>
        )}

        {/* ── Tab 1: Recetas & Fórmulas ────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(MES_COLOR, 0.3)}` }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} color="white" mb={2}>Producto activo</Typography>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel sx={{ color: 'grey.400' }}>Seleccionar producto</InputLabel>
                      <Select defaultValue="PT-001" label="Seleccionar producto" sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.2) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}>
                        <MenuItem value="PT-001">PT-001 — Producto Terminado Premium</MenuItem>
                        <MenuItem value="PT-002">PT-002 — Producto Plus</MenuItem>
                        <MenuItem value="PT-003">PT-003 — Modelo X</MenuItem>
                      </Select>
                    </FormControl>

                    <Divider sx={{ borderColor: alpha('#fff', 0.08), mb: 2 }} />
                    <Stack spacing={1.5}>
                      {[
                        { label: 'Nombre receta', value: 'FRM-PT001-A' },
                        { label: 'Versión activa', value: versionSeleccionada },
                        { label: 'Rendimiento', value: '97.8%' },
                        { label: 'Tiempo proceso', value: '42 min' },
                        { label: 'Temperatura', value: '175 ± 5°C' },
                        { label: 'Presión inyección', value: '85 bar' },
                      ].map((item, i) => (
                        <Stack key={i} direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="grey.400">{item.label}</Typography>
                          <Typography variant="caption" color="white" fontWeight={600}>{item.value}</Typography>
                        </Stack>
                      ))}
                    </Stack>

                    <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 2 }} />
                    <Typography variant="caption" color="grey.400" mb={1} display="block">Versiones disponibles</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {['v1.0', 'v1.1', 'v2.0', 'v2.1'].map(v => (
                        <Chip
                          key={v} label={v} size="small" clickable
                          onClick={() => setVersionSeleccionada(v)}
                          sx={{
                            background: versionSeleccionada === v ? alpha(MES_COLOR, 0.25) : alpha('#fff', 0.06),
                            color: versionSeleccionada === v ? MES_COLOR : 'grey.400',
                            border: versionSeleccionada === v ? `1px solid ${MES_COLOR}` : `1px solid ${alpha('#fff', 0.1)}`,
                            fontWeight: versionSeleccionada === v ? 700 : 400,
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle1" fontWeight={700} color="white">Ingredientes — FRM-PT001-A ({versionSeleccionada})</Typography>
                      <Chip label="Activa" size="small" sx={{ background: alpha('#32AC5C', 0.15), color: '#32AC5C', fontWeight: 700 }} />
                    </Stack>
                  </CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                          <TableCell>#</TableCell>
                          <TableCell>Ingrediente</TableCell>
                          <TableCell align="right">Cantidad</TableCell>
                          <TableCell align="right">%</TableCell>
                          <TableCell>UM</TableCell>
                          <TableCell align="center">Crítico</TableCell>
                          <TableCell>Notas</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {INGREDIENTES.map((ing) => (
                          <TableRow key={ing.orden} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                            <TableCell><Typography variant="caption" color="grey.500">{ing.orden}</Typography></TableCell>
                            <TableCell>{ing.ingrediente}</TableCell>
                            <TableCell align="right"><Typography fontWeight={600}>{ing.cantidad}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" color={MES_COLOR}>{ing.porcentaje}%</Typography></TableCell>
                            <TableCell>{ing.unidad}</TableCell>
                            <TableCell align="center">
                              {ing.esCritico
                                ? <Chip label="CRÍTICO" size="small" sx={{ background: alpha('#EF4444', 0.15), color: '#EF4444', fontWeight: 700, fontSize: 9 }} />
                                : <Typography variant="caption" color="grey.600">—</Typography>}
                            </TableCell>
                            <TableCell><Typography variant="caption" color="grey.400">{ing.notas}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 2: Cambios de Ingeniería (ECOs) ─────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EngineeringIcon sx={{ color: MES_COLOR }} />
                <Typography variant="h6" color="white" fontWeight={700}>Engineering Change Orders (ECO)</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                {['APROBADO', 'PENDIENTE', 'RECHAZADO'].map(s => (
                  <Chip key={s} label={`${s} ${ECOS.filter(e => e.estado === s).length}`} size="small"
                    sx={{ background: alpha(ecoEstadoColor(s as any), 0.15), color: ecoEstadoColor(s as any), fontWeight: 600, fontSize: 10 }} />
                ))}
              </Stack>
            </Stack>

            <TableContainer component={Paper} sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                    <TableCell>Número ECO</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>BOM Afectado</TableCell>
                    <TableCell align="center">Versión</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell>Fecha Efectiva</TableCell>
                    <TableCell align="right">Impacto Costo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ECOS.map((eco, i) => {
                    const stColor = ecoEstadoColor(eco.estado)
                    return (
                      <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                        <TableCell><Typography variant="caption" color={MES_COLOR} fontFamily="monospace" fontWeight={700}>{eco.numero}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ maxWidth: 280 }}>{eco.descripcion}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="grey.400">{eco.bomAfectado}</Typography></TableCell>
                        <TableCell align="center">
                          <Typography variant="caption" color="grey.500">{eco.versionAnterior}</Typography>
                          <Typography variant="caption" color="grey.500"> → </Typography>
                          <Typography variant="caption" color="white" fontWeight={700}>{eco.versionNueva}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={eco.estado} size="small" sx={{ background: alpha(stColor, 0.15), color: stColor, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" color="grey.400">{eco.fechaEfectiva}</Typography></TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color={eco.impactoCosto > 0 ? '#F97316' : '#32AC5C'}>
                            {eco.impactoCosto > 0 ? '+' : ''}{eco.impactoCosto.toLocaleString('es-CO')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 3: Costo BOM ─────────────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            <Grid container spacing={3}>
              {/* Breakdown de costos */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(MES_COLOR, 0.3)}` }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} color="white" mb={2}>Costo Unitario — PT-001</Typography>
                    <Stack spacing={2} mb={2}>
                      {[
                        { label: 'Materias Primas', value: totalMPs, pct: 72, color: MES_COLOR },
                        { label: 'Mano de Obra Directa', value: totalMO, pct: 18, color: '#10B981' },
                        { label: 'Ind. de Fabricación', value: totalIF, pct: 10, color: '#8B5CF6' },
                      ].map((item, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="grey.300">{item.label}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" color="grey.400">{item.pct}%</Typography>
                              <Typography variant="body2" color={item.color} fontWeight={700}>{fmt(item.value)}</Typography>
                            </Stack>
                          </Stack>
                          <Box sx={{ height: 10, borderRadius: 5, background: alpha('#fff', 0.07) }}>
                            <Box sx={{ height: '100%', width: `${item.pct}%`, borderRadius: 5, background: item.color }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                    <Divider sx={{ borderColor: alpha('#fff', 0.1), my: 2 }} />
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="grey.400">Costo total unitario</Typography>
                        <Typography color="white" fontWeight={700}>{fmt(costoTotal)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="grey.400">Precio de venta</Typography>
                        <Typography color={MES_COLOR} fontWeight={700}>{fmt(precioVenta)}</Typography>
                      </Stack>
                      <Divider sx={{ borderColor: alpha('#fff', 0.08) }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="grey.300" fontWeight={600}>Margen bruto</Typography>
                        <Typography color="#32AC5C" fontWeight={800} variant="h6">{margen}%</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Tabla componentes */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent sx={{ pb: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="white" mb={0}>Desglose por Componente</Typography>
                  </CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                          <TableCell>Código</TableCell>
                          <TableCell>Componente</TableCell>
                          <TableCell align="right">Costo/u</TableCell>
                          <TableCell align="right">Cantidad</TableCell>
                          <TableCell align="right">Costo Total</TableCell>
                          <TableCell align="right">% BOM</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {COMPONENTES_COSTO.map((c, i) => (
                          <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                            <TableCell><Typography variant="caption" color={MES_COLOR} fontFamily="monospace" fontWeight={700}>{c.codigo}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ maxWidth: 200 }}>{c.nombre}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption" color="grey.400">{fmt(c.costoUnitario)}</Typography></TableCell>
                            <TableCell align="right">{c.cantidad}</TableCell>
                            <TableCell align="right"><Typography fontWeight={700}>{fmt(c.costoTotal)}</Typography></TableCell>
                            <TableCell align="right">
                              <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
                                <Box sx={{ width: 40, height: 6, borderRadius: 3, background: alpha('#fff', 0.07) }}>
                                  <Box sx={{ height: '100%', width: `${Math.min(c.porcentajeBOM * 3, 100)}%`, borderRadius: 3, background: MES_COLOR }} />
                                </Box>
                                <Typography variant="caption" color={MES_COLOR} fontWeight={600}>{c.porcentajeBOM.toFixed(1)}%</Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ '& td': { borderTop: `2px solid ${alpha(MES_COLOR, 0.3)}`, borderBottom: 'none' } }}>
                          <TableCell colSpan={4}><Typography color="white" fontWeight={700}>Total Materias Primas</Typography></TableCell>
                          <TableCell align="right"><Typography color={MES_COLOR} fontWeight={800}>{fmt(COMPONENTES_COSTO.reduce((a, c) => a + c.costoTotal, 0))}</Typography></TableCell>
                          <TableCell align="right"><Typography color={MES_COLOR} fontWeight={700}>72.0%</Typography></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
