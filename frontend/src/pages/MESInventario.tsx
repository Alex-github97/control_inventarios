import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, alpha, Divider, TextField,
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  Science as ScienceIcon,
  LocalShipping as ShipIcon,
  Loop as LoopIcon,
  Warning as WarnIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface WIPCelda {
  celda: string
  producto: string
  cantidad: number
  unidad: string
  fechaEntrada: string
  tiempoAcumulado: string
  estado: 'OK' | 'ALERTA' | 'CRITICO'
  op: string
}

interface MateriasPrimas {
  codigo: string
  nombre: string
  stockActual: number
  stockMinimo: number
  unidad: string
  loteActivo: string
  fechaVencimiento: string
  estado: 'OK' | 'BAJO' | 'CRITICO'
  proveedor: string
}

interface ConsumosDia {
  op: string
  mp: string
  loteMP: string
  planificado: number
  real: number
  diferencia: number
  desviacion: number
  unidad: string
}

interface Reposicion {
  id: number
  mp: string
  cantSolicitada: number
  cantActual: number
  puntoReorden: number
  prioridad: 'URGENTE' | 'ALTA' | 'NORMAL'
  estado: 'PENDIENTE' | 'EN PROCESO' | 'RECIBIDO'
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CELDAS_LAYOUT = [
  { nombre: 'Celda A1', wip: 820, max: 1000, estado: 'OK' as const },
  { nombre: 'Celda A2', wip: 1240, max: 1000, estado: 'CRITICO' as const },
  { nombre: 'Celda B1', wip: 640, max: 1000, estado: 'OK' as const },
  { nombre: 'Celda B2', wip: 890, max: 1000, estado: 'ALERTA' as const },
  { nombre: 'Celda C1', wip: 320, max: 1000, estado: 'OK' as const },
  { nombre: 'Celda C2', wip: 1180, max: 1000, estado: 'CRITICO' as const },
  { nombre: 'Celda D1', wip: 430, max: 1000, estado: 'OK' as const },
  { nombre: 'Celda D2', wip: 1100, max: 1000, estado: 'ALERTA' as const },
]

const WIP_TABLA: WIPCelda[] = [
  { celda: 'A1', producto: 'PT-001 Producto Base', cantidad: 820, unidad: 'un', fechaEntrada: '06/20 06:00', tiempoAcumulado: '4.2h', estado: 'OK', op: 'OP-2025-041' },
  { celda: 'A2', producto: 'PT-002 Producto Plus', cantidad: 1240, unidad: 'un', fechaEntrada: '06/20 02:00', tiempoAcumulado: '8.4h', estado: 'CRITICO', op: 'OP-2025-042' },
  { celda: 'B1', producto: 'PT-003 Modelo X', cantidad: 640, unidad: 'kg', fechaEntrada: '06/20 07:30', tiempoAcumulado: '3.1h', estado: 'OK', op: 'OP-2025-043' },
  { celda: 'B2', producto: 'PT-001 Producto Base', cantidad: 890, unidad: 'un', fechaEntrada: '06/20 03:00', tiempoAcumulado: '7.8h', estado: 'ALERTA', op: 'OP-2025-044' },
  { celda: 'C1', producto: 'PT-004 Ensamble M', cantidad: 320, unidad: 'un', fechaEntrada: '06/20 08:00', tiempoAcumulado: '2.5h', estado: 'OK', op: 'OP-2025-045' },
  { celda: 'C2', producto: 'PT-002 Producto Plus', cantidad: 1180, unidad: 'un', fechaEntrada: '06/19 22:00', tiempoAcumulado: '12.6h', estado: 'CRITICO', op: 'OP-2025-046' },
  { celda: 'D1', producto: 'PT-005 Kit Estándar', cantidad: 430, unidad: 'kit', fechaEntrada: '06/20 07:00', tiempoAcumulado: '3.5h', estado: 'OK', op: 'OP-2025-047' },
  { celda: 'D2', producto: 'PT-003 Modelo X', cantidad: 1100, unidad: 'kg', fechaEntrada: '06/20 01:00', tiempoAcumulado: '9.1h', estado: 'ALERTA', op: 'OP-2025-048' },
]

const MATERIAS_PRIMAS: MateriasPrimas[] = [
  { codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', stockActual: 2400, stockMinimo: 1000, unidad: 'kg', loteActivo: 'L2025-060', fechaVencimiento: '2025-12-31', estado: 'OK', proveedor: 'Plastinova SAS' },
  { codigo: 'MP-002', nombre: 'Pigmento azul cobalto', stockActual: 180, stockMinimo: 200, unidad: 'kg', loteActivo: 'L2025-045', fechaVencimiento: '2026-03-15', estado: 'BAJO', proveedor: 'Colorantes del Norte' },
  { codigo: 'MP-003', nombre: 'Plastificante DEHP', stockActual: 850, stockMinimo: 400, unidad: 'L', loteActivo: 'L2025-058', fechaVencimiento: '2025-09-30', estado: 'OK', proveedor: 'QuímicaCol Ltda' },
  { codigo: 'MP-004', nombre: 'Estabilizante térmico Ca-Zn', stockActual: 42, stockMinimo: 150, unidad: 'kg', loteActivo: 'L2025-032', fechaVencimiento: '2025-07-01', estado: 'CRITICO', proveedor: 'Additech SA' },
  { codigo: 'MP-005', nombre: 'Carbonato de calcio industrial', stockActual: 5200, stockMinimo: 2000, unidad: 'kg', loteActivo: 'L2025-062', fechaVencimiento: '2027-01-01', estado: 'OK', proveedor: 'Minercol SA' },
  { codigo: 'MP-006', nombre: 'Dióxido de titanio (TiO2)', stockActual: 95, stockMinimo: 120, unidad: 'kg', loteActivo: 'L2025-040', fechaVencimiento: '2025-08-20', estado: 'BAJO', proveedor: 'Pigmentos Int.' },
  { codigo: 'MP-007', nombre: 'Lubricante estéarico', stockActual: 680, stockMinimo: 300, unidad: 'kg', loteActivo: 'L2025-055', fechaVencimiento: '2026-06-10', estado: 'OK', proveedor: 'Lubrinova SAS' },
  { codigo: 'MP-008', nombre: 'Agente de soplado ADCA', stockActual: 28, stockMinimo: 80, unidad: 'kg', loteActivo: 'L2025-028', fechaVencimiento: '2025-07-15', estado: 'CRITICO', proveedor: 'Foamtec Ltda' },
  { codigo: 'MP-009', nombre: 'Cera parafínica 52-54°C', stockActual: 1100, stockMinimo: 500, unidad: 'kg', loteActivo: 'L2025-061', fechaVencimiento: '2027-06-01', estado: 'OK', proveedor: 'Refinería del Centro' },
  { codigo: 'MP-010', nombre: 'Antioxidante Irganox 1010', stockActual: 15, stockMinimo: 60, unidad: 'kg', loteActivo: 'L2025-021', fechaVencimiento: '2025-08-01', estado: 'CRITICO', proveedor: 'BASF Colombia' },
  { codigo: 'MP-011', nombre: 'Retardante de llama DBDPE', stockActual: 420, stockMinimo: 200, unidad: 'kg', loteActivo: 'L2025-053', fechaVencimiento: '2026-09-30', estado: 'OK', proveedor: 'FlameGuard SA' },
  { codigo: 'EMP-001', nombre: 'Caja corrugada 30x20x15cm', stockActual: 3800, stockMinimo: 2000, unidad: 'un', loteActivo: 'L2025-064', fechaVencimiento: 'N/A', estado: 'OK', proveedor: 'Cartones del Valle' },
]

const CONSUMOS: ConsumosDia[] = [
  { op: 'OP-2025-041', mp: 'MP-001 Resina PVC', loteMP: 'L2025-060', planificado: 250, real: 258, diferencia: 8, desviacion: 3.2, unidad: 'kg' },
  { op: 'OP-2025-042', mp: 'MP-002 Pigmento azul', loteMP: 'L2025-045', planificado: 12, real: 12.3, diferencia: 0.3, desviacion: 2.5, unidad: 'kg' },
  { op: 'OP-2025-043', mp: 'MP-003 Plastificante', loteMP: 'L2025-058', planificado: 80, real: 88, diferencia: 8, desviacion: 10.0, unidad: 'L' },
  { op: 'OP-2025-044', mp: 'MP-005 CaCO3', loteMP: 'L2025-062', planificado: 400, real: 395, diferencia: -5, desviacion: -1.3, unidad: 'kg' },
  { op: 'OP-2025-041', mp: 'MP-007 Lubricante', loteMP: 'L2025-055', planificado: 15, real: 14.8, diferencia: -0.2, desviacion: -1.3, unidad: 'kg' },
  { op: 'OP-2025-045', mp: 'MP-009 Cera parafínica', loteMP: 'L2025-061', planificado: 40, real: 43.5, diferencia: 3.5, desviacion: 8.8, unidad: 'kg' },
  { op: 'OP-2025-046', mp: 'MP-001 Resina PVC', loteMP: 'L2025-060', planificado: 300, real: 312, diferencia: 12, desviacion: 4.0, unidad: 'kg' },
  { op: 'OP-2025-042', mp: 'MP-006 TiO2', loteMP: 'L2025-040', planificado: 18, real: 17.5, diferencia: -0.5, desviacion: -2.8, unidad: 'kg' },
  { op: 'OP-2025-047', mp: 'MP-011 Retardante', loteMP: 'L2025-053', planificado: 25, real: 25, diferencia: 0, desviacion: 0.0, unidad: 'kg' },
  { op: 'OP-2025-048', mp: 'MP-003 Plastificante', loteMP: 'L2025-058', planificado: 60, real: 66, diferencia: 6, desviacion: 10.0, unidad: 'L' },
  { op: 'OP-2025-043', mp: 'MP-005 CaCO3', loteMP: 'L2025-062', planificado: 180, real: 176, diferencia: -4, desviacion: -2.2, unidad: 'kg' },
  { op: 'OP-2025-044', mp: 'EMP-001 Caja corrugada', loteMP: 'L2025-064', planificado: 500, real: 500, diferencia: 0, desviacion: 0.0, unidad: 'un' },
  { op: 'OP-2025-045', mp: 'MP-007 Lubricante', loteMP: 'L2025-055', planificado: 8, real: 8.9, diferencia: 0.9, desviacion: 11.3, unidad: 'kg' },
  { op: 'OP-2025-046', mp: 'MP-002 Pigmento azul', loteMP: 'L2025-045', planificado: 14, real: 14, diferencia: 0, desviacion: 0.0, unidad: 'kg' },
  { op: 'OP-2025-047', mp: 'MP-009 Cera parafínica', loteMP: 'L2025-061', planificado: 22, real: 24.5, diferencia: 2.5, desviacion: 11.4, unidad: 'kg' },
]

const REPOSICIONES: Reposicion[] = [
  { id: 1, mp: 'MP-004 Estabilizante Ca-Zn', cantSolicitada: 300, cantActual: 42, puntoReorden: 150, prioridad: 'URGENTE', estado: 'PENDIENTE' },
  { id: 2, mp: 'MP-008 Agente soplado ADCA', cantSolicitada: 200, cantActual: 28, puntoReorden: 80, prioridad: 'URGENTE', estado: 'EN PROCESO' },
  { id: 3, mp: 'MP-010 Antioxidante Irganox', cantSolicitada: 120, cantActual: 15, puntoReorden: 60, prioridad: 'URGENTE', estado: 'PENDIENTE' },
  { id: 4, mp: 'MP-002 Pigmento azul cobalto', cantSolicitada: 400, cantActual: 180, puntoReorden: 200, prioridad: 'ALTA', estado: 'EN PROCESO' },
  { id: 5, mp: 'MP-006 Dióxido de titanio', cantSolicitada: 250, cantActual: 95, puntoReorden: 120, prioridad: 'ALTA', estado: 'PENDIENTE' },
  { id: 6, mp: 'MP-001 Resina PVC', cantSolicitada: 2000, cantActual: 2400, puntoReorden: 2500, prioridad: 'NORMAL', estado: 'RECIBIDO' },
  { id: 7, mp: 'EMP-001 Caja corrugada', cantSolicitada: 5000, cantActual: 3800, puntoReorden: 4000, prioridad: 'NORMAL', estado: 'PENDIENTE' },
  { id: 8, mp: 'MP-003 Plastificante DEHP', cantSolicitada: 800, cantActual: 850, puntoReorden: 900, prioridad: 'NORMAL', estado: 'EN PROCESO' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const estadoWIPColor = (e: 'OK' | 'ALERTA' | 'CRITICO') =>
  ({ OK: '#32AC5C', ALERTA: '#EAB308', CRITICO: '#EF4444' })[e]

const estadoMPColor = (e: 'OK' | 'BAJO' | 'CRITICO') =>
  ({ OK: '#32AC5C', BAJO: '#EAB308', CRITICO: '#EF4444' })[e]

const prioridadColor = (p: 'URGENTE' | 'ALTA' | 'NORMAL') =>
  ({ URGENTE: '#EF4444', ALTA: '#F97316', NORMAL: '#0891B2' })[p]

const estadoRepColor = (e: 'PENDIENTE' | 'EN PROCESO' | 'RECIBIDO') =>
  ({ PENDIENTE: '#EAB308', 'EN PROCESO': '#F97316', RECIBIDO: '#32AC5C' })[e]

// ─── Component ────────────────────────────────────────────────────────────────
export default function MESInventario() {
  const [tab, setTab] = useState(0)
  const [wmsEnviado, setWmsEnviado] = useState(false)

  const tabSx = {
    '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 },
    '& .Mui-selected': { color: MES_COLOR },
    '& .MuiTabs-indicator': { backgroundColor: MES_COLOR },
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.15), color: MES_COLOR }}>
            <InventoryIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">MES — WIP & Materiales</Typography>
            <Typography variant="body2" color="grey.400">Control de inventario en proceso, materias primas y reposición</Typography>
          </Box>
          <Box ml="auto">
            <Chip label="● En tiempo real" size="small" sx={{ background: alpha(MES_COLOR, 0.15), color: MES_COLOR, fontWeight: 700 }} />
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabSx}>
            {['WIP por Celda', 'Materias Primas', 'Consumos', 'Reposición'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: WIP por Celda ─────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            {/* KPIs */}
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'WIP Total', value: '4,820 un', icon: <InventoryIcon />, color: MES_COLOR },
                { label: 'Valor WIP', value: '$84M COP', icon: <ScienceIcon />, color: '#10B981' },
                { label: 'Celdas con acumulación', value: '3', icon: <WarnIcon />, color: '#F97316' },
                { label: 'Lead Time promedio', value: '6.2h', icon: <LoopIcon />, color: '#8B5CF6' },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, md: 3 }}>
                  <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.color, 0.12), color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Visual planta */}
            <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}`, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} color="white" mb={2}>Vista de Planta — WIP por Celda</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                  {CELDAS_LAYOUT.map((c, i) => {
                    const color = estadoWIPColor(c.estado)
                    const pct = Math.min((c.wip / c.max) * 100, 100)
                    return (
                      <Box key={i} sx={{ p: 2, borderRadius: 2, background: alpha(color, 0.05), border: `2px solid ${alpha(color, 0.5)}`, textAlign: 'center', position: 'relative' }}>
                        <Typography variant="caption" color="grey.400" fontWeight={600}>{c.nombre}</Typography>
                        <Typography variant="h5" fontWeight={800} color={color} display="block">{c.wip.toLocaleString('es-CO')}</Typography>
                        <Typography variant="caption" color="grey.500">unidades</Typography>
                        <Box sx={{ mt: 1, height: 6, borderRadius: 3, background: alpha('#fff', 0.08) }}>
                          <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color }} />
                        </Box>
                        <Box sx={{ mt: 1, width: 10, height: 10, borderRadius: '50%', background: color, mx: 'auto', boxShadow: `0 0 8px ${color}` }} />
                      </Box>
                    )
                  })}
                </Box>
              </CardContent>
            </Card>

            {/* Tabla WIP */}
            <TableContainer component={Paper} sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                    <TableCell>Celda</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>UM</TableCell>
                    <TableCell>Fecha Entrada</TableCell>
                    <TableCell>Tiempo Acum.</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell>OP Asignada</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {WIP_TABLA.map((row, i) => {
                    const color = estadoWIPColor(row.estado)
                    return (
                      <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                        <TableCell><Typography variant="body2" fontWeight={700} color={MES_COLOR}>{row.celda}</Typography></TableCell>
                        <TableCell>{row.producto}</TableCell>
                        <TableCell align="right"><Typography fontWeight={700}>{row.cantidad.toLocaleString('es-CO')}</Typography></TableCell>
                        <TableCell>{row.unidad}</TableCell>
                        <TableCell><Typography variant="caption" color="grey.400">{row.fechaEntrada}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color={row.estado !== 'OK' ? '#EAB308' : 'grey.300'}>{row.tiempoAcumulado}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip label={row.estado} size="small" sx={{ background: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" color="grey.400" fontFamily="monospace">{row.op}</Typography></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 1: Materias Primas ───────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'MPs en stock', value: '48 referencias', icon: <ScienceIcon />, color: MES_COLOR },
                { label: 'Valor total', value: '$420M COP', icon: <InventoryIcon />, color: '#10B981' },
                { label: 'MPs bajo mínimo', value: '5', icon: <WarnIcon />, color: '#EAB308' },
                { label: 'Lotes por vencer', value: '3', icon: <ErrorIcon />, color: '#EF4444' },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, md: 3 }}>
                  <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.color, 0.12), color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TableContainer component={Paper} sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="right">Stock Actual</TableCell>
                    <TableCell align="right">Stock Mínimo</TableCell>
                    <TableCell>UM</TableCell>
                    <TableCell>Lote Activo</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell>Proveedor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MATERIAS_PRIMAS.map((mp, i) => {
                    const color = estadoMPColor(mp.estado)
                    return (
                      <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                        <TableCell><Typography variant="caption" color={MES_COLOR} fontFamily="monospace" fontWeight={700}>{mp.codigo}</Typography></TableCell>
                        <TableCell>{mp.nombre}</TableCell>
                        <TableCell align="right"><Typography fontWeight={700} color={mp.stockActual < mp.stockMinimo ? '#EF4444' : 'grey.200'}>{mp.stockActual.toLocaleString('es-CO')}</Typography></TableCell>
                        <TableCell align="right"><Typography color="grey.400">{mp.stockMinimo.toLocaleString('es-CO')}</Typography></TableCell>
                        <TableCell>{mp.unidad}</TableCell>
                        <TableCell><Typography variant="caption" color="grey.400" fontFamily="monospace">{mp.loteActivo}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color={mp.fechaVencimiento < '2025-09-01' && mp.fechaVencimiento !== 'N/A' ? '#EAB308' : 'grey.400'}>{mp.fechaVencimiento}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip label={mp.estado} size="small" sx={{ background: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" color="grey.400">{mp.proveedor}</Typography></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 2: Consumos ──────────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Consumo total día', value: '$18.4M COP', color: MES_COLOR },
                { label: 'Desviación promedio', value: '+2.3%', color: '#EAB308' },
                { label: 'MPs desviación >5%', value: '4', color: '#EF4444' },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, md: 4 }}>
                  <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="h5" fontWeight={700} color={k.color}>{k.value}</Typography>
                      <Typography variant="caption" color="grey.400">{k.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TableContainer component={Paper} sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                    <TableCell>OP</TableCell>
                    <TableCell>Materia Prima</TableCell>
                    <TableCell>Lote MP</TableCell>
                    <TableCell align="right">Planificado</TableCell>
                    <TableCell align="right">Real</TableCell>
                    <TableCell align="right">Diferencia</TableCell>
                    <TableCell align="center">% Desviación</TableCell>
                    <TableCell>UM</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {CONSUMOS.map((c, i) => {
                    const desColor = Math.abs(c.desviacion) > 10 ? '#EF4444' : Math.abs(c.desviacion) > 5 ? '#EAB308' : '#32AC5C'
                    return (
                      <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                        <TableCell><Typography variant="caption" color={MES_COLOR} fontFamily="monospace" fontWeight={700}>{c.op}</Typography></TableCell>
                        <TableCell>{c.mp}</TableCell>
                        <TableCell><Typography variant="caption" color="grey.400" fontFamily="monospace">{c.loteMP}</Typography></TableCell>
                        <TableCell align="right">{c.planificado}</TableCell>
                        <TableCell align="right"><Typography fontWeight={600}>{c.real}</Typography></TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700} color={c.diferencia > 0 ? '#F97316' : c.diferencia < 0 ? '#3B82F6' : 'grey.400'}>
                            {c.diferencia > 0 ? '+' : ''}{c.diferencia}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${c.desviacion > 0 ? '+' : ''}${c.desviacion.toFixed(1)}%`}
                            size="small"
                            sx={{ background: alpha(desColor, 0.15), color: desColor, fontWeight: 700, fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell><Typography variant="caption" color="grey.500">{c.unidad}</Typography></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 3: Reposición ────────────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ShipIcon sx={{ color: MES_COLOR }} />
                <Typography variant="h6" color="white" fontWeight={700}>Solicitudes de Reposición</Typography>
              </Stack>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => setWmsEnviado(true)}
                disabled={wmsEnviado}
                sx={{
                  background: wmsEnviado ? alpha('#32AC5C', 0.2) : alpha(MES_COLOR, 0.2),
                  color: wmsEnviado ? '#32AC5C' : MES_COLOR,
                  border: `1px solid ${wmsEnviado ? '#32AC5C' : MES_COLOR}`,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { background: alpha(MES_COLOR, 0.3) },
                  '&.Mui-disabled': { color: '#32AC5C', border: '1px solid #32AC5C', background: alpha('#32AC5C', 0.15) },
                }}
              >
                {wmsEnviado ? '✓ Enviado a WMS' : 'Enviar a WMS'}
              </Button>
            </Stack>

            <Grid container spacing={2}>
              {REPOSICIONES.map((r) => {
                const prioColor = prioridadColor(r.prioridad)
                const estColor = estadoRepColor(r.estado)
                const pct = Math.min((r.cantActual / r.puntoReorden) * 100, 100)
                return (
                  <Grid key={r.id} size={{ xs: 12, md: 6 }}>
                    <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(prioColor, 0.35)}` }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Typography variant="body1" fontWeight={700} color="white" sx={{ flex: 1, mr: 1 }}>{r.mp}</Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip label={r.prioridad} size="small" sx={{ background: alpha(prioColor, 0.15), color: prioColor, fontWeight: 700, fontSize: 10 }} />
                            <Chip label={r.estado} size="small" sx={{ background: alpha(estColor, 0.15), color: estColor, fontSize: 10 }} />
                          </Stack>
                        </Stack>
                        <Grid container spacing={2} mb={1.5}>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="grey.400">Stock actual</Typography>
                            <Typography variant="body2" fontWeight={700} color={r.cantActual < r.puntoReorden ? '#EF4444' : 'grey.200'}>{r.cantActual}</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="grey.400">Pto. reorden</Typography>
                            <Typography variant="body2" fontWeight={600} color="grey.300">{r.puntoReorden}</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="grey.400">Solicitado</Typography>
                            <Typography variant="body2" fontWeight={700} color={MES_COLOR}>{r.cantSolicitada}</Typography>
                          </Grid>
                        </Grid>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="grey.500">Nivel de stock vs punto reorden</Typography>
                            <Typography variant="caption" color={pct < 50 ? '#EF4444' : '#EAB308'}>{pct.toFixed(0)}%</Typography>
                          </Stack>
                          <Box sx={{ height: 6, borderRadius: 3, background: alpha('#fff', 0.08) }}>
                            <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct < 50 ? '#EF4444' : '#EAB308' }} />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
