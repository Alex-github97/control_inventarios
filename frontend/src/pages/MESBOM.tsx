import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, alpha, Divider, TextField, IconButton, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  InputAdornment, Avatar, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  AccountTree as TreeIcon,
  Engineering as EngineeringIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChevronRight as ChevronIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
  FileDownload as ExportIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Person as PersonIcon,
  Layers as LayersIcon,
  Timer as TimerIcon,
  Thermostat as ThermoIcon,
  Factory as FactoryIcon,
  AltRoute as RouteIcon,
  Science as ScienceIcon,
  PriceChange as CostIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarnIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Componente {
  codigo: string
  nombre: string
  cantidad: number
  um: string
  merma: number
  nivel: number
  costoUnitario: number
  proveedor?: string
  children?: Componente[]
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

interface Ruta {
  secuencia: number
  operacion: string
  centro: string
  maquina: string
  tiempoSetup: number  // min
  tiempoCiclo: number  // min
}

type Categoria = 'Terminado' | 'Semielaborado' | 'Empaque'
type EstadoProd = 'ACTIVO' | 'BORRADOR' | 'OBSOLETO'

interface Producto {
  codigo: string
  nombre: string
  categoria: Categoria
  version: string
  estado: EstadoProd
  um: string
  linea: string
  responsable: string
  rendimiento: number   // %
  tiempoProceso: number // min
  temperatura: string
  costoMP: number
  costoMO: number
  costoIF: number
  precioVenta: number
  componentes: Componente[]
  ingredientes: Ingrediente[]
  rutas: Ruta[]
}

interface ECO {
  numero: string
  descripcion: string
  tipo: string
  bomAfectado: string
  versionAnterior: string
  versionNueva: string
  estado: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO'
  fechaEfectiva: string
  impactoCosto: number
  solicitante: string
  justificacion: string
}

// ─── Catálogo de materiales (fuente para autocompletar en el formulario) ───────
const MATERIALES = [
  { codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', um: 'kg', costoUnitario: 8200, proveedor: 'Plastinova SAS' },
  { codigo: 'MP-002', nombre: 'Pigmento azul cobalto', um: 'kg', costoUnitario: 28000, proveedor: 'Colorantes del Norte' },
  { codigo: 'MP-003', nombre: 'Plastificante DEHP', um: 'kg', costoUnitario: 6500, proveedor: 'Quimipol SAS' },
  { codigo: 'MP-004', nombre: 'Estabilizante Ca-Zn', um: 'kg', costoUnitario: 45000, proveedor: 'Baerlocher Andina' },
  { codigo: 'MP-005', nombre: 'Carbonato de calcio industrial', um: 'kg', costoUnitario: 1200, proveedor: 'Omya Andina' },
  { codigo: 'MP-006', nombre: 'Dióxido de titanio TiO2', um: 'kg', costoUnitario: 32000, proveedor: 'Chemours' },
  { codigo: 'MP-007', nombre: 'Lubricante estéarico', um: 'kg', costoUnitario: 3800, proveedor: 'Lubrinova SAS' },
  { codigo: 'MP-010', nombre: 'Antioxidante Irganox 1010', um: 'kg', costoUnitario: 95000, proveedor: 'BASF Colombia' },
  { codigo: 'EMP-001', nombre: 'Caja corrugada 30x20x15cm', um: 'un', costoUnitario: 1326, proveedor: 'Cartones del Valle' },
  { codigo: 'EMP-002', nombre: 'Etiqueta autoadhesiva full color', um: 'un', costoUnitario: 180, proveedor: 'Etimark SAS' },
]

const LINEAS = ['Línea Extrusión 1', 'Línea Extrusión 2', 'Línea Inyección A', 'Mezclado Compuestos', 'Empaque Final']
const RESPONSABLES = ['Ing. Laura Peña', 'Ing. Andrés Gómez', 'Ing. Sofía Ramírez', 'Ing. Camilo Ruiz', 'Ing. Marta Ortega']
const CATEGORIAS: Categoria[] = ['Terminado', 'Semielaborado', 'Empaque']
const ESTADOS: EstadoProd[] = ['ACTIVO', 'BORRADOR', 'OBSOLETO']
const UNIDADES = ['un', 'kg', 'L', 'm', 'caja']

// ─── Datos mock — productos con estructura BOM completa ────────────────────────
const INGREDIENTES_PT001: Ingrediente[] = [
  { orden: 1, ingrediente: 'Resina PVC grado alimentario', cantidad: 2500, porcentaje: 55.6, unidad: 'g', esCritico: true, notas: 'Viscosidad K-67, temperatura ≤25°C' },
  { orden: 2, ingrediente: 'Carbonato de calcio industrial', cantidad: 800, porcentaje: 17.8, unidad: 'g', esCritico: false, notas: 'Malla 325, blancura ≥97%' },
  { orden: 3, ingrediente: 'Plastificante DEHP', cantidad: 650, porcentaje: 14.4, unidad: 'g', esCritico: true, notas: 'Grado técnico, agregar lentamente' },
  { orden: 4, ingrediente: 'Pigmento azul cobalto', cantidad: 120, porcentaje: 2.7, unidad: 'g', esCritico: false, notas: 'Dispersar en plastificante antes' },
  { orden: 5, ingrediente: 'Estabilizante Ca-Zn', cantidad: 180, porcentaje: 4.0, unidad: 'g', esCritico: true, notas: 'Agregar simultáneamente con lubricante' },
  { orden: 6, ingrediente: 'Lubricante estéarico', cantidad: 80, porcentaje: 1.8, unidad: 'g', esCritico: false, notas: 'Puede sustituirse por cera parafínica' },
  { orden: 7, ingrediente: 'Dióxido de titanio TiO2', cantidad: 75, porcentaje: 1.7, unidad: 'g', esCritico: false, notas: 'Para brillo y opacidad' },
  { orden: 8, ingrediente: 'Antioxidante Irganox 1010', cantidad: 95, porcentaje: 2.1, unidad: 'g', esCritico: true, notas: 'CRÍTICO — no omitir. Adicionar al final' },
]

const RUTAS_PT001: Ruta[] = [
  { secuencia: 10, operacion: 'Pesaje y dosificación', centro: 'CT-PES', maquina: 'Báscula BP-02', tiempoSetup: 8, tiempoCiclo: 6 },
  { secuencia: 20, operacion: 'Mezclado en caliente', centro: 'CT-MEZ', maquina: 'Mezcladora Henschel HM-40', tiempoSetup: 12, tiempoCiclo: 14 },
  { secuencia: 30, operacion: 'Extrusión y perfilado', centro: 'CT-EXT', maquina: 'Extrusora Battenfeld EX-1', tiempoSetup: 15, tiempoCiclo: 10 },
  { secuencia: 40, operacion: 'Empaque y sellado', centro: 'CT-EMP', maquina: 'Empacadora EP-03', tiempoSetup: 5, tiempoCiclo: 4 },
]

const PRODUCTOS_MOCK: Producto[] = [
  {
    codigo: 'PT-001', nombre: 'Producto Terminado Premium', categoria: 'Terminado', version: 'v2.1',
    estado: 'ACTIVO', um: 'un', linea: 'Línea Extrusión 1', responsable: 'Ing. Laura Peña',
    rendimiento: 97.8, tiempoProceso: 42, temperatura: '175 ± 5°C',
    costoMP: 48200, costoMO: 12400, costoIF: 6800, precioVenta: 98000,
    componentes: [
      {
        codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', cantidad: 2.5, um: 'kg', merma: 3.2, nivel: 1,
        costoUnitario: 8200, proveedor: 'Plastinova SAS',
        children: [
          { codigo: 'SUB-001', nombre: 'Monómero VCM (CAS 75-01-4)', cantidad: 2.1, um: 'kg', merma: 1.0, nivel: 2, costoUnitario: 3400, proveedor: 'Petroquímica Latam' },
          { codigo: 'SUB-002', nombre: 'Catalizador peróxido dilauril', cantidad: 0.08, um: 'kg', merma: 0.5, nivel: 2, costoUnitario: 62000, proveedor: 'Albemarle Colombia' },
        ],
      },
      { codigo: 'MP-002', nombre: 'Pigmento azul cobalto', cantidad: 1.2, um: 'kg', merma: 1.8, nivel: 1, costoUnitario: 28000, proveedor: 'Colorantes del Norte' },
      { codigo: 'EMP-001', nombre: 'Caja corrugada 30x20x15cm', cantidad: 1, um: 'un', merma: 0, nivel: 1, costoUnitario: 1326, proveedor: 'Cartones del Valle' },
      { codigo: 'MP-007', nombre: 'Lubricante estéarico', cantidad: 0.08, um: 'kg', merma: 0.5, nivel: 1, costoUnitario: 3800, proveedor: 'Lubrinova SAS' },
    ],
    ingredientes: INGREDIENTES_PT001,
    rutas: RUTAS_PT001,
  },
  {
    codigo: 'PT-002', nombre: 'Producto Plus Azul', categoria: 'Terminado', version: 'v2.0',
    estado: 'ACTIVO', um: 'un', linea: 'Línea Inyección A', responsable: 'Ing. Andrés Gómez',
    rendimiento: 95.2, tiempoProceso: 38, temperatura: '168 ± 4°C',
    costoMP: 39500, costoMO: 10800, costoIF: 5600, precioVenta: 82000,
    componentes: [
      { codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', cantidad: 2.1, um: 'kg', merma: 2.9, nivel: 1, costoUnitario: 8200, proveedor: 'Plastinova SAS' },
      { codigo: 'MP-002', nombre: 'Pigmento azul cobalto', cantidad: 0.9, um: 'kg', merma: 1.5, nivel: 1, costoUnitario: 28000, proveedor: 'Colorantes del Norte' },
      { codigo: 'MP-005', nombre: 'Carbonato de calcio industrial', cantidad: 0.6, um: 'kg', merma: 0.8, nivel: 1, costoUnitario: 1200, proveedor: 'Omya Andina' },
      { codigo: 'EMP-001', nombre: 'Caja corrugada 30x20x15cm', cantidad: 1, um: 'un', merma: 0, nivel: 1, costoUnitario: 1326, proveedor: 'Cartones del Valle' },
    ],
    ingredientes: [
      { orden: 1, ingrediente: 'Resina PVC grado alimentario', cantidad: 2100, porcentaje: 58.0, unidad: 'g', esCritico: true, notas: 'Viscosidad K-67' },
      { orden: 2, ingrediente: 'Pigmento azul cobalto', cantidad: 900, porcentaje: 24.8, unidad: 'g', esCritico: false, notas: 'Nuevo tono según ECO-2025-011' },
      { orden: 3, ingrediente: 'Carbonato de calcio industrial', cantidad: 600, porcentaje: 16.6, unidad: 'g', esCritico: false, notas: 'Carga de relleno' },
    ],
    rutas: [
      { secuencia: 10, operacion: 'Pesaje y dosificación', centro: 'CT-PES', maquina: 'Báscula BP-02', tiempoSetup: 8, tiempoCiclo: 5 },
      { secuencia: 20, operacion: 'Inyección', centro: 'CT-INY', maquina: 'Inyectora Arburg IA-2', tiempoSetup: 18, tiempoCiclo: 9 },
      { secuencia: 30, operacion: 'Empaque', centro: 'CT-EMP', maquina: 'Empacadora EP-03', tiempoSetup: 5, tiempoCiclo: 4 },
    ],
  },
  {
    codigo: 'PT-003', nombre: 'Modelo X Reformulado', categoria: 'Terminado', version: 'v1.6',
    estado: 'BORRADOR', um: 'un', linea: 'Línea Extrusión 2', responsable: 'Ing. Sofía Ramírez',
    rendimiento: 93.0, tiempoProceso: 51, temperatura: '180 ± 6°C',
    costoMP: 52100, costoMO: 13900, costoIF: 7200, precioVenta: 104000,
    componentes: [
      { codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', cantidad: 2.8, um: 'kg', merma: 3.5, nivel: 1, costoUnitario: 8200, proveedor: 'Plastinova SAS' },
      { codigo: 'MP-003', nombre: 'Plastificante DEHP', cantidad: 0.7, um: 'kg', merma: 1.2, nivel: 1, costoUnitario: 6500, proveedor: 'Quimipol SAS' },
      { codigo: 'MP-010', nombre: 'Antioxidante Irganox 1010', cantidad: 0.1, um: 'kg', merma: 0.4, nivel: 1, costoUnitario: 95000, proveedor: 'BASF Colombia' },
      { codigo: 'MP-006', nombre: 'Dióxido de titanio TiO2', cantidad: 0.08, um: 'kg', merma: 0.6, nivel: 1, costoUnitario: 32000, proveedor: 'Chemours' },
    ],
    ingredientes: [
      { orden: 1, ingrediente: 'Resina PVC grado alimentario', cantidad: 2800, porcentaje: 75.5, unidad: 'g', esCritico: true, notas: 'Dosis aumentada v1.6' },
      { orden: 2, ingrediente: 'Plastificante DEHP', cantidad: 700, porcentaje: 18.9, unidad: 'g', esCritico: true, notas: 'Reducción ambiental pendiente' },
      { orden: 3, ingrediente: 'Antioxidante Irganox 1010', cantidad: 100, porcentaje: 2.7, unidad: 'g', esCritico: true, notas: 'CRÍTICO — adicionar al final' },
    ],
    rutas: [
      { secuencia: 10, operacion: 'Pesaje', centro: 'CT-PES', maquina: 'Báscula BP-01', tiempoSetup: 10, tiempoCiclo: 7 },
      { secuencia: 20, operacion: 'Mezclado', centro: 'CT-MEZ', maquina: 'Mezcladora Henschel HM-40', tiempoSetup: 14, tiempoCiclo: 16 },
      { secuencia: 30, operacion: 'Extrusión', centro: 'CT-EXT', maquina: 'Extrusora Battenfeld EX-2', tiempoSetup: 18, tiempoCiclo: 12 },
    ],
  },
  {
    codigo: 'SE-001', nombre: 'Compuesto Base PVC (masterbatch)', categoria: 'Semielaborado', version: 'v3.0',
    estado: 'ACTIVO', um: 'kg', linea: 'Mezclado Compuestos', responsable: 'Ing. Camilo Ruiz',
    rendimiento: 99.1, tiempoProceso: 22, temperatura: '160 ± 3°C',
    costoMP: 14200, costoMO: 3200, costoIF: 1800, precioVenta: 26000,
    componentes: [
      { codigo: 'MP-001', nombre: 'Resina PVC grado alimentario', cantidad: 1.0, um: 'kg', merma: 1.0, nivel: 1, costoUnitario: 8200, proveedor: 'Plastinova SAS' },
      { codigo: 'MP-004', nombre: 'Estabilizante Ca-Zn', cantidad: 0.05, um: 'kg', merma: 0.3, nivel: 1, costoUnitario: 45000, proveedor: 'Baerlocher Andina' },
      { codigo: 'MP-005', nombre: 'Carbonato de calcio industrial', cantidad: 0.4, um: 'kg', merma: 0.5, nivel: 1, costoUnitario: 1200, proveedor: 'Omya Andina' },
    ],
    ingredientes: [
      { orden: 1, ingrediente: 'Resina PVC grado alimentario', cantidad: 1000, porcentaje: 69.0, unidad: 'g', esCritico: true, notas: 'Base del compuesto' },
      { orden: 2, ingrediente: 'Carbonato de calcio industrial', cantidad: 400, porcentaje: 27.6, unidad: 'g', esCritico: false, notas: 'Relleno' },
      { orden: 3, ingrediente: 'Estabilizante Ca-Zn', cantidad: 50, porcentaje: 3.4, unidad: 'g', esCritico: true, notas: 'Estabilidad térmica' },
    ],
    rutas: [
      { secuencia: 10, operacion: 'Dosificación', centro: 'CT-PES', maquina: 'Báscula BP-02', tiempoSetup: 6, tiempoCiclo: 4 },
      { secuencia: 20, operacion: 'Mezclado intensivo', centro: 'CT-MEZ', maquina: 'Mezcladora Henschel HM-20', tiempoSetup: 8, tiempoCiclo: 10 },
    ],
  },
  {
    codigo: 'EMP-KIT', nombre: 'Kit de Empaque Estándar', categoria: 'Empaque', version: 'v1.2',
    estado: 'OBSOLETO', um: 'kit', linea: 'Empaque Final', responsable: 'Ing. Marta Ortega',
    rendimiento: 100, tiempoProceso: 6, temperatura: 'Ambiente',
    costoMP: 1680, costoMO: 900, costoIF: 300, precioVenta: 4200,
    componentes: [
      { codigo: 'EMP-001', nombre: 'Caja corrugada 30x20x15cm', cantidad: 1, um: 'un', merma: 0, nivel: 1, costoUnitario: 1326, proveedor: 'Cartones del Valle' },
      { codigo: 'EMP-002', nombre: 'Etiqueta autoadhesiva full color', cantidad: 2, um: 'un', merma: 0.5, nivel: 1, costoUnitario: 180, proveedor: 'Etimark SAS' },
    ],
    ingredientes: [],
    rutas: [
      { secuencia: 10, operacion: 'Ensamble de kit', centro: 'CT-EMP', maquina: 'Estación manual EM-01', tiempoSetup: 2, tiempoCiclo: 4 },
    ],
  },
]

const ECOS_MOCK: ECO[] = [
  { numero: 'ECO-2025-012', descripcion: 'Incremento % estabilizante Ca-Zn por nueva norma NTC 4321', tipo: 'Reformulación', bomAfectado: 'PT-001, PT-002', versionAnterior: 'v2.0', versionNueva: 'v2.1', estado: 'APROBADO', fechaEfectiva: '2025-07-01', impactoCosto: 1850, solicitante: 'Ing. Laura Peña', justificacion: 'Cumplimiento normativo obligatorio antes del 2025-07-01.' },
  { numero: 'ECO-2025-011', descripcion: 'Sustitución pigmento azul Phtalo → Cobalto', tipo: 'Sustitución material', bomAfectado: 'PT-002', versionAnterior: 'v1.8', versionNueva: 'v2.0', estado: 'APROBADO', fechaEfectiva: '2025-06-01', impactoCosto: 3200, solicitante: 'Ing. Andrés Gómez', justificacion: 'Mejora de estabilidad de color y resistencia UV solicitada por cliente.' },
  { numero: 'ECO-2025-010', descripcion: 'Reducción % DEHP — reformulación ambiental', tipo: 'Reformulación', bomAfectado: 'PT-001, PT-003', versionAnterior: 'v1.9', versionNueva: 'v2.0', estado: 'PENDIENTE', fechaEfectiva: '2025-08-15', impactoCosto: -1200, solicitante: 'Ing. Sofía Ramírez', justificacion: 'Alineación con política de reducción de ftalatos. Requiere validación de laboratorio.' },
  { numero: 'ECO-2025-009', descripcion: 'Cambio proveedor resina PVC: Plastinova → PolyCol', tipo: 'Cambio proveedor', bomAfectado: 'PT-001, PT-002, SE-001', versionAnterior: 'v1.8', versionNueva: 'v1.9', estado: 'RECHAZADO', fechaEfectiva: 'N/A', impactoCosto: -4500, solicitante: 'Ing. Camilo Ruiz', justificacion: 'Rechazado: PolyCol no cumple certificación grado alimentario.' },
  { numero: 'ECO-2025-008', descripcion: 'Adición antioxidante secundario AO-412S', tipo: 'Adición componente', bomAfectado: 'PT-003', versionAnterior: 'v1.5', versionNueva: 'v1.6', estado: 'APROBADO', fechaEfectiva: '2025-04-20', impactoCosto: 980, solicitante: 'Ing. Sofía Ramírez', justificacion: 'Mejora de estabilidad térmica en proceso de extrusión a 180°C.' },
  { numero: 'ECO-2025-007', descripcion: 'Rediseño caja empaque — aumento espesor 3→5mm', tipo: 'Rediseño', bomAfectado: 'PT-001, PT-002, EMP-KIT', versionAnterior: 'v1.2', versionNueva: 'v1.3', estado: 'APROBADO', fechaEfectiva: '2025-03-01', impactoCosto: 620, solicitante: 'Ing. Marta Ortega', justificacion: 'Reducción de daños en transporte reportados por logística.' },
  { numero: 'ECO-2025-006', descripcion: 'Ajuste merma resina: 2.8% → 3.2% (real vs teórico)', tipo: 'Ajuste merma', bomAfectado: 'PT-001', versionAnterior: 'v1.9', versionNueva: 'v2.0', estado: 'APROBADO', fechaEfectiva: '2025-02-15', impactoCosto: 750, solicitante: 'Ing. Laura Peña', justificacion: 'Actualización según datos reales de producción del último trimestre.' },
  { numero: 'ECO-2025-005', descripcion: 'Inclusión lubricante adicional turno nocturno (T>35°C)', tipo: 'Adición componente', bomAfectado: 'PT-002, SE-001', versionAnterior: 'v1.7', versionNueva: 'v1.8', estado: 'PENDIENTE', fechaEfectiva: '2025-09-01', impactoCosto: 420, solicitante: 'Ing. Camilo Ruiz', justificacion: 'Compensar mayor fricción por temperatura ambiente en turno 3.' },
]

// ─── Helpers de color ──────────────────────────────────────────────────────────
const ecoEstadoColor = (e: ECO['estado']) =>
  ({ APROBADO: '#16A34A', PENDIENTE: '#CA8A04', RECHAZADO: '#DC2626' })[e]

const estadoProdColor = (e: EstadoProd) =>
  ({ ACTIVO: '#16A34A', BORRADOR: '#CA8A04', OBSOLETO: '#94A3B8' })[e]

const categoriaColor = (c: Categoria) =>
  ({ Terminado: '#0891B2', Semielaborado: '#8B5CF6', Empaque: '#F59E0B' })[c]

const flatten = (nodes: Componente[]): Componente[] =>
  nodes.flatMap(n => [n, ...(n.children ? flatten(n.children) : [])])

const nodeExt = (n: Componente) => n.cantidad * n.costoUnitario

const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B' },
  '& label': { color: '#64748B' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.25) },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.5) },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
}

// ─── Fila de árbol BOM (tema claro, con costo) ─────────────────────────────────
function BOMNodeRow({ node, expanded, onToggle }: { node: Componente; expanded: Set<string>; onToggle: (code: string) => void }) {
  const isExpanded = expanded.has(node.codigo)
  const hasChildren = !!node.children && node.children.length > 0
  const indent = (node.nivel - 1) * 22

  return (
    <>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', py: 1.1, px: 1.5,
          pl: `${10 + indent}px`,
          borderBottom: '1px solid #F1F5F9',
          '&:hover': { background: alpha(MES_COLOR, 0.04) },
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        onClick={() => hasChildren && onToggle(node.codigo)}
      >
        <Box sx={{ width: 20, mr: 0.5, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
          {hasChildren ? (isExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />) : <ChevronIcon sx={{ fontSize: 14, opacity: 0.3 }} />}
        </Box>
        <Box sx={{ p: 0.5, mr: 1, borderRadius: 1, background: alpha(MES_COLOR, hasChildren ? 0.16 : 0.08), color: MES_COLOR, display: 'flex' }}>
          <TreeIcon sx={{ fontSize: 14 }} />
        </Box>
        <Typography variant="body2" sx={{ color: MES_COLOR, fontFamily: 'monospace', fontWeight: 700, mr: 1.5, minWidth: 78 }}>{node.codigo}</Typography>
        <Typography variant="body2" sx={{ color: '#334155', flex: 1, minWidth: 120 }}>{node.nombre}</Typography>
        <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 700, mr: 0.5, minWidth: 52, textAlign: 'right' }}>{node.cantidad}</Typography>
        <Typography variant="caption" sx={{ color: '#94A3B8', mr: 1.5, minWidth: 26 }}>{node.um}</Typography>
        <Chip label={`Merma ${node.merma}%`} size="small" sx={{ background: alpha(node.merma > 2 ? '#CA8A04' : '#16A34A', 0.12), color: node.merma > 2 ? '#CA8A04' : '#16A34A', fontSize: 9, height: 18, mr: 1 }} />
        <Typography variant="caption" sx={{ color: '#0F766E', fontWeight: 700, minWidth: 84, textAlign: 'right' }}>{fmt(nodeExt(node))}</Typography>
        {node.proveedor && <Typography variant="caption" sx={{ color: '#94A3B8', minWidth: 130, textAlign: 'right', display: { xs: 'none', md: 'block' } }}>{node.proveedor}</Typography>}
      </Box>
      {hasChildren && isExpanded && node.children!.map(child => (
        <BOMNodeRow key={child.codigo} node={child} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  )
}

// ─── Tile de dato ──────────────────────────────────────────────────────────────
function InfoTile({ label, value, color = '#1E293B' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25 }}>
      <Typography fontSize={10} color="#64748B" fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
      <Typography fontSize={13} fontWeight={600} sx={{ color }}>{value}</Typography>
    </Box>
  )
}

interface NewBOMForm {
  nombre: string
  categoria: Categoria
  version: string
  estado: EstadoProd
  um: string
  linea: string
  responsable: string
  rendimiento: string
  tiempoProceso: string
  temperatura: string
  precioVenta: string
}

const EMPTY_BOM_FORM: NewBOMForm = {
  nombre: '', categoria: 'Terminado', version: 'v1.0', estado: 'BORRADOR', um: 'un',
  linea: '', responsable: '', rendimiento: '', tiempoProceso: '', temperatura: '', precioVenta: '',
}

interface CompDraft { codigo: string; cantidad: string; merma: string }
const EMPTY_COMP_DRAFT: CompDraft = { codigo: '', cantidad: '', merma: '0' }

// ─── Componente principal ──────────────────────────────────────────────────────
export default function MESBOM() {
  const [tab, setTab] = useState(0)
  const [productos, setProductos] = useState<Producto[]>(PRODUCTOS_MOCK)
  const [ecos, setEcos] = useState<ECO[]>(ECOS_MOCK)

  // Filtros Tab 0
  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('Todas')
  const [filterEstado, setFilterEstado] = useState('Todos')

  // Producto activo (Tabs 1 y 3)
  const [prodActivoCod, setProdActivoCod] = useState(PRODUCTOS_MOCK[0].codigo)

  // Detalle producto
  const [selected, setSelected] = useState<Producto | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Detalle ingrediente / componente / eco
  const [selIngrediente, setSelIngrediente] = useState<Ingrediente | null>(null)
  const [selComp, setSelComp] = useState<Componente | null>(null)
  const [selEco, setSelEco] = useState<ECO | null>(null)
  const [filterEcoEstado, setFilterEcoEstado] = useState<'Todos' | ECO['estado']>('Todos')

  // Crear BOM
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<NewBOMForm>(EMPTY_BOM_FORM)
  const [formComps, setFormComps] = useState<CompDraft[]>([])
  const [compDraft, setCompDraft] = useState<CompDraft>(EMPTY_COMP_DRAFT)
  const [triedSubmit, setTriedSubmit] = useState(false)

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev })

  const toggleNode = (codigo: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(codigo) ? next.delete(codigo) : next.add(codigo)
      return next
    })

  const openProducto = (p: Producto) => {
    // Expandir automáticamente los nodos con hijos
    setExpanded(new Set(flatten(p.componentes).filter(n => n.children && n.children.length).map(n => n.codigo)))
    setSelected(p)
  }

  const costoTotal = (p: Producto) => p.costoMP + p.costoMO + p.costoIF
  const margen = (p: Producto) => p.precioVenta > 0 ? ((p.precioVenta - costoTotal(p)) / p.precioVenta * 100) : 0

  const resetFiltros = () => { setSearch(''); setFilterCategoria('Todas'); setFilterEstado('Todos') }
  const hayFiltros = search || filterCategoria !== 'Todas' || filterEstado !== 'Todos'

  const filtered = useMemo(() => productos.filter(p => {
    if (filterCategoria !== 'Todas' && p.categoria !== filterCategoria) return false
    if (filterEstado !== 'Todos' && p.estado !== filterEstado) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q) && !p.linea.toLowerCase().includes(q)) return false
    }
    return true
  }), [productos, filterCategoria, filterEstado, search])

  const prodActivo = useMemo(
    () => productos.find(p => p.codigo === prodActivoCod) ?? productos[0],
    [productos, prodActivoCod],
  )

  const ecosFiltrados = useMemo(
    () => filterEcoEstado === 'Todos' ? ecos : ecos.filter(e => e.estado === filterEcoEstado),
    [ecos, filterEcoEstado],
  )

  // ── Formulario Nuevo BOM ──
  const setField = (field: keyof NewBOMForm, value: string) => setForm(prev => ({ ...prev, [field]: value }))
  const openCreate = () => { setForm(EMPTY_BOM_FORM); setFormComps([]); setCompDraft(EMPTY_COMP_DRAFT); setTriedSubmit(false); setCreateOpen(true) }

  const draftMat = MATERIALES.find(m => m.codigo === compDraft.codigo)

  const addComp = () => {
    if (!compDraft.codigo || !compDraft.cantidad || Number(compDraft.cantidad) <= 0) {
      notify('Seleccione un material y una cantidad válida', 'warning')
      return
    }
    setFormComps(prev => [...prev, compDraft])
    setCompDraft(EMPTY_COMP_DRAFT)
  }
  const removeComp = (i: number) => setFormComps(prev => prev.filter((_, idx) => idx !== i))

  const formCostoMP = formComps.reduce((s, c) => {
    const mat = MATERIALES.find(m => m.codigo === c.codigo)
    return s + (mat ? mat.costoUnitario * (Number(c.cantidad) || 0) : 0)
  }, 0)

  const nextCode = (cat: Categoria) => {
    const prefix = cat === 'Terminado' ? 'PT' : cat === 'Semielaborado' ? 'SE' : 'EMP'
    const nums = productos.filter(p => p.codigo.startsWith(prefix)).map(p => parseInt(p.codigo.replace(/\D/g, ''), 10) || 0)
    const n = (nums.length ? Math.max(...nums) : 0) + 1
    return `${prefix}-${String(n).padStart(3, '0')}`
  }

  const canSubmit = !!form.nombre.trim() && !!form.linea

  const handleCreate = () => {
    if (!canSubmit) {
      setTriedSubmit(true)
      notify('Complete los campos obligatorios: nombre y línea de producción', 'warning')
      return
    }
    const componentes: Componente[] = formComps.map(c => {
      const mat = MATERIALES.find(m => m.codigo === c.codigo)!
      return {
        codigo: mat.codigo, nombre: mat.nombre, cantidad: Number(c.cantidad) || 0,
        um: mat.um, merma: Number(c.merma) || 0, nivel: 1,
        costoUnitario: mat.costoUnitario, proveedor: mat.proveedor,
      }
    })
    const nuevo: Producto = {
      codigo: nextCode(form.categoria),
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      version: form.version || 'v1.0',
      estado: form.estado,
      um: form.um,
      linea: form.linea,
      responsable: form.responsable || 'Sin asignar',
      rendimiento: Number(form.rendimiento) || 0,
      tiempoProceso: Number(form.tiempoProceso) || 0,
      temperatura: form.temperatura || '—',
      costoMP: Math.round(formCostoMP),
      costoMO: 0,
      costoIF: 0,
      precioVenta: Number(form.precioVenta) || 0,
      componentes,
      ingredientes: [],
      rutas: [],
    }
    setProductos(prev => [nuevo, ...prev])
    setCreateOpen(false)
    notify(`BOM ${nuevo.codigo} creado con ${componentes.length} componente(s)`, 'success')
  }

  const handleDelete = (p: Producto) => {
    setProductos(prev => prev.filter(x => x.codigo !== p.codigo))
    setSelected(null)
    notify(`BOM ${p.codigo} eliminado`, 'warning')
  }

  const handleEcoDecision = (eco: ECO, estado: ECO['estado']) => {
    setEcos(prev => prev.map(e => e.numero === eco.numero ? { ...e, estado } : e))
    setSelEco(prev => prev ? { ...prev, estado } : prev)
    notify(`${eco.numero} marcado como ${estado}`, estado === 'RECHAZADO' ? 'warning' : 'success')
  }

  const tabSx = {
    '& .MuiTab-root': { color: '#9CA3AF', textTransform: 'none', fontWeight: 600 },
    '& .Mui-selected': { color: MES_COLOR },
    '& .MuiTabs-indicator': { backgroundColor: MES_COLOR },
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.15), color: MES_COLOR, display: 'flex' }}>
              <TreeIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#1E293B' }}>MES — BOM & Recetas</Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Lista de materiales, fórmulas de producción, ECOs y análisis de costos</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify('Exportando lista de materiales a Excel...', 'info')}
              sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
              Exportar
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
              Nuevo BOM
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabSx}>
            {['Productos & BOM', 'Recetas & Fórmulas', 'Cambios (ECO)', 'Costo BOM'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: Productos & BOM ────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            <Card sx={{ border: `1px solid ${alpha(MES_COLOR, 0.15)}`, borderRadius: 2, mb: 3 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                  <TextField size="small" placeholder="Buscar por código, nombre o línea..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 260, flex: '1 1 260px', ...inputSx }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                  <TextField select size="small" label="Categoría" value={filterCategoria}
                    onChange={e => setFilterCategoria(e.target.value)} sx={{ minWidth: 170, ...inputSx }}>
                    <MenuItem value="Todas">Todas</MenuItem>
                    {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Estado" value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
                    <MenuItem value="Todos">Todos</MenuItem>
                    {ESTADOS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                  </TextField>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                    {filtered.length} de {productos.length} productos
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

            {filtered.length === 0 && (
              <Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 6 }}>
                No hay productos que coincidan con los filtros.
              </Typography>
            )}

            <Grid container spacing={2}>
              {filtered.map(p => {
                const comps = flatten(p.componentes)
                const ct = costoTotal(p)
                return (
                  <Grid key={p.codigo} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card
                      onClick={() => openProducto(p)}
                      sx={{
                        border: '1px solid #E5E7EB', borderRadius: 2, cursor: 'pointer', height: '100%',
                        transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s',
                        '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.10)', transform: 'translateY(-2px)', borderColor: MES_COLOR },
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box sx={{ flex: 1, pr: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" sx={{ color: MES_COLOR, fontWeight: 800, fontFamily: 'monospace' }}>{p.codigo}</Typography>
                              <Chip label={p.version} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#F1F5F9', color: '#64748B' }} />
                            </Stack>
                            <Typography variant="subtitle2" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.25, mt: 0.25 }}>{p.nombre}</Typography>
                          </Box>
                          <Chip label={p.estado} size="small" sx={{ bgcolor: alpha(estadoProdColor(p.estado), 0.14), color: estadoProdColor(p.estado), fontWeight: 700, fontSize: 9 }} />
                        </Stack>
                        <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
                          <Chip label={p.categoria} size="small" sx={{ bgcolor: alpha(categoriaColor(p.categoria), 0.12), color: categoriaColor(p.categoria), border: `1px solid ${alpha(categoriaColor(p.categoria), 0.5)}`, fontSize: 10, fontWeight: 600 }} />
                          <Chip icon={<FactoryIcon sx={{ fontSize: 12 }} />} label={p.linea} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: 10, '& .MuiChip-icon': { color: '#94A3B8' } }} />
                        </Stack>
                        <Grid container spacing={1} mb={1.5}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Componentes</Typography>
                            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 700 }}>{comps.length}</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Rendimiento</Typography>
                            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 700 }}>{p.rendimiento}%</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Costo total</Typography>
                            <Typography variant="body2" sx={{ color: '#0F766E', fontWeight: 700 }}>{fmt(ct)}</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Margen</Typography>
                            <Typography variant="body2" sx={{ color: margen(p) >= 30 ? '#16A34A' : '#CA8A04', fontWeight: 700 }}>{margen(p).toFixed(1)}%</Typography>
                          </Grid>
                        </Grid>
                        <Divider sx={{ borderColor: '#F1F5F9', mb: 1 }} />
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <PersonIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                          <Typography variant="caption" sx={{ color: '#64748B' }} noWrap>{p.responsable}</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}

        {/* ── Tab 1: Recetas & Fórmulas ────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1E293B', mb: 2 }}>Producto activo</Typography>
                    <TextField select fullWidth size="small" label="Seleccionar producto" value={prodActivoCod}
                      onChange={e => setProdActivoCod(e.target.value)} sx={{ mb: 2, ...inputSx }}>
                      {productos.map(p => <MenuItem key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre}</MenuItem>)}
                    </TextField>

                    <Divider sx={{ borderColor: '#F1F5F9', mb: 2 }} />
                    <Stack spacing={1.5}>
                      {[
                        { label: 'Categoría', value: prodActivo.categoria },
                        { label: 'Versión activa', value: prodActivo.version },
                        { label: 'Rendimiento', value: `${prodActivo.rendimiento}%` },
                        { label: 'Tiempo proceso', value: `${prodActivo.tiempoProceso} min` },
                        { label: 'Temperatura', value: prodActivo.temperatura },
                        { label: 'Línea', value: prodActivo.linea },
                        { label: 'Responsable', value: prodActivo.responsable },
                      ].map((item, i) => (
                        <Stack key={i} direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: '#64748B' }}>{item.label}</Typography>
                          <Typography variant="caption" sx={{ color: '#1E293B', fontWeight: 600 }}>{item.value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    <Divider sx={{ borderColor: '#F1F5F9', my: 2 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Ingredientes</Typography>
                      <Chip label={`${prodActivo.ingredientes.length} en fórmula`} size="small" sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_DARK, fontWeight: 700 }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ScienceIcon sx={{ color: MES_COLOR, fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1E293B' }}>Ingredientes — {prodActivo.codigo} ({prodActivo.version})</Typography>
                      </Stack>
                      <Chip label={prodActivo.estado} size="small" sx={{ bgcolor: alpha(estadoProdColor(prodActivo.estado), 0.15), color: estadoProdColor(prodActivo.estado), fontWeight: 700 }} />
                    </Stack>
                  </CardContent>
                  {prodActivo.ingredientes.length === 0 ? (
                    <Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 5 }}>Este producto no tiene fórmula de ingredientes registrada.</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' } }}>
                            <TableCell>#</TableCell>
                            <TableCell>Ingrediente</TableCell>
                            <TableCell align="right">Cantidad</TableCell>
                            <TableCell align="right">%</TableCell>
                            <TableCell>UM</TableCell>
                            <TableCell align="center">Crítico</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {prodActivo.ingredientes.map(ing => (
                            <TableRow key={ing.orden}
                              onClick={() => setSelIngrediente(ing)}
                              sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: '1px solid #F1F5F9' }, '&:hover': { background: alpha(MES_COLOR, 0.04) } }}>
                              <TableCell><Typography variant="caption" sx={{ color: '#94A3B8' }}>{ing.orden}</Typography></TableCell>
                              <TableCell>{ing.ingrediente}</TableCell>
                              <TableCell align="right"><Typography fontWeight={600}>{ing.cantidad}</Typography></TableCell>
                              <TableCell align="right"><Typography variant="body2" sx={{ color: MES_COLOR }}>{ing.porcentaje}%</Typography></TableCell>
                              <TableCell>{ing.unidad}</TableCell>
                              <TableCell align="center">
                                {ing.esCritico
                                  ? <Chip label="CRÍTICO" size="small" sx={{ bgcolor: alpha('#DC2626', 0.12), color: '#DC2626', fontWeight: 700, fontSize: 9 }} />
                                  : <Typography variant="caption" sx={{ color: '#CBD5E1' }}>—</Typography>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 2: Cambios de Ingeniería (ECO) ───────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EngineeringIcon sx={{ color: MES_COLOR }} />
                <Typography variant="h6" sx={{ color: '#1E293B' }} fontWeight={700}>Engineering Change Orders (ECO)</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Todos ${ecos.length}`} size="small" clickable onClick={() => setFilterEcoEstado('Todos')}
                  sx={{ bgcolor: filterEcoEstado === 'Todos' ? MES_COLOR : '#F1F5F9', color: filterEcoEstado === 'Todos' ? '#fff' : '#64748B', fontWeight: 700, fontSize: 10 }} />
                {(['APROBADO', 'PENDIENTE', 'RECHAZADO'] as ECO['estado'][]).map(s => {
                  const active = filterEcoEstado === s
                  return (
                    <Chip key={s} label={`${s} ${ecos.filter(e => e.estado === s).length}`} size="small" clickable
                      onClick={() => setFilterEcoEstado(active ? 'Todos' : s)}
                      sx={{ bgcolor: active ? ecoEstadoColor(s) : alpha(ecoEstadoColor(s), 0.15), color: active ? '#fff' : ecoEstadoColor(s), fontWeight: 700, fontSize: 10 }} />
                  )
                })}
              </Stack>
            </Stack>

            <TableContainer component={Paper} sx={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' } }}>
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
                  {ecosFiltrados.map(eco => {
                    const stColor = ecoEstadoColor(eco.estado)
                    return (
                      <TableRow key={eco.numero} onClick={() => setSelEco(eco)}
                        sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: '1px solid #F1F5F9' }, '&:hover': { background: alpha(MES_COLOR, 0.04) } }}>
                        <TableCell><Typography variant="caption" sx={{ color: MES_COLOR, fontFamily: 'monospace', fontWeight: 700 }}>{eco.numero}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ maxWidth: 280 }}>{eco.descripcion}</Typography></TableCell>
                        <TableCell><Typography variant="caption" sx={{ color: '#64748B' }}>{eco.bomAfectado}</Typography></TableCell>
                        <TableCell align="center">
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>{eco.versionAnterior}</Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}> → </Typography>
                          <Typography variant="caption" sx={{ color: '#1E293B', fontWeight: 700 }}>{eco.versionNueva}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={eco.estado} size="small" sx={{ bgcolor: alpha(stColor, 0.15), color: stColor, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" sx={{ color: '#64748B' }}>{eco.fechaEfectiva}</Typography></TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} sx={{ color: eco.impactoCosto > 0 ? '#F97316' : '#16A34A' }}>
                            {eco.impactoCosto > 0 ? '+' : ''}{eco.impactoCosto.toLocaleString('es-CO')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {ecosFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={7}><Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 4 }}>Sin ECOs para el estado seleccionado.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 3: Costo BOM ─────────────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            <TextField select size="small" label="Producto" value={prodActivoCod}
              onChange={e => setProdActivoCod(e.target.value)} sx={{ minWidth: 320, mb: 3, ...inputSx }}>
              {productos.map(p => <MenuItem key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre}</MenuItem>)}
            </TextField>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <CostIcon sx={{ color: MES_COLOR, fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1E293B' }}>Costo Unitario — {prodActivo.codigo}</Typography>
                    </Stack>
                    <Stack spacing={2} mb={2}>
                      {[
                        { label: 'Materias Primas', value: prodActivo.costoMP, color: MES_COLOR },
                        { label: 'Mano de Obra Directa', value: prodActivo.costoMO, color: '#10B981' },
                        { label: 'Ind. de Fabricación', value: prodActivo.costoIF, color: '#8B5CF6' },
                      ].map((item, i) => {
                        const ct = costoTotal(prodActivo) || 1
                        const pct = Math.round(item.value / ct * 100)
                        return (
                          <Box key={i}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="body2" sx={{ color: '#334155' }}>{item.label}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" sx={{ color: '#64748B' }}>{pct}%</Typography>
                                <Typography variant="body2" sx={{ color: item.color }} fontWeight={700}>{fmt(item.value)}</Typography>
                              </Stack>
                            </Stack>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ height: 10, borderRadius: 5, bgcolor: '#EEF2F6', '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 5 } }} />
                          </Box>
                        )
                      })}
                    </Stack>
                    <Divider sx={{ borderColor: '#E5E7EB', my: 2 }} />
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: '#64748B' }}>Costo total unitario</Typography>
                        <Typography sx={{ color: '#1E293B' }} fontWeight={700}>{fmt(costoTotal(prodActivo))}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: '#64748B' }}>Precio de venta</Typography>
                        <Typography sx={{ color: MES_COLOR }} fontWeight={700}>{fmt(prodActivo.precioVenta)}</Typography>
                      </Stack>
                      <Divider sx={{ borderColor: '#F1F5F9' }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: '#334155' }} fontWeight={600}>Margen bruto</Typography>
                        <Typography sx={{ color: margen(prodActivo) >= 30 ? '#16A34A' : '#CA8A04' }} fontWeight={800} variant="h6">{margen(prodActivo).toFixed(1)}%</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <CardContent sx={{ pb: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1E293B' }}>Desglose por Componente</Typography>
                  </CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' } }}>
                          <TableCell>Código</TableCell>
                          <TableCell>Componente</TableCell>
                          <TableCell align="right">Costo/u</TableCell>
                          <TableCell align="right">Cantidad</TableCell>
                          <TableCell align="right">Costo Total</TableCell>
                          <TableCell align="right">% MP</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const comps = flatten(prodActivo.componentes)
                          const totalExt = comps.reduce((a, c) => a + nodeExt(c), 0) || 1
                          return comps.map((c, i) => {
                            const ext = nodeExt(c)
                            const pctMP = ext / totalExt * 100
                            return (
                              <TableRow key={`${c.codigo}-${i}`} onClick={() => setSelComp(c)}
                                sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: '1px solid #F1F5F9' }, '&:hover': { background: alpha(MES_COLOR, 0.04) } }}>
                                <TableCell><Typography variant="caption" sx={{ color: MES_COLOR, fontFamily: 'monospace', fontWeight: 700 }}>{c.codigo}</Typography></TableCell>
                                <TableCell><Typography variant="body2" sx={{ maxWidth: 200 }}>{c.nombre}</Typography></TableCell>
                                <TableCell align="right"><Typography variant="caption" sx={{ color: '#64748B' }}>{fmt(c.costoUnitario)}</Typography></TableCell>
                                <TableCell align="right">{c.cantidad} {c.um}</TableCell>
                                <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#0F766E' }}>{fmt(ext)}</Typography></TableCell>
                                <TableCell align="right">
                                  <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
                                    <Box sx={{ width: 40, height: 6, borderRadius: 3, bgcolor: '#EEF2F6' }}>
                                      <Box sx={{ height: '100%', width: `${Math.min(pctMP, 100)}%`, borderRadius: 3, bgcolor: MES_COLOR }} />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: MES_COLOR }} fontWeight={600}>{pctMP.toFixed(1)}%</Typography>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        })()}
                        <TableRow sx={{ '& td': { borderTop: `2px solid ${alpha(MES_COLOR, 0.3)}`, borderBottom: 'none' } }}>
                          <TableCell colSpan={4}><Typography sx={{ color: '#1E293B' }} fontWeight={700}>Total Materias Primas</Typography></TableCell>
                          <TableCell align="right"><Typography sx={{ color: MES_COLOR }} fontWeight={800}>{fmt(flatten(prodActivo.componentes).reduce((a, c) => a + nodeExt(c), 0))}</Typography></TableCell>
                          <TableCell align="right"><Typography sx={{ color: MES_COLOR }} fontWeight={700}>100%</Typography></TableCell>
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

      {/* ── Dialog: DETALLE DE PRODUCTO / BOM ── */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(categoriaColor(selected.categoria), 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TreeIcon sx={{ color: categoriaColor(selected.categoria) }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={13} fontWeight={800} sx={{ color: MES_COLOR, fontFamily: 'monospace' }}>{selected.codigo}</Typography>
                    <Chip label={selected.version} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#F1F5F9', color: '#64748B' }} />
                    <Chip label={selected.estado} size="small" sx={{ bgcolor: alpha(estadoProdColor(selected.estado), 0.15), color: estadoProdColor(selected.estado), fontWeight: 700, fontSize: 9 }} />
                  </Stack>
                  <Typography fontSize={15} fontWeight={700} sx={{ color: '#1E293B' }}>{selected.nombre}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2.5}>
                {/* Grilla de datos clave */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Categoría" value={selected.categoria} color={categoriaColor(selected.categoria)} />
                  <InfoTile label="Unidad" value={selected.um} />
                  <InfoTile label="Rendimiento" value={`${selected.rendimiento}%`} />
                  <InfoTile label="Tiempo proceso" value={<Stack direction="row" alignItems="center" spacing={0.5}><TimerIcon sx={{ fontSize: 14, color: MES_COLOR }} /><span>{selected.tiempoProceso} min</span></Stack>} />
                  <InfoTile label="Línea" value={<Stack direction="row" alignItems="center" spacing={0.5}><FactoryIcon sx={{ fontSize: 14, color: MES_COLOR }} /><span>{selected.linea}</span></Stack>} />
                  <InfoTile label="Temperatura" value={<Stack direction="row" alignItems="center" spacing={0.5}><ThermoIcon sx={{ fontSize: 14, color: MES_COLOR }} /><span>{selected.temperatura}</span></Stack>} />
                  <InfoTile label="Responsable" value={<Stack direction="row" alignItems="center" spacing={0.5}><PersonIcon sx={{ fontSize: 14, color: MES_COLOR }} /><span>{selected.responsable}</span></Stack>} />
                  <InfoTile label="Componentes" value={<Stack direction="row" alignItems="center" spacing={0.5}><LayersIcon sx={{ fontSize: 14, color: MES_COLOR }} /><span>{flatten(selected.componentes).length}</span></Stack>} />
                  <InfoTile label="Costo total" value={fmt(costoTotal(selected))} color="#0F766E" />
                  <InfoTile label="Precio venta" value={fmt(selected.precioVenta)} color={MES_COLOR} />
                  <InfoTile label="Margen bruto" value={`${margen(selected).toFixed(1)}%`} color={margen(selected) >= 30 ? '#16A34A' : '#CA8A04'} />
                  <InfoTile label="Ingredientes" value={String(selected.ingredientes.length)} />
                </Box>

                {/* Estructura BOM */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <TreeIcon sx={{ fontSize: 16, color: MES_COLOR }} />
                    <Typography fontSize={12} fontWeight={700} sx={{ color: '#1E293B' }} textTransform="uppercase" letterSpacing="0.04em">
                      Estructura BOM (multinivel)
                    </Typography>
                  </Stack>
                  <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                    <Stack direction="row" spacing={0} sx={{ px: 1.5, py: 0.75, bgcolor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, flex: 1, pl: 6 }}>Componente</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, minWidth: 78, textAlign: 'right' }}>Cant.</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, minWidth: 84, textAlign: 'right' }}>Costo</Typography>
                    </Stack>
                    {selected.componentes.map(node => (
                      <BOMNodeRow key={node.codigo} node={node} expanded={expanded} onToggle={toggleNode} />
                    ))}
                  </Box>
                </Box>

                {/* Rutas de fabricación */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <RouteIcon sx={{ fontSize: 16, color: '#8B5CF6' }} />
                    <Typography fontSize={12} fontWeight={700} sx={{ color: '#1E293B' }} textTransform="uppercase" letterSpacing="0.04em">
                      Ruta de fabricación ({selected.rutas.length})
                    </Typography>
                  </Stack>
                  {selected.rutas.length === 0 ? (
                    <Typography fontSize={12} sx={{ color: '#94A3B8' }}>Sin ruta de producción definida.</Typography>
                  ) : (
                    <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha('#8B5CF6', 0.06) }}>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Sec.</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Operación</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Máquina / Centro</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Setup</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Ciclo</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selected.rutas.map(r => (
                            <TableRow key={r.secuencia}>
                              <TableCell sx={{ borderColor: '#E5E7EB' }}>
                                <Avatar sx={{ width: 22, height: 22, bgcolor: alpha('#8B5CF6', 0.15), color: '#8B5CF6', fontSize: 10, fontWeight: 800 }}>{r.secuencia}</Avatar>
                              </TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{r.operacion}</TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }}>{r.maquina} <Typography component="span" variant="caption" sx={{ color: '#94A3B8' }}>({r.centro})</Typography></TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }} align="right">{r.tiempoSetup} min</TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12, fontWeight: 600 }} align="right">{r.tiempoCiclo} min</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button startIcon={<DeleteIcon />} onClick={() => handleDelete(selected)}
                sx={{ color: '#EF4444', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}>
                Eliminar
              </Button>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" startIcon={<CopyIcon />} onClick={() => notify(`BOM ${selected.codigo} duplicado como borrador`, 'success')}
                  sx={{ borderColor: '#E5E7EB', color: '#64748B', borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: '#CBD5E1', bgcolor: alpha('#64748B', 0.06) } }}>
                  Duplicar
                </Button>
                <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify(`Exportando ficha técnica de ${selected.codigo}...`, 'info')}
                  sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
                  Exportar ficha
                </Button>
                <Button variant="contained" startIcon={<EditIcon />} onClick={() => notify(`Abriendo editor del BOM ${selected.codigo}`, 'info')}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none', boxShadow: `0 4px 16px ${alpha(MES_COLOR, 0.35)}` }}>
                  Editar BOM
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: DETALLE DE INGREDIENTE ── */}
      <Dialog open={!!selIngrediente} onClose={() => setSelIngrediente(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selIngrediente && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScienceIcon sx={{ color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography fontSize={12} sx={{ color: '#64748B' }}>Ingrediente #{selIngrediente.orden}</Typography>
                  <Typography fontSize={15} fontWeight={700} sx={{ color: '#1E293B' }}>{selIngrediente.ingrediente}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelIngrediente(null)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                {selIngrediente.esCritico && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ bgcolor: alpha('#DC2626', 0.08), border: `1px solid ${alpha('#DC2626', 0.25)}`, borderRadius: '8px', p: 1.25 }}>
                    <WarnIcon sx={{ color: '#DC2626', fontSize: 18 }} />
                    <Typography fontSize={12} sx={{ color: '#B91C1C', fontWeight: 600 }}>Ingrediente crítico — control estricto de dosificación.</Typography>
                  </Stack>
                )}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoTile label="Cantidad" value={`${selIngrediente.cantidad} ${selIngrediente.unidad}`} />
                  <InfoTile label="Porcentaje" value={`${selIngrediente.porcentaje}%`} color={MES_COLOR} />
                  <InfoTile label="Orden de adición" value={String(selIngrediente.orden)} />
                  <InfoTile label="Criticidad" value={selIngrediente.esCritico ? 'CRÍTICO' : 'Normal'} color={selIngrediente.esCritico ? '#DC2626' : '#16A34A'} />
                </Box>
                <Box>
                  <Typography fontSize={11} fontWeight={700} sx={{ color: '#64748B' }} textTransform="uppercase" mb={0.5}>Notas de proceso</Typography>
                  <Typography fontSize={13} sx={{ color: '#334155' }}>{selIngrediente.notas}</Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setSelIngrediente(null)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: DETALLE DE COMPONENTE (costo) ── */}
      <Dialog open={!!selComp} onClose={() => setSelComp(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selComp && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CostIcon sx={{ color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography fontSize={12} sx={{ color: MES_COLOR, fontFamily: 'monospace', fontWeight: 700 }}>{selComp.codigo}</Typography>
                  <Typography fontSize={15} fontWeight={700} sx={{ color: '#1E293B' }}>{selComp.nombre}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelComp(null)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <InfoTile label="Cantidad" value={`${selComp.cantidad} ${selComp.um}`} />
                <InfoTile label="Merma" value={`${selComp.merma}%`} color={selComp.merma > 2 ? '#CA8A04' : '#16A34A'} />
                <InfoTile label="Costo unitario" value={fmt(selComp.costoUnitario)} />
                <InfoTile label="Costo extendido" value={fmt(nodeExt(selComp))} color="#0F766E" />
                <InfoTile label="Nivel BOM" value={String(selComp.nivel)} />
                <InfoTile label="Proveedor" value={selComp.proveedor ?? '—'} />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setSelComp(null)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: DETALLE DE ECO ── */}
      <Dialog open={!!selEco} onClose={() => setSelEco(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selEco && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(ecoEstadoColor(selEco.estado), 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EngineeringIcon sx={{ color: ecoEstadoColor(selEco.estado) }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={13} fontWeight={800} sx={{ color: MES_COLOR, fontFamily: 'monospace' }}>{selEco.numero}</Typography>
                    <Chip label={selEco.estado} size="small" sx={{ bgcolor: alpha(ecoEstadoColor(selEco.estado), 0.15), color: ecoEstadoColor(selEco.estado), fontWeight: 700, fontSize: 9 }} />
                  </Stack>
                  <Typography fontSize={13} sx={{ color: '#64748B' }}>{selEco.tipo}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelEco(null)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                <Box sx={{ bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                  <Typography fontSize={13} sx={{ color: '#334155' }}>{selEco.descripcion}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoTile label="BOM afectado" value={selEco.bomAfectado} />
                  <InfoTile label="Cambio de versión" value={`${selEco.versionAnterior} → ${selEco.versionNueva}`} color={MES_COLOR} />
                  <InfoTile label="Fecha efectiva" value={selEco.fechaEfectiva} />
                  <InfoTile label="Impacto en costo" value={`${selEco.impactoCosto > 0 ? '+' : ''}${selEco.impactoCosto.toLocaleString('es-CO')}`} color={selEco.impactoCosto > 0 ? '#F97316' : '#16A34A'} />
                  <InfoTile label="Solicitante" value={selEco.solicitante} />
                  <InfoTile label="Tipo de cambio" value={selEco.tipo} />
                </Box>
                <Box>
                  <Typography fontSize={11} fontWeight={700} sx={{ color: '#64748B' }} textTransform="uppercase" mb={0.5}>Justificación</Typography>
                  <Typography fontSize={13} sx={{ color: '#334155' }}>{selEco.justificacion}</Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button onClick={() => setSelEco(null)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>Cerrar</Button>
              {selEco.estado === 'PENDIENTE' && (
                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => handleEcoDecision(selEco, 'RECHAZADO')}
                    sx={{ borderColor: alpha('#DC2626', 0.4), color: '#DC2626', borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: '#DC2626', bgcolor: alpha('#DC2626', 0.06) } }}>
                    Rechazar
                  </Button>
                  <Button variant="contained" startIcon={<CheckIcon />} onClick={() => handleEcoDecision(selEco, 'APROBADO')}
                    sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
                    Aprobar
                  </Button>
                </Stack>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: NUEVO BOM ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize={16} sx={{ color: '#1E293B' }}>Nuevo BOM / Lista de materiales</Typography>
              <Typography fontSize={12} sx={{ color: '#64748B' }}>Defina el producto y agregue sus componentes</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setCreateOpen(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Stack spacing={2} mt={0.5}>
            {/* Encabezado del producto */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Nombre del producto *" value={form.nombre}
                onChange={e => setField('nombre', e.target.value)} sx={inputSx} placeholder="Ej. Producto Terminado Deluxe"
                error={triedSubmit && !form.nombre.trim()}
                helperText={triedSubmit && !form.nombre.trim() ? 'El nombre es obligatorio' : ' '} />
              <TextField fullWidth size="small" label="Código (auto)" value={nextCode(form.categoria)}
                InputProps={{ readOnly: true }} sx={inputSx} helperText="Se genera según la categoría" />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Categoría" value={form.categoria}
                onChange={e => setField('categoria', e.target.value)} sx={inputSx}>
                {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Unidad de medida" value={form.um}
                onChange={e => setField('um', e.target.value)} sx={inputSx}>
                {UNIDADES.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Estado" value={form.estado}
                onChange={e => setField('estado', e.target.value)} sx={inputSx}>
                {ESTADOS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Versión" value={form.version}
                onChange={e => setField('version', e.target.value)} sx={inputSx} placeholder="v1.0" />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Línea de producción *" value={form.linea}
                onChange={e => setField('linea', e.target.value)} sx={inputSx}
                error={triedSubmit && !form.linea}
                helperText={triedSubmit && !form.linea ? 'Seleccione la línea' : ' '}>
                {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Responsable" value={form.responsable}
                onChange={e => setField('responsable', e.target.value)} sx={inputSx} helperText=" ">
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {RESPONSABLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" type="number" label="Rendimiento (%)" value={form.rendimiento}
                onChange={e => setField('rendimiento', e.target.value)} sx={inputSx}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
              <TextField fullWidth size="small" type="number" label="Tiempo proceso (min)" value={form.tiempoProceso}
                onChange={e => setField('tiempoProceso', e.target.value)} sx={inputSx}
                InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }} />
              <TextField fullWidth size="small" label="Temperatura" value={form.temperatura}
                onChange={e => setField('temperatura', e.target.value)} sx={inputSx} placeholder="Ej. 175 ± 5°C" />
              <TextField fullWidth size="small" type="number" label="Precio de venta" value={form.precioVenta}
                onChange={e => setField('precioVenta', e.target.value)} sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Stack>

            <Divider sx={{ borderColor: '#E5E7EB' }}>
              <Typography fontSize={11} fontWeight={700} sx={{ color: '#64748B' }} textTransform="uppercase">Componentes</Typography>
            </Divider>

            {/* Agregar componente */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
              <TextField select size="small" label="Material" value={compDraft.codigo}
                onChange={e => setCompDraft(prev => ({ ...prev, codigo: e.target.value }))}
                sx={{ minWidth: 220, flex: 1, ...inputSx }}
                helperText={draftMat ? `${fmt(draftMat.costoUnitario)}/${draftMat.um} · ${draftMat.proveedor}` : 'Seleccione del catálogo'}>
                {MATERIALES.map(m => <MenuItem key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</MenuItem>)}
              </TextField>
              <TextField size="small" type="number" label="Cantidad" value={compDraft.cantidad}
                onChange={e => setCompDraft(prev => ({ ...prev, cantidad: e.target.value }))}
                sx={{ width: 110, ...inputSx }}
                InputProps={{ endAdornment: draftMat ? <InputAdornment position="end">{draftMat.um}</InputAdornment> : undefined }}
                helperText=" " />
              <TextField size="small" type="number" label="Merma (%)" value={compDraft.merma}
                onChange={e => setCompDraft(prev => ({ ...prev, merma: e.target.value }))}
                sx={{ width: 100, ...inputSx }} helperText=" " />
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addComp}
                sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '10px', fontWeight: 700, textTransform: 'none', mt: 0.25, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
                Agregar
              </Button>
            </Stack>

            {formComps.length > 0 ? (
              <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(MES_COLOR, 0.06) }}>
                      <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Código</TableCell>
                      <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Material</TableCell>
                      <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Cant.</TableCell>
                      <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Merma</TableCell>
                      <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Costo ext.</TableCell>
                      <TableCell sx={{ borderColor: '#E5E7EB' }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formComps.map((c, i) => {
                      const mat = MATERIALES.find(m => m.codigo === c.codigo)!
                      const ext = mat.costoUnitario * (Number(c.cantidad) || 0)
                      return (
                        <TableRow key={i}>
                          <TableCell sx={{ color: MES_COLOR, borderColor: '#E5E7EB', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{mat.codigo}</TableCell>
                          <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{mat.nombre}</TableCell>
                          <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }} align="right">{c.cantidad} {mat.um}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }} align="right">{c.merma}%</TableCell>
                          <TableCell sx={{ color: '#0F766E', borderColor: '#E5E7EB', fontSize: 12, fontWeight: 700 }} align="right">{fmt(ext)}</TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB' }} align="right">
                            <IconButton size="small" onClick={() => removeComp(i)} sx={{ color: '#EF4444' }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ color: '#1E293B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 12 }} colSpan={4}>Costo materia prima estimado</TableCell>
                      <TableCell sx={{ color: '#0F766E', borderColor: '#E5E7EB', fontWeight: 800, fontSize: 13 }} align="right">{fmt(formCostoMP)}</TableCell>
                      <TableCell sx={{ borderColor: '#E5E7EB' }} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography fontSize={12} sx={{ color: '#94A3B8', textAlign: 'center', py: 1 }}>
                Aún no se han agregado componentes. Puede crear el BOM y agregarlos luego.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!canSubmit}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none', px: 3 }}>
            Crear BOM
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
