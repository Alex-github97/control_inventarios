import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, alpha, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Snackbar, Alert, InputAdornment, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Inventory as InventoryIcon,
  Science as ScienceIcon,
  LocalShipping as ShipIcon,
  Loop as LoopIcon,
  Warning as WarnIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  SwapVert as AdjustIcon,
  Place as PlaceIcon,
  LocalOffer as LotIcon,
  History as HistoryIcon,
  Factory as FactoryIcon,
  TrendingFlat as MoveIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const HOY = '2026-07-07'

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

type TipoItem = 'MATERIA PRIMA' | 'EMPAQUE' | 'PRODUCTO TERMINADO'
type EstadoItem = 'OK' | 'BAJO' | 'CRITICO'

interface ItemInv {
  codigo: string
  nombre: string
  tipo: TipoItem
  stockActual: number
  stockMinimo: number
  puntoReorden: number
  unidad: string
  costoUnitario: number
  loteActivo: string
  fechaVencimiento: string
  estado: EstadoItem
  proveedor: string
  ubicacion: string
}

interface Lote {
  codigo: string
  cantidad: number
  fechaVenc: string
  estado: 'OK' | 'POR VENCER' | 'VENCIDO'
}

interface Movimiento {
  fecha: string
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  cantidad: number
  ref: string
  responsable: string
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

// ─── Catálogos / opciones de dominio ───────────────────────────────────────────
const UBICACIONES = ['Almacén MP - Bogotá', 'Almacén MP - Medellín', 'Bodega WIP', 'Almacén PT', 'Zona Cuarentena']
const UNIDADES = ['kg', 'L', 'un', 'kit', 'm']
const TIPOS_ITEM: TipoItem[] = ['MATERIA PRIMA', 'EMPAQUE', 'PRODUCTO TERMINADO']
const MOTIVOS = ['Recepción de compra', 'Consumo de producción', 'Conteo cíclico', 'Merma / desperdicio', 'Devolución a proveedor', 'Reclasificación']
const RESPONSABLES = ['Recepción MP', 'Producción', 'Inventarios', 'Calidad', 'Almacén PT']
const PROVEEDORES = [
  'Plastinova SAS', 'Colorantes del Norte', 'QuímicaCol Ltda', 'Additech SA', 'Minercol SA',
  'Pigmentos Int.', 'Lubrinova SAS', 'Foamtec Ltda', 'Refinería del Centro', 'BASF Colombia',
  'FlameGuard SA', 'Cartones del Valle', 'Producción interna',
]

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

const INVENTARIO_MOCK: ItemInv[] = [
  { codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', tipo: 'MATERIA PRIMA', stockActual: 2400, stockMinimo: 1000, puntoReorden: 2500, unidad: 'kg', costoUnitario: 4200, loteActivo: 'L2025-060', fechaVencimiento: '2026-12-31', estado: 'OK', proveedor: 'Plastinova SAS', ubicacion: 'Almacén MP - Bogotá' },
  { codigo: 'MP-002', nombre: 'Pigmento azul cobalto', tipo: 'MATERIA PRIMA', stockActual: 180, stockMinimo: 200, puntoReorden: 220, unidad: 'kg', costoUnitario: 38000, loteActivo: 'L2025-045', fechaVencimiento: '2026-09-15', estado: 'BAJO', proveedor: 'Colorantes del Norte', ubicacion: 'Almacén MP - Bogotá' },
  { codigo: 'MP-003', nombre: 'Plastificante DEHP', tipo: 'MATERIA PRIMA', stockActual: 850, stockMinimo: 400, puntoReorden: 500, unidad: 'L', costoUnitario: 6800, loteActivo: 'L2025-058', fechaVencimiento: '2026-09-30', estado: 'OK', proveedor: 'QuímicaCol Ltda', ubicacion: 'Almacén MP - Bogotá' },
  { codigo: 'MP-004', nombre: 'Estabilizante térmico Ca-Zn', tipo: 'MATERIA PRIMA', stockActual: 42, stockMinimo: 150, puntoReorden: 200, unidad: 'kg', costoUnitario: 15200, loteActivo: 'L2025-032', fechaVencimiento: '2026-07-01', estado: 'CRITICO', proveedor: 'Additech SA', ubicacion: 'Almacén MP - Bogotá' },
  { codigo: 'MP-005', nombre: 'Carbonato de calcio industrial', tipo: 'MATERIA PRIMA', stockActual: 5200, stockMinimo: 2000, puntoReorden: 2500, unidad: 'kg', costoUnitario: 900, loteActivo: 'L2025-062', fechaVencimiento: '2027-01-01', estado: 'OK', proveedor: 'Minercol SA', ubicacion: 'Almacén MP - Medellín' },
  { codigo: 'MP-006', nombre: 'Dióxido de titanio (TiO2)', tipo: 'MATERIA PRIMA', stockActual: 95, stockMinimo: 120, puntoReorden: 150, unidad: 'kg', costoUnitario: 22000, loteActivo: 'L2025-040', fechaVencimiento: '2026-08-20', estado: 'BAJO', proveedor: 'Pigmentos Int.', ubicacion: 'Almacén MP - Bogotá' },
  { codigo: 'MP-007', nombre: 'Lubricante esteárico', tipo: 'MATERIA PRIMA', stockActual: 680, stockMinimo: 300, puntoReorden: 350, unidad: 'kg', costoUnitario: 5400, loteActivo: 'L2025-055', fechaVencimiento: '2027-06-10', estado: 'OK', proveedor: 'Lubrinova SAS', ubicacion: 'Almacén MP - Medellín' },
  { codigo: 'MP-008', nombre: 'Agente de soplado ADCA', tipo: 'MATERIA PRIMA', stockActual: 28, stockMinimo: 80, puntoReorden: 90, unidad: 'kg', costoUnitario: 18500, loteActivo: 'L2025-028', fechaVencimiento: '2026-07-15', estado: 'CRITICO', proveedor: 'Foamtec Ltda', ubicacion: 'Zona Cuarentena' },
  { codigo: 'MP-009', nombre: 'Cera parafínica 52-54°C', tipo: 'MATERIA PRIMA', stockActual: 1100, stockMinimo: 500, puntoReorden: 600, unidad: 'kg', costoUnitario: 3100, loteActivo: 'L2025-061', fechaVencimiento: '2027-06-01', estado: 'OK', proveedor: 'Refinería del Centro', ubicacion: 'Almacén MP - Medellín' },
  { codigo: 'MP-010', nombre: 'Antioxidante Irganox 1010', tipo: 'MATERIA PRIMA', stockActual: 15, stockMinimo: 60, puntoReorden: 70, unidad: 'kg', costoUnitario: 45000, loteActivo: 'L2025-021', fechaVencimiento: '2026-08-01', estado: 'CRITICO', proveedor: 'BASF Colombia', ubicacion: 'Almacén MP - Bogotá' },
  { codigo: 'MP-011', nombre: 'Retardante de llama DBDPE', tipo: 'MATERIA PRIMA', stockActual: 420, stockMinimo: 200, puntoReorden: 220, unidad: 'kg', costoUnitario: 12800, loteActivo: 'L2025-053', fechaVencimiento: '2026-09-30', estado: 'OK', proveedor: 'FlameGuard SA', ubicacion: 'Almacén MP - Bogotá' },
  { codigo: 'EMP-001', nombre: 'Caja corrugada 30x20x15cm', tipo: 'EMPAQUE', stockActual: 3800, stockMinimo: 2000, puntoReorden: 4000, unidad: 'un', costoUnitario: 1800, loteActivo: 'L2025-064', fechaVencimiento: 'N/A', estado: 'OK', proveedor: 'Cartones del Valle', ubicacion: 'Almacén PT' },
  { codigo: 'PT-001', nombre: 'Producto Base terminado', tipo: 'PRODUCTO TERMINADO', stockActual: 3200, stockMinimo: 1000, puntoReorden: 1500, unidad: 'un', costoUnitario: 18500, loteActivo: 'L2025-070', fechaVencimiento: '2026-12-31', estado: 'OK', proveedor: 'Producción interna', ubicacion: 'Almacén PT' },
  { codigo: 'PT-002', nombre: 'Producto Plus terminado', tipo: 'PRODUCTO TERMINADO', stockActual: 640, stockMinimo: 800, puntoReorden: 1000, unidad: 'un', costoUnitario: 26800, loteActivo: 'L2025-071', fechaVencimiento: '2026-11-30', estado: 'BAJO', proveedor: 'Producción interna', ubicacion: 'Almacén PT' },
  { codigo: 'PT-003', nombre: 'Modelo X terminado', tipo: 'PRODUCTO TERMINADO', stockActual: 210, stockMinimo: 500, puntoReorden: 700, unidad: 'kg', costoUnitario: 31000, loteActivo: 'L2025-072', fechaVencimiento: '2026-10-15', estado: 'CRITICO', proveedor: 'Producción interna', ubicacion: 'Almacén PT' },
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

const REPOSICIONES_MOCK: Reposicion[] = [
  { id: 1, mp: 'MP-004 Estabilizante Ca-Zn', cantSolicitada: 300, cantActual: 42, puntoReorden: 150, prioridad: 'URGENTE', estado: 'PENDIENTE' },
  { id: 2, mp: 'MP-008 Agente soplado ADCA', cantSolicitada: 200, cantActual: 28, puntoReorden: 80, prioridad: 'URGENTE', estado: 'EN PROCESO' },
  { id: 3, mp: 'MP-010 Antioxidante Irganox', cantSolicitada: 120, cantActual: 15, puntoReorden: 60, prioridad: 'URGENTE', estado: 'PENDIENTE' },
  { id: 4, mp: 'MP-002 Pigmento azul cobalto', cantSolicitada: 400, cantActual: 180, puntoReorden: 200, prioridad: 'ALTA', estado: 'EN PROCESO' },
  { id: 5, mp: 'MP-006 Dióxido de titanio', cantSolicitada: 250, cantActual: 95, puntoReorden: 120, prioridad: 'ALTA', estado: 'PENDIENTE' },
  { id: 6, mp: 'MP-001 Resina PVC', cantSolicitada: 2000, cantActual: 2400, puntoReorden: 2500, prioridad: 'NORMAL', estado: 'RECIBIDO' },
  { id: 7, mp: 'EMP-001 Caja corrugada', cantSolicitada: 5000, cantActual: 3800, puntoReorden: 4000, prioridad: 'NORMAL', estado: 'PENDIENTE' },
  { id: 8, mp: 'MP-003 Plastificante DEHP', cantSolicitada: 800, cantActual: 850, puntoReorden: 900, prioridad: 'NORMAL', estado: 'EN PROCESO' },
]

// ─── Helpers de color ───────────────────────────────────────────────────────────
const estadoWIPColor = (e: 'OK' | 'ALERTA' | 'CRITICO') =>
  ({ OK: '#16A34A', ALERTA: '#EAB308', CRITICO: '#EF4444' })[e]

const estadoMPColor = (e: EstadoItem) =>
  ({ OK: '#16A34A', BAJO: '#EAB308', CRITICO: '#EF4444' })[e]

const prioridadColor = (p: 'URGENTE' | 'ALTA' | 'NORMAL') =>
  ({ URGENTE: '#EF4444', ALTA: '#F97316', NORMAL: MES_COLOR })[p]

const estadoRepColor = (e: 'PENDIENTE' | 'EN PROCESO' | 'RECIBIDO') =>
  ({ PENDIENTE: '#EAB308', 'EN PROCESO': '#F97316', RECIBIDO: '#16A34A' })[e]

const tipoItemColor = (t: TipoItem) =>
  ({ 'MATERIA PRIMA': MES_COLOR, EMPAQUE: '#8B5CF6', 'PRODUCTO TERMINADO': '#10B981' })[t]

const movTipoColor = (t: Movimiento['tipo']) =>
  ({ ENTRADA: '#16A34A', SALIDA: '#F97316', AJUSTE: '#3B82F6' })[t]

const loteEstadoColor = (e: Lote['estado']) =>
  ({ OK: '#16A34A', 'POR VENCER': '#EAB308', VENCIDO: '#EF4444' })[e]

const calcEstado = (stock: number, min: number): EstadoItem =>
  stock < min * 0.5 ? 'CRITICO' : stock < min ? 'BAJO' : 'OK'

// ─── Datos derivados por ítem ──────────────────────────────────────────────────
function lotesDe(it: ItemInv): Lote[] {
  const estadoLote = (v: string): Lote['estado'] =>
    v === 'N/A' ? 'OK' : v < HOY ? 'VENCIDO' : v < '2026-10-01' ? 'POR VENCER' : 'OK'
  if (it.fechaVencimiento === 'N/A') {
    return [{ codigo: it.loteActivo, cantidad: it.stockActual, fechaVenc: 'N/A', estado: 'OK' }]
  }
  const c1 = Math.round(it.stockActual * 0.62)
  const c2 = it.stockActual - c1
  const lotes: Lote[] = [
    { codigo: it.loteActivo, cantidad: c1, fechaVenc: it.fechaVencimiento, estado: estadoLote(it.fechaVencimiento) },
  ]
  if (c2 > 0) {
    const y = Number(it.fechaVencimiento.slice(0, 4)) + 1
    const segVenc = `${y}${it.fechaVencimiento.slice(4)}`
    lotes.push({
      codigo: it.loteActivo.replace(/(\d+)$/, (m) => String(Number(m) + 6).padStart(m.length, '0')),
      cantidad: c2,
      fechaVenc: segVenc,
      estado: estadoLote(segVenc),
    })
  }
  return lotes
}

function ubicacionesDe(it: ItemInv): { ubicacion: string; cantidad: number }[] {
  const c1 = Math.round(it.stockActual * 0.7)
  const c2 = it.stockActual - c1
  const sec = it.tipo === 'PRODUCTO TERMINADO'
    ? 'Bodega WIP'
    : it.ubicacion.includes('Bogotá') ? 'Almacén MP - Medellín' : 'Almacén MP - Bogotá'
  return c2 > 0
    ? [{ ubicacion: it.ubicacion, cantidad: c1 }, { ubicacion: sec, cantidad: c2 }]
    : [{ ubicacion: it.ubicacion, cantidad: c1 }]
}

function movimientosDe(it: ItemInv): Movimiento[] {
  const r = (n: number) => Math.max(1, Math.round(n))
  const suf = it.codigo.replace(/\D/g, '').slice(-3).padStart(3, '0')
  return [
    { fecha: '2026-07-05', tipo: 'ENTRADA', cantidad: r(it.puntoReorden * 0.9), ref: `OC-2026-${suf}`, responsable: 'Recepción MP' },
    { fecha: '2026-07-04', tipo: 'SALIDA', cantidad: -r(it.stockMinimo * 0.4), ref: 'OP-2025-046', responsable: 'Producción' },
    { fecha: '2026-07-03', tipo: 'SALIDA', cantidad: -r(it.stockMinimo * 0.3), ref: 'OP-2025-043', responsable: 'Producción' },
    { fecha: '2026-07-01', tipo: 'AJUSTE', cantidad: -r(it.stockMinimo * 0.05), ref: 'AJ-2026-014', responsable: 'Inventarios' },
    { fecha: '2026-06-28', tipo: 'ENTRADA', cantidad: r(it.puntoReorden * 0.5), ref: `OC-2026-0${suf.slice(-2)}`, responsable: 'Recepción MP' },
  ]
}

// ─── Estilos de inputs (tema claro, acento MES) ────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B' },
  '& label': { color: '#64748B' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.25) },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.5) },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
}

// ─── Tile reutilizable ─────────────────────────────────────────────────────────
function InfoTile({ label, value, color = '#1E293B' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25, border: '1px solid #E5E7EB' }}>
      <Typography fontSize={10} color="#64748B" fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
      <Typography fontSize={13} fontWeight={700} sx={{ color }}>{value}</Typography>
    </Box>
  )
}

interface NewItemForm {
  nombre: string
  tipo: TipoItem | ''
  unidad: string
  proveedor: string
  ubicacion: string
  stockActual: string
  stockMinimo: string
  puntoReorden: string
  costoUnitario: string
  loteActivo: string
  fechaVencimiento: string
}

const EMPTY_ITEM: NewItemForm = {
  nombre: '', tipo: '', unidad: '', proveedor: '', ubicacion: '',
  stockActual: '', stockMinimo: '', puntoReorden: '', costoUnitario: '',
  loteActivo: '', fechaVencimiento: '',
}

interface AdjustForm {
  codigo: string
  tipoMov: Movimiento['tipo']
  cantidad: string
  motivo: string
  responsable: string
}

const EMPTY_ADJUST: AdjustForm = { codigo: '', tipoMov: 'ENTRADA', cantidad: '', motivo: '', responsable: '' }

// ─── Component ────────────────────────────────────────────────────────────────
export default function MESInventario() {
  const [tab, setTab] = useState(0)
  const [inventario, setInventario] = useState<ItemInv[]>(INVENTARIO_MOCK)
  const [reposiciones, setReposiciones] = useState<Reposicion[]>(REPOSICIONES_MOCK)
  const [movsManual, setMovsManual] = useState<Record<string, Movimiento[]>>({})
  const [wmsEnviado, setWmsEnviado] = useState(false)

  // Filtros de inventario
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [filterUbic, setFilterUbic] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')

  // Detalle / selección
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [selectedWIP, setSelectedWIP] = useState<WIPCelda | null>(null)
  const [selectedConsumo, setSelectedConsumo] = useState<ConsumosDia | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<Reposicion | null>(null)

  // Diálogos de formulario
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<NewItemForm>(EMPTY_ITEM)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustForm, setAdjustForm] = useState<AdjustForm>(EMPTY_ADJUST)
  const [adjustTried, setAdjustTried] = useState(false)

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev })

  const tabSx = {
    '& .MuiTab-root': { color: '#94A3B8', textTransform: 'none', fontWeight: 600 },
    '& .Mui-selected': { color: MES_COLOR },
    '& .MuiTabs-indicator': { backgroundColor: MES_COLOR },
  }

  const selectedItem = useMemo(() => inventario.find((i) => i.codigo === selectedCode) ?? null, [inventario, selectedCode])

  // KPIs dinámicos de inventario
  const invStats = useMemo(() => {
    const valorTotal = inventario.reduce((s, i) => s + i.stockActual * i.costoUnitario, 0)
    const bajoMin = inventario.filter((i) => i.stockActual < i.stockMinimo).length
    const porVencer = inventario.filter((i) => i.fechaVencimiento !== 'N/A' && i.fechaVencimiento >= HOY && i.fechaVencimiento < '2026-10-01').length
    return { refs: inventario.length, valorTotal, bajoMin, porVencer }
  }, [inventario])

  const ubicacionesFiltro = useMemo(() => Array.from(new Set(inventario.map((i) => i.ubicacion))), [inventario])

  const filteredInv = useMemo(() => inventario.filter((it) => {
    if (filterTipo !== 'Todos' && it.tipo !== filterTipo) return false
    if (filterUbic !== 'Todos' && it.ubicacion !== filterUbic) return false
    if (filterEstado !== 'Todos' && it.estado !== filterEstado) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!it.codigo.toLowerCase().includes(q) && !it.nombre.toLowerCase().includes(q) && !it.proveedor.toLowerCase().includes(q)) return false
    }
    return true
  }), [inventario, filterTipo, filterUbic, filterEstado, search])

  const hayFiltros = search || filterTipo !== 'Todos' || filterUbic !== 'Todos' || filterEstado !== 'Todos'
  const resetFiltros = () => { setSearch(''); setFilterTipo('Todos'); setFilterUbic('Todos'); setFilterEstado('Todos') }

  // ── Crear ítem ──
  const setField = (f: keyof NewItemForm, v: string) => setForm((p) => ({ ...p, [f]: v }))
  const openCreate = () => { setForm(EMPTY_ITEM); setTriedSubmit(false); setCreateOpen(true) }
  const onTipoChange = (t: TipoItem) => {
    const ubicDefault = t === 'PRODUCTO TERMINADO' ? 'Almacén PT' : t === 'EMPAQUE' ? 'Almacén PT' : 'Almacén MP - Bogotá'
    const provDefault = t === 'PRODUCTO TERMINADO' ? 'Producción interna' : ''
    setForm((p) => ({ ...p, tipo: t, ubicacion: p.ubicacion || ubicDefault, proveedor: provDefault || p.proveedor }))
  }
  const createValid = form.nombre.trim() && form.tipo && form.unidad
  const handleCreate = () => {
    if (!createValid) { setTriedSubmit(true); notify('Complete los obligatorios: nombre, tipo y unidad', 'warning'); return }
    const prefijo = form.tipo === 'PRODUCTO TERMINADO' ? 'PT' : form.tipo === 'EMPAQUE' ? 'EMP' : 'MP'
    const n = inventario.filter((i) => i.codigo.startsWith(prefijo)).length + 1
    const stock = Number(form.stockActual) || 0
    const min = Number(form.stockMinimo) || 0
    const nuevo: ItemInv = {
      codigo: `${prefijo}-${String(n).padStart(3, '0')}`,
      nombre: form.nombre.trim(),
      tipo: form.tipo as TipoItem,
      stockActual: stock,
      stockMinimo: min,
      puntoReorden: Number(form.puntoReorden) || min,
      unidad: form.unidad,
      costoUnitario: Number(form.costoUnitario) || 0,
      loteActivo: form.loteActivo.trim() || 'L2026-000',
      fechaVencimiento: form.fechaVencimiento || 'N/A',
      estado: calcEstado(stock, min),
      proveedor: form.proveedor || 'Sin asignar',
      ubicacion: form.ubicacion || 'Almacén MP - Bogotá',
    }
    setInventario((prev) => [nuevo, ...prev])
    setCreateOpen(false)
    notify(`Ítem ${nuevo.codigo} creado correctamente`, 'success')
  }

  // ── Ajuste de inventario ──
  const openAdjust = (codigo = '') => { setAdjustForm({ ...EMPTY_ADJUST, codigo }); setAdjustTried(false); setAdjustOpen(true) }
  const setAdjField = (f: keyof AdjustForm, v: string) => setAdjustForm((p) => ({ ...p, [f]: v }))
  const adjustQty = Number(adjustForm.cantidad)
  const adjustValid = adjustForm.codigo && adjustQty > 0
  const handleAdjust = () => {
    if (!adjustValid) { setAdjustTried(true); notify('Seleccione un ítem y una cantidad válida', 'warning'); return }
    const delta = adjustForm.tipoMov === 'SALIDA' ? -adjustQty : adjustQty
    setInventario((prev) => prev.map((it) => {
      if (it.codigo !== adjustForm.codigo) return it
      const nuevo = Math.max(0, it.stockActual + delta)
      return { ...it, stockActual: nuevo, estado: calcEstado(nuevo, it.stockMinimo) }
    }))
    setMovsManual((prev) => ({
      ...prev,
      [adjustForm.codigo]: [
        { fecha: HOY, tipo: adjustForm.tipoMov, cantidad: delta, ref: `AJ-2026-${String(Math.floor(Math.random() * 900) + 100)}`, responsable: adjustForm.responsable || 'Inventarios' },
        ...(prev[adjustForm.codigo] ?? []),
      ],
    }))
    notify(`Movimiento ${adjustForm.tipoMov} registrado en ${adjustForm.codigo}`, 'success')
    setAdjustOpen(false)
  }

  // ── Reposición ──
  const advanceRepo = (r: Reposicion) => {
    const next: Reposicion['estado'] = r.estado === 'PENDIENTE' ? 'EN PROCESO' : 'RECIBIDO'
    setReposiciones((prev) => prev.map((x) => (x.id === r.id ? { ...x, estado: next } : x)))
    setSelectedRepo((prev) => (prev && prev.id === r.id ? { ...prev, estado: next } : prev))
    notify(`Solicitud ${r.mp.split(' ')[0]} → ${next}`, 'success')
  }

  // Datos derivados del ítem seleccionado
  const lotes = selectedItem ? lotesDe(selectedItem) : []
  const ubics = selectedItem ? ubicacionesDe(selectedItem) : []
  const movimientos = selectedItem ? [...(movsManual[selectedItem.codigo] ?? []), ...movimientosDe(selectedItem)] : []
  const relConsumosWIP = selectedWIP ? CONSUMOS.filter((c) => c.op === selectedWIP.op) : []

  const kpiCardSx = (color: string) => ({ background: '#FFFFFF', border: `1px solid ${alpha(color, 0.3)}`, borderRadius: 2 })
  const paperSx = { background: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.2)}`, borderRadius: 2 }

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3} flexWrap="wrap" gap={2}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.15), color: MES_COLOR }}>
            <InventoryIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1E293B">MES — Inventario de Manufactura</Typography>
            <Typography variant="body2" color="#64748B">Materias primas, WIP y producto terminado · stock, lotes, costos y reposición</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} ml="auto" alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label="● En tiempo real" size="small" sx={{ background: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700 }} />
            <Button
              variant="outlined" startIcon={<ExportIcon />}
              onClick={() => notify('Exportando inventario a Excel...', 'info')}
              sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}
            >
              Exportar
            </Button>
            <Button
              variant="outlined" startIcon={<AdjustIcon />}
              onClick={() => openAdjust()}
              sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}
            >
              Ajuste de inventario
            </Button>
            <Button
              variant="contained" startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
            >
              Nuevo ítem
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabSx}>
            {['WIP por Celda', 'Inventario General', 'Consumos', 'Reposición'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: WIP por Celda ─────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'WIP Total', value: '4,820 un', icon: <InventoryIcon />, color: MES_COLOR },
                { label: 'Valor WIP', value: '$84M COP', icon: <ScienceIcon />, color: '#10B981' },
                { label: 'Celdas con acumulación', value: '3', icon: <WarnIcon />, color: '#F97316' },
                { label: 'Lead Time promedio', value: '6.2h', icon: <LoopIcon />, color: '#8B5CF6' },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, md: 3 }}>
                  <Card sx={kpiCardSx(k.color)}>
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.color, 0.12), color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color={k.color}>{k.value}</Typography>
                          <Typography variant="caption" color="#64748B">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Visual planta */}
            <Card sx={{ ...paperSx, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} color="#1E293B" mb={2}>Vista de Planta — WIP por Celda (clic para ver detalle)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                  {CELDAS_LAYOUT.map((c, i) => {
                    const color = estadoWIPColor(c.estado)
                    const pct = Math.min((c.wip / c.max) * 100, 100)
                    const wipRow = WIP_TABLA.find((w) => `Celda ${w.celda}` === c.nombre)
                    return (
                      <Box
                        key={i}
                        onClick={() => wipRow && setSelectedWIP(wipRow)}
                        sx={{
                          p: 2, borderRadius: 2, background: alpha(color, 0.05), border: `2px solid ${alpha(color, 0.5)}`,
                          textAlign: 'center', cursor: wipRow ? 'pointer' : 'default', transition: 'transform 0.12s, box-shadow 0.12s',
                          '&:hover': wipRow ? { transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(0,0,0,0.10)' } : {},
                        }}
                      >
                        <Typography variant="caption" color="#64748B" fontWeight={600}>{c.nombre}</Typography>
                        <Typography variant="h5" fontWeight={800} color={color} display="block">{c.wip.toLocaleString('es-CO')}</Typography>
                        <Typography variant="caption" color="#94A3B8">unidades</Typography>
                        <Box sx={{ mt: 1, height: 6, borderRadius: 3, background: '#E5E7EB' }}>
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
            <TableContainer component={Paper} sx={paperSx}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB', bgcolor: alpha(MES_COLOR, 0.05) } }}>
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
                      <TableRow
                        key={i}
                        onClick={() => setSelectedWIP(row)}
                        sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: '1px solid #F1F5F9' }, '&:hover': { background: alpha(MES_COLOR, 0.04) } }}
                      >
                        <TableCell><Typography variant="body2" fontWeight={700} color={MES_COLOR}>{row.celda}</Typography></TableCell>
                        <TableCell>{row.producto}</TableCell>
                        <TableCell align="right"><Typography fontWeight={700}>{row.cantidad.toLocaleString('es-CO')}</Typography></TableCell>
                        <TableCell>{row.unidad}</TableCell>
                        <TableCell><Typography variant="caption" color="#64748B">{row.fechaEntrada}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color={row.estado !== 'OK' ? '#CA8A04' : '#334155'}>{row.tiempoAcumulado}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip label={row.estado} size="small" sx={{ background: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" color="#64748B" fontFamily="monospace">{row.op}</Typography></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 1: Inventario General ─────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Referencias en stock', value: `${invStats.refs}`, icon: <ScienceIcon />, color: MES_COLOR },
                { label: 'Valor total inventario', value: fmt(invStats.valorTotal), icon: <InventoryIcon />, color: '#10B981' },
                { label: 'Ítems bajo mínimo', value: `${invStats.bajoMin}`, icon: <WarnIcon />, color: '#EAB308' },
                { label: 'Lotes por vencer', value: `${invStats.porVencer}`, icon: <ErrorIcon />, color: '#EF4444' },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, md: 3 }}>
                  <Card sx={kpiCardSx(k.color)}>
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.color, 0.12), color: k.color }}>{k.icon}</Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" fontWeight={800} color={k.color} noWrap>{k.value}</Typography>
                          <Typography variant="caption" color="#64748B">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Filtros */}
            <Card sx={{ ...paperSx, mb: 2 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                  <TextField
                    size="small" placeholder="Buscar código, nombre o proveedor..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 240, flex: '1 1 240px', ...inputSx }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                  <TextField select size="small" label="Tipo" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} sx={{ minWidth: 175, ...inputSx }}>
                    {['Todos', ...TIPOS_ITEM].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Ubicación" value={filterUbic} onChange={(e) => setFilterUbic(e.target.value)} sx={{ minWidth: 190, ...inputSx }}>
                    {['Todos', ...ubicacionesFiltro].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Estado" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} sx={{ minWidth: 130, ...inputSx }}>
                    {['Todos', 'OK', 'BAJO', 'CRITICO'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                    {filteredInv.length} de {inventario.length} ítems
                  </Typography>
                  {hayFiltros && (
                    <Button size="small" variant="outlined" onClick={resetFiltros}
                      sx={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', '&:hover': { bgcolor: alpha('#EF4444', 0.08), borderColor: '#EF4444' }, fontWeight: 600, fontSize: 11 }}>
                      Limpiar
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <TableContainer component={Paper} sx={paperSx}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB', bgcolor: alpha(MES_COLOR, 0.05) } }}>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Mínimo</TableCell>
                    <TableCell>UM</TableCell>
                    <TableCell>Ubicación</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInv.map((it) => {
                    const color = estadoMPColor(it.estado)
                    const tColor = tipoItemColor(it.tipo)
                    return (
                      <TableRow
                        key={it.codigo}
                        onClick={() => setSelectedCode(it.codigo)}
                        sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: '1px solid #F1F5F9' }, '&:hover': { background: alpha(MES_COLOR, 0.04) } }}
                      >
                        <TableCell><Typography variant="caption" color={MES_COLOR} fontFamily="monospace" fontWeight={700}>{it.codigo}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="#1E293B">{it.nombre}</Typography></TableCell>
                        <TableCell><Chip label={it.tipo} size="small" sx={{ background: alpha(tColor, 0.12), color: tColor, fontWeight: 700, fontSize: 9 }} /></TableCell>
                        <TableCell align="right"><Typography fontWeight={700} color={it.stockActual < it.stockMinimo ? '#EF4444' : '#1E293B'}>{it.stockActual.toLocaleString('es-CO')}</Typography></TableCell>
                        <TableCell align="right"><Typography color="#64748B">{it.stockMinimo.toLocaleString('es-CO')}</Typography></TableCell>
                        <TableCell>{it.unidad}</TableCell>
                        <TableCell><Typography variant="caption" color="#64748B">{it.ubicacion}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color="#16A34A" fontWeight={600}>{fmt(it.stockActual * it.costoUnitario)}</Typography></TableCell>
                        <TableCell align="center"><Chip label={it.estado} size="small" sx={{ background: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10 }} /></TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredInv.length === 0 && (
                    <TableRow><TableCell colSpan={9}><Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 4 }}>No se encontraron ítems con los filtros aplicados.</Typography></TableCell></TableRow>
                  )}
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
                  <Card sx={kpiCardSx(k.color)}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="h5" fontWeight={700} color={k.color}>{k.value}</Typography>
                      <Typography variant="caption" color="#64748B">{k.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TableContainer component={Paper} sx={paperSx}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB', bgcolor: alpha(MES_COLOR, 0.05) } }}>
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
                    const desColor = Math.abs(c.desviacion) > 10 ? '#EF4444' : Math.abs(c.desviacion) > 5 ? '#EAB308' : '#16A34A'
                    return (
                      <TableRow
                        key={i}
                        onClick={() => setSelectedConsumo(c)}
                        sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: '1px solid #F1F5F9' }, '&:hover': { background: alpha(MES_COLOR, 0.04) } }}
                      >
                        <TableCell><Typography variant="caption" color={MES_COLOR} fontFamily="monospace" fontWeight={700}>{c.op}</Typography></TableCell>
                        <TableCell>{c.mp}</TableCell>
                        <TableCell><Typography variant="caption" color="#64748B" fontFamily="monospace">{c.loteMP}</Typography></TableCell>
                        <TableCell align="right">{c.planificado}</TableCell>
                        <TableCell align="right"><Typography fontWeight={600}>{c.real}</Typography></TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700} color={c.diferencia > 0 ? '#F97316' : c.diferencia < 0 ? '#3B82F6' : '#64748B'}>
                            {c.diferencia > 0 ? '+' : ''}{c.diferencia}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${c.desviacion > 0 ? '+' : ''}${c.desviacion.toFixed(1)}%`} size="small" sx={{ background: alpha(desColor, 0.15), color: desColor, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" color="#94A3B8">{c.unidad}</Typography></TableCell>
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
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ShipIcon sx={{ color: MES_COLOR }} />
                <Typography variant="h6" color="#1E293B" fontWeight={700}>Solicitudes de Reposición</Typography>
              </Stack>
              <Button
                variant="contained" startIcon={<RefreshIcon />}
                onClick={() => { setWmsEnviado(true); notify('Solicitudes enviadas a WMS', 'success') }}
                disabled={wmsEnviado}
                sx={{
                  background: wmsEnviado ? alpha('#16A34A', 0.2) : MES_COLOR,
                  color: wmsEnviado ? '#16A34A' : '#FFFFFF',
                  textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                  '&:hover': { background: wmsEnviado ? alpha('#16A34A', 0.2) : MES_DARK },
                  '&.Mui-disabled': { color: '#16A34A', background: alpha('#16A34A', 0.15) },
                }}
              >
                {wmsEnviado ? '✓ Enviado a WMS' : 'Enviar a WMS'}
              </Button>
            </Stack>

            <Grid container spacing={2}>
              {reposiciones.map((r) => {
                const prioColor = prioridadColor(r.prioridad)
                const estColor = estadoRepColor(r.estado)
                const pct = Math.min((r.cantActual / r.puntoReorden) * 100, 100)
                return (
                  <Grid key={r.id} size={{ xs: 12, md: 6 }}>
                    <Card
                      onClick={() => setSelectedRepo(r)}
                      sx={{ background: '#FFFFFF', border: `1px solid ${alpha(prioColor, 0.35)}`, borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.10)', transform: 'translateY(-2px)' } }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Typography variant="body1" fontWeight={700} color="#1E293B" sx={{ flex: 1, mr: 1 }}>{r.mp}</Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip label={r.prioridad} size="small" sx={{ background: alpha(prioColor, 0.15), color: prioColor, fontWeight: 700, fontSize: 10 }} />
                            <Chip label={r.estado} size="small" sx={{ background: alpha(estColor, 0.15), color: estColor, fontWeight: 700, fontSize: 10 }} />
                          </Stack>
                        </Stack>
                        <Grid container spacing={2} mb={1.5}>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="#64748B">Stock actual</Typography>
                            <Typography variant="body2" fontWeight={700} color={r.cantActual < r.puntoReorden ? '#EF4444' : '#1E293B'}>{r.cantActual}</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="#64748B">Pto. reorden</Typography>
                            <Typography variant="body2" fontWeight={600} color="#334155">{r.puntoReorden}</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="#64748B">Solicitado</Typography>
                            <Typography variant="body2" fontWeight={700} color={MES_COLOR}>{r.cantSolicitada}</Typography>
                          </Grid>
                        </Grid>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="#94A3B8">Nivel de stock vs punto reorden</Typography>
                            <Typography variant="caption" color={pct < 50 ? '#EF4444' : '#CA8A04'}>{pct.toFixed(0)}%</Typography>
                          </Stack>
                          <Box sx={{ height: 6, borderRadius: 3, background: '#E5E7EB' }}>
                            <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct < 50 ? '#EF4444' : '#CA8A04' }} />
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

      {/* ── Dialog: DETALLE DE ÍTEM ── */}
      <Dialog open={!!selectedItem} onClose={() => setSelectedCode(null)} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selectedItem && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(tipoItemColor(selectedItem.tipo), 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <InventoryIcon sx={{ color: tipoItemColor(selectedItem.tipo) }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={13} fontWeight={800} color={MES_COLOR} fontFamily="monospace">{selectedItem.codigo}</Typography>
                    <Chip label={selectedItem.tipo} size="small" sx={{ background: alpha(tipoItemColor(selectedItem.tipo), 0.12), color: tipoItemColor(selectedItem.tipo), fontWeight: 700, fontSize: 9 }} />
                    <Chip label={selectedItem.estado} size="small" sx={{ background: alpha(estadoMPColor(selectedItem.estado), 0.15), color: estadoMPColor(selectedItem.estado), fontWeight: 700, fontSize: 9 }} />
                  </Stack>
                  <Typography fontSize={15} fontWeight={700} color="#1E293B">{selectedItem.nombre}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelectedCode(null)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2.5}>
                {/* KPIs */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  <InfoTile label="Stock actual" value={`${selectedItem.stockActual.toLocaleString('es-CO')} ${selectedItem.unidad}`} color={selectedItem.stockActual < selectedItem.stockMinimo ? '#EF4444' : '#1E293B'} />
                  <InfoTile label="Valor en stock" value={fmt(selectedItem.stockActual * selectedItem.costoUnitario)} color="#16A34A" />
                  <InfoTile label="Costo unitario" value={fmt(selectedItem.costoUnitario)} />
                  <InfoTile label="Stock mínimo" value={`${selectedItem.stockMinimo.toLocaleString('es-CO')} ${selectedItem.unidad}`} />
                  <InfoTile label="Punto de reorden" value={`${selectedItem.puntoReorden.toLocaleString('es-CO')} ${selectedItem.unidad}`} color={MES_DARK} />
                  <InfoTile label="Disponible vs reorden" value={`${Math.min(999, Math.round((selectedItem.stockActual / selectedItem.puntoReorden) * 100))}%`} color={selectedItem.stockActual < selectedItem.puntoReorden ? '#CA8A04' : '#16A34A'} />
                </Box>

                {/* Barra stock vs reorden */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={11} color="#64748B">Nivel de stock vs punto de reorden</Typography>
                    <Typography fontSize={11} fontWeight={700} color={selectedItem.stockActual < selectedItem.puntoReorden ? '#CA8A04' : '#16A34A'}>
                      {selectedItem.stockActual.toLocaleString('es-CO')} / {selectedItem.puntoReorden.toLocaleString('es-CO')}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={Math.min(100, (selectedItem.stockActual / selectedItem.puntoReorden) * 100)}
                    sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: selectedItem.stockActual < selectedItem.puntoReorden ? '#CA8A04' : '#16A34A', borderRadius: 5 } }} />
                </Box>

                {/* Ficha */}
                <Box>
                  <Typography fontSize={12} fontWeight={700} color="#1E293B" mb={1} textTransform="uppercase" letterSpacing="0.04em">Ficha del ítem</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                    <InfoTile label="Proveedor" value={selectedItem.proveedor} />
                    <InfoTile label="Unidad de medida" value={selectedItem.unidad} />
                    <InfoTile label="Lote activo" value={selectedItem.loteActivo} />
                    <InfoTile label="Vencimiento" value={selectedItem.fechaVencimiento} color={selectedItem.fechaVencimiento !== 'N/A' && selectedItem.fechaVencimiento < '2026-10-01' ? '#CA8A04' : '#1E293B'} />
                    <InfoTile label="Ubicación principal" value={selectedItem.ubicacion} />
                    <InfoTile label="Tipo" value={selectedItem.tipo} color={tipoItemColor(selectedItem.tipo)} />
                  </Box>
                </Box>

                {/* Stock por ubicación */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <PlaceIcon sx={{ fontSize: 16, color: MES_COLOR }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">Stock por ubicación</Typography>
                  </Stack>
                  <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(MES_COLOR, 0.06) }}>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Ubicación</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Cantidad</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Valor</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ubics.map((u, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{u.ubicacion}</TableCell>
                            <TableCell sx={{ color: '#1E293B', borderColor: '#E5E7EB', fontSize: 12, fontWeight: 600 }} align="right">{u.cantidad.toLocaleString('es-CO')} {selectedItem.unidad}</TableCell>
                            <TableCell sx={{ color: '#16A34A', borderColor: '#E5E7EB', fontSize: 12 }} align="right">{fmt(u.cantidad * selectedItem.costoUnitario)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Lotes */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <LotIcon sx={{ fontSize: 16, color: '#8B5CF6' }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">Lotes ({lotes.length})</Typography>
                  </Stack>
                  <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha('#8B5CF6', 0.06) }}>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Lote</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Cantidad</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Vencimiento</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="center">Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lotes.map((l, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12, fontFamily: 'monospace' }}>{l.codigo}</TableCell>
                            <TableCell sx={{ color: '#1E293B', borderColor: '#E5E7EB', fontSize: 12, fontWeight: 600 }} align="right">{l.cantidad.toLocaleString('es-CO')} {selectedItem.unidad}</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }}>{l.fechaVenc}</TableCell>
                            <TableCell sx={{ borderColor: '#E5E7EB' }} align="center">
                              <Chip label={l.estado} size="small" sx={{ background: alpha(loteEstadoColor(l.estado), 0.15), color: loteEstadoColor(l.estado), fontWeight: 700, fontSize: 9 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Movimientos */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <HistoryIcon sx={{ fontSize: 16, color: MES_DARK }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">Movimientos recientes ({movimientos.length})</Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {movimientos.map((m, i) => (
                      <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25, border: '1px solid #E5E7EB' }}>
                        <MoveIcon sx={{ fontSize: 18, color: movTipoColor(m.tipo) }} />
                        <Box sx={{ minWidth: 90 }}>
                          <Typography fontSize={12} fontWeight={700} color="#1E293B">{m.fecha}</Typography>
                          <Typography fontSize={10} color="#64748B" fontFamily="monospace">{m.ref}</Typography>
                        </Box>
                        <Chip label={m.tipo} size="small" sx={{ background: alpha(movTipoColor(m.tipo), 0.12), color: movTipoColor(m.tipo), fontWeight: 700, fontSize: 9 }} />
                        <Typography fontSize={12} color="#334155" sx={{ flex: 1 }}>{m.responsable}</Typography>
                        <Typography fontSize={13} fontWeight={800} color={m.cantidad >= 0 ? '#16A34A' : '#F97316'}>
                          {m.cantidad >= 0 ? '+' : ''}{m.cantidad.toLocaleString('es-CO')} {selectedItem.unidad}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button startIcon={<ShipIcon />} onClick={() => notify(`Solicitud de reposición creada para ${selectedItem.codigo}`, 'success')}
                sx={{ color: MES_DARK, fontWeight: 600, '&:hover': { bgcolor: alpha(MES_COLOR, 0.08) } }}>
                Solicitar reposición
              </Button>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" onClick={() => setSelectedCode(null)} sx={{ borderColor: '#E5E7EB', color: '#64748B', borderRadius: '10px', fontWeight: 600 }}>Cerrar</Button>
                <Button variant="contained" startIcon={<AdjustIcon />} onClick={() => { const c = selectedItem.codigo; setSelectedCode(null); openAdjust(c) }}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
                  Ajustar inventario
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: DETALLE WIP ── */}
      <Dialog open={!!selectedWIP} onClose={() => setSelectedWIP(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selectedWIP && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(estadoWIPColor(selectedWIP.estado), 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FactoryIcon sx={{ color: estadoWIPColor(selectedWIP.estado) }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>Celda {selectedWIP.celda}</Typography>
                    <Chip label={selectedWIP.estado} size="small" sx={{ background: alpha(estadoWIPColor(selectedWIP.estado), 0.15), color: estadoWIPColor(selectedWIP.estado), fontWeight: 700, fontSize: 9 }} />
                  </Stack>
                  <Typography fontSize={15} fontWeight={700} color="#1E293B">{selectedWIP.producto}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelectedWIP(null)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  <InfoTile label="Cantidad en proceso" value={`${selectedWIP.cantidad.toLocaleString('es-CO')} ${selectedWIP.unidad}`} color={MES_DARK} />
                  <InfoTile label="OP asignada" value={selectedWIP.op} color={MES_COLOR} />
                  <InfoTile label="Tiempo acumulado" value={selectedWIP.tiempoAcumulado} color={selectedWIP.estado !== 'OK' ? '#CA8A04' : '#1E293B'} />
                  <InfoTile label="Fecha de entrada" value={selectedWIP.fechaEntrada} />
                  <InfoTile label="Unidad" value={selectedWIP.unidad} />
                  <InfoTile label="Estado de flujo" value={selectedWIP.estado} color={estadoWIPColor(selectedWIP.estado)} />
                </Box>
                <Box>
                  <Typography fontSize={12} fontWeight={700} color="#1E293B" mb={1} textTransform="uppercase" letterSpacing="0.04em">Consumos asociados a {selectedWIP.op}</Typography>
                  {relConsumosWIP.length === 0 ? (
                    <Typography fontSize={12} color="#94A3B8">No hay consumos registrados para esta OP.</Typography>
                  ) : (
                    <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(MES_COLOR, 0.06) }}>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Materia prima</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Real</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="center">Desv.</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {relConsumosWIP.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{c.mp}</TableCell>
                              <TableCell sx={{ color: '#1E293B', borderColor: '#E5E7EB', fontSize: 12, fontWeight: 600 }} align="right">{c.real} {c.unidad}</TableCell>
                              <TableCell sx={{ borderColor: '#E5E7EB', color: Math.abs(c.desviacion) > 5 ? '#EF4444' : '#16A34A', fontSize: 12, fontWeight: 700 }} align="center">{c.desviacion > 0 ? '+' : ''}{c.desviacion.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setSelectedWIP(null)} sx={{ color: '#64748B', fontWeight: 600 }}>Cerrar</Button>
              <Button variant="contained" onClick={() => { notify(`WIP de Celda ${selectedWIP.celda} liberado al siguiente proceso`, 'success'); setSelectedWIP(null) }}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
                Liberar a siguiente proceso
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: DETALLE CONSUMO ── */}
      <Dialog open={!!selectedConsumo} onClose={() => setSelectedConsumo(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selectedConsumo && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
              <Box>
                <Typography fontSize={13} fontWeight={800} color={MES_COLOR} fontFamily="monospace">{selectedConsumo.op}</Typography>
                <Typography fontSize={15} fontWeight={700} color="#1E293B">{selectedConsumo.mp}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedConsumo(null)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  <InfoTile label="Lote MP" value={selectedConsumo.loteMP} />
                  <InfoTile label="Planificado" value={`${selectedConsumo.planificado} ${selectedConsumo.unidad}`} />
                  <InfoTile label="Real" value={`${selectedConsumo.real} ${selectedConsumo.unidad}`} color={MES_DARK} />
                  <InfoTile label="Diferencia" value={`${selectedConsumo.diferencia > 0 ? '+' : ''}${selectedConsumo.diferencia} ${selectedConsumo.unidad}`} color={selectedConsumo.diferencia > 0 ? '#F97316' : selectedConsumo.diferencia < 0 ? '#3B82F6' : '#64748B'} />
                  <InfoTile label="% Desviación" value={`${selectedConsumo.desviacion > 0 ? '+' : ''}${selectedConsumo.desviacion.toFixed(1)}%`} color={Math.abs(selectedConsumo.desviacion) > 10 ? '#EF4444' : Math.abs(selectedConsumo.desviacion) > 5 ? '#EAB308' : '#16A34A'} />
                  <InfoTile label="Unidad" value={selectedConsumo.unidad} />
                </Box>
                <Box sx={{ bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                  <Typography fontSize={12} color="#334155">
                    {Math.abs(selectedConsumo.desviacion) > 10
                      ? 'Desviación crítica: revisar formulación, calibración de dosificación o merma del lote.'
                      : Math.abs(selectedConsumo.desviacion) > 5
                        ? 'Desviación moderada: dentro de tolerancia ampliada, monitorear tendencia.'
                        : 'Consumo dentro de parámetros. Sin acción requerida.'}
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setSelectedConsumo(null)} sx={{ color: '#64748B', fontWeight: 600 }}>Cerrar</Button>
              <Button variant="contained" onClick={() => { notify(`Desviación de ${selectedConsumo.op} marcada para revisión de calidad`, 'info'); setSelectedConsumo(null) }}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
                Reportar a calidad
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: DETALLE REPOSICIÓN ── */}
      <Dialog open={!!selectedRepo} onClose={() => setSelectedRepo(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selectedRepo && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography fontSize={15} fontWeight={700} color="#1E293B">{selectedRepo.mp}</Typography>
                <Chip label={selectedRepo.prioridad} size="small" sx={{ background: alpha(prioridadColor(selectedRepo.prioridad), 0.15), color: prioridadColor(selectedRepo.prioridad), fontWeight: 700, fontSize: 9 }} />
              </Stack>
              <IconButton size="small" onClick={() => setSelectedRepo(null)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  <InfoTile label="Estado" value={selectedRepo.estado} color={estadoRepColor(selectedRepo.estado)} />
                  <InfoTile label="Stock actual" value={`${selectedRepo.cantActual}`} color={selectedRepo.cantActual < selectedRepo.puntoReorden ? '#EF4444' : '#1E293B'} />
                  <InfoTile label="Punto de reorden" value={`${selectedRepo.puntoReorden}`} />
                  <InfoTile label="Cantidad solicitada" value={`${selectedRepo.cantSolicitada}`} color={MES_COLOR} />
                  <InfoTile label="Cobertura" value={`${Math.round((selectedRepo.cantActual / selectedRepo.puntoReorden) * 100)}%`} color={selectedRepo.cantActual < selectedRepo.puntoReorden ? '#CA8A04' : '#16A34A'} />
                  <InfoTile label="Prioridad" value={selectedRepo.prioridad} color={prioridadColor(selectedRepo.prioridad)} />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={11} color="#64748B">Nivel de stock vs punto de reorden</Typography>
                    <Typography fontSize={11} fontWeight={700} color={selectedRepo.cantActual < selectedRepo.puntoReorden ? '#EF4444' : '#16A34A'}>
                      {Math.min(100, Math.round((selectedRepo.cantActual / selectedRepo.puntoReorden) * 100))}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={Math.min(100, (selectedRepo.cantActual / selectedRepo.puntoReorden) * 100)}
                    sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: selectedRepo.cantActual < selectedRepo.puntoReorden * 0.5 ? '#EF4444' : '#CA8A04', borderRadius: 5 } }} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setSelectedRepo(null)} sx={{ color: '#64748B', fontWeight: 600 }}>Cerrar</Button>
              <Button variant="contained" disabled={selectedRepo.estado === 'RECIBIDO'} startIcon={<RefreshIcon />}
                onClick={() => advanceRepo(selectedRepo)}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, '&.Mui-disabled': { bgcolor: alpha('#16A34A', 0.15), color: '#16A34A' } }}>
                {selectedRepo.estado === 'PENDIENTE' ? 'Marcar en proceso' : selectedRepo.estado === 'EN PROCESO' ? 'Marcar recibido' : '✓ Recibido'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: NUEVO ÍTEM ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize={16} color="#1E293B">Nuevo ítem de inventario</Typography>
              <Typography fontSize={12} color="#64748B">Registre materias primas, empaque o producto terminado</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setCreateOpen(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Stack spacing={2} mt={0.5}>
            <TextField fullWidth size="small" label="Nombre del ítem *" value={form.nombre}
              onChange={(e) => setField('nombre', e.target.value)} sx={inputSx} placeholder="Ej. Resina PVC grado técnico"
              error={triedSubmit && !form.nombre.trim()} helperText={triedSubmit && !form.nombre.trim() ? 'El nombre es obligatorio' : ' '} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Tipo *" value={form.tipo}
                onChange={(e) => onTipoChange(e.target.value as TipoItem)} sx={inputSx}
                error={triedSubmit && !form.tipo} helperText={triedSubmit && !form.tipo ? 'Seleccione el tipo' : 'Autocompleta la ubicación'}>
                {TIPOS_ITEM.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Unidad *" value={form.unidad}
                onChange={(e) => setField('unidad', e.target.value)} sx={inputSx}
                error={triedSubmit && !form.unidad} helperText={triedSubmit && !form.unidad ? 'Seleccione la unidad' : ' '}>
                {UNIDADES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Proveedor / Origen" value={form.proveedor}
                onChange={(e) => setField('proveedor', e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {PROVEEDORES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Ubicación" value={form.ubicacion}
                onChange={(e) => setField('ubicacion', e.target.value)} sx={inputSx}>
                {UBICACIONES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" type="number" label="Stock inicial" value={form.stockActual}
                onChange={(e) => setField('stockActual', e.target.value)} sx={inputSx}
                InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="#94A3B8">{form.unidad || 'un'}</Typography></InputAdornment> }} />
              <TextField fullWidth size="small" type="number" label="Stock mínimo" value={form.stockMinimo}
                onChange={(e) => setField('stockMinimo', e.target.value)} sx={inputSx} />
              <TextField fullWidth size="small" type="number" label="Punto de reorden" value={form.puntoReorden}
                onChange={(e) => setField('puntoReorden', e.target.value)} sx={inputSx} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" type="number" label="Costo unitario" value={form.costoUnitario}
                onChange={(e) => setField('costoUnitario', e.target.value)} sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={13} color="#94A3B8">$</Typography></InputAdornment> }} />
              <TextField fullWidth size="small" label="Lote activo" value={form.loteActivo}
                onChange={(e) => setField('loteActivo', e.target.value)} sx={inputSx} placeholder="Ej. L2026-001" />
            </Stack>
            <TextField fullWidth size="small" type="date" label="Fecha de vencimiento" value={form.fechaVencimiento}
              onChange={(e) => setField('fechaVencimiento', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B', fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!createValid}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            Crear ítem
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: AJUSTE DE INVENTARIO ── */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AdjustIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize={16} color="#1E293B">Ajuste de inventario</Typography>
              <Typography fontSize={12} color="#64748B">Registre entrada, salida o ajuste de stock</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setAdjustOpen(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Stack spacing={2} mt={0.5}>
            <TextField select fullWidth size="small" label="Ítem *" value={adjustForm.codigo}
              onChange={(e) => setAdjField('codigo', e.target.value)} sx={inputSx}
              error={adjustTried && !adjustForm.codigo} helperText={adjustTried && !adjustForm.codigo ? 'Seleccione un ítem' : ' '}>
              {inventario.map((it) => <MenuItem key={it.codigo} value={it.codigo}>{it.codigo} — {it.nombre}</MenuItem>)}
            </TextField>
            {adjustForm.codigo && (() => {
              const it = inventario.find((x) => x.codigo === adjustForm.codigo)
              return it ? (
                <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '8px', p: 1.25 }}>
                  <Typography fontSize={11} color="#64748B">Stock actual</Typography>
                  <Typography fontSize={14} fontWeight={700} color="#1E293B">{it.stockActual.toLocaleString('es-CO')} {it.unidad}</Typography>
                </Box>
              ) : null
            })()}
            <TextField select fullWidth size="small" label="Tipo de movimiento" value={adjustForm.tipoMov}
              onChange={(e) => setAdjField('tipoMov', e.target.value)} sx={inputSx}>
              {(['ENTRADA', 'SALIDA', 'AJUSTE'] as Movimiento['tipo'][]).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
            <TextField fullWidth size="small" type="number" label="Cantidad *" value={adjustForm.cantidad}
              onChange={(e) => setAdjField('cantidad', e.target.value)} sx={inputSx}
              error={adjustTried && !(adjustQty > 0)} helperText={adjustTried && !(adjustQty > 0) ? 'Ingrese una cantidad mayor a 0' : ' '} />
            <TextField select fullWidth size="small" label="Motivo" value={adjustForm.motivo}
              onChange={(e) => setAdjField('motivo', e.target.value)} sx={inputSx}>
              <MenuItem value=""><em>Sin especificar</em></MenuItem>
              {MOTIVOS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Responsable" value={adjustForm.responsable}
              onChange={(e) => setAdjField('responsable', e.target.value)} sx={inputSx}>
              <MenuItem value=""><em>Inventarios</em></MenuItem>
              {RESPONSABLES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAdjustOpen(false)} sx={{ color: '#64748B', fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AdjustIcon />} onClick={handleAdjust} disabled={!adjustValid}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
