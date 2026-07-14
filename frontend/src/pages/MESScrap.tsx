import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Card, CardContent, Divider, LinearProgress,
  TextField, MenuItem, Button, Select, FormControl, InputLabel, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, Alert,
  InputAdornment, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  DeleteSweep, Autorenew, EmojiObjects, Analytics,
  CircleOutlined, Warning, CheckCircle,
  Add as AddIcon, Close as CloseIcon, Search as SearchIcon,
  FileDownload as ExportIcon, Delete as DeleteIcon, History as HistoryIcon,
  Person as PersonIcon, Factory as FactoryIcon, Science as ScienceIcon,
  Inventory2 as ProductIcon, Build as MachineIcon, Scale as ScaleIcon,
  PlayArrow as PlayIcon, Straighten as MetricIcon, PrecisionManufacturing as ReprocIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'

// ─── Types ────────────────────────────────────────────────────────────────────
type TipoScrap    = 'MATERIAL' | 'PROCESO' | 'CONFIGURACIÓN' | 'OPERADOR'
type EstadoReproc = 'PENDIENTE' | 'EN PROCESO' | 'COMPLETADO'
type EstadoScrap  = 'ABIERTO' | 'EN ANÁLISIS' | 'CERRADO'

interface ScrapMov { fecha: string; evento: string; detalle: string }

interface ScrapRow {
  id: string; fecha: string; op: string; producto: string; linea: string; maquina: string
  turno: string; lote: string; tipo: TipoScrap; causa: string; causaRaiz: string
  cantidad: number; unidad: string; costoUnit: number; costo: number
  operario: string; supervisor: string; reprocesable: boolean; disposicion: string
  estado: EstadoScrap; accionCorrectiva: string; historial: ScrapMov[]
}

interface ReprocRow {
  id: string; opOrigen: string; producto: string; linea: string; cantidad: number; unidad: string
  causa: string; estado: EstadoReproc; fecha: string; responsable: string
  tiempoEstimado: number; costoEstimado: number; avance: number; descripcion: string
}

interface Kaizen {
  id: string; nombre: string; area: string; lider: string; avance: number; dias: number
  objetivo: string; ahorroEstimado: number; inicio: string; acciones: string[]
}

interface LineaScrap {
  linea: string; maquina: string; kg: number; pct: number; costo: number
  productoTop: string; causaTop: string; unidades: number; tendencia: string
}

// ─── Catálogos (para formularios de alto nivel) ─────────────────────────────────
const LINEAS = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 5']
const MAQUINA_POR_LINEA: Record<string, string> = {
  'Línea 1': 'Extrusora EX-01',
  'Línea 2': 'Inyectora IN-02',
  'Línea 3': 'Prensa PR-03',
  'Línea 4': 'Termoformadora TF-04',
  'Línea 5': 'Selladora SL-05',
}
const PRODUCTOS = ['Ref. A-120', 'Ref. B-340', 'Ref. C-220', 'Ref. D-100', 'Ref. E-500']
const TURNOS = ['Turno 1 (06-14)', 'Turno 2 (14-22)', 'Turno 3 (22-06)']
const OPERARIOS = ['J. Martínez', 'A. Torres', 'L. Peña', 'C. Ruiz', 'M. García', 'P. López']
const SUPERVISORES = ['R. Gómez', 'S. Castro', 'D. Herrera']
const UNIDADES = ['kg', 'uds', 'L', 'm']
const DISPOSICIONES = ['Desecho', 'Reproceso', 'Reciclaje', 'Cuarentena']

const CAUSAS_CATALOGO: { causa: string; tipo: TipoScrap; causaRaiz: string }[] = [
  { causa: 'Temperatura excesiva',       tipo: 'PROCESO',       causaRaiz: 'Control PID descalibrado' },
  { causa: 'Setup incorrecto',           tipo: 'CONFIGURACIÓN', causaRaiz: 'Falta de estandarización SMED' },
  { causa: 'MP fuera de spec',           tipo: 'MATERIAL',      causaRaiz: 'Proveedor sin certificación de lote' },
  { causa: 'Error humano',               tipo: 'OPERADOR',      causaRaiz: 'Capacitación insuficiente' },
  { causa: 'Desgaste herramienta',       tipo: 'PROCESO',       causaRaiz: 'Mantenimiento preventivo vencido' },
  { causa: 'Parámetro mal configurado',  tipo: 'CONFIGURACIÓN', causaRaiz: 'Receta de proceso no validada' },
  { causa: 'Contaminación',              tipo: 'MATERIAL',      causaRaiz: 'Limpieza de tolva deficiente' },
  { causa: 'Velocidad excesiva',         tipo: 'PROCESO',       causaRaiz: 'Override manual del operario' },
  { causa: 'Mal manejo de material',     tipo: 'OPERADOR',      causaRaiz: 'Procedimiento de manipulación no seguido' },
  { causa: 'Vibración excesiva',         tipo: 'PROCESO',       causaRaiz: 'Anclaje de máquina flojo' },
]

// ─── Mock Data ────────────────────────────────────────────────────────────────
const SCRAP_MOCK: ScrapRow[] = [
  { id: 'SC-0812', fecha: '20/06', op: 'OP-0812', producto: 'Ref. A-120', linea: 'Línea 1', maquina: 'Extrusora EX-01', turno: 'Turno 1 (06-14)', lote: 'L-24061', tipo: 'PROCESO', causa: 'Temperatura excesiva', causaRaiz: 'Control PID descalibrado', cantidad: 48, unidad: 'kg', costoUnit: 20000, costo: 960000, operario: 'J. Martínez', supervisor: 'R. Gómez', reprocesable: false, disposicion: 'Desecho', estado: 'CERRADO', accionCorrectiva: 'Recalibración de lazo PID y verificación de termopar.', historial: [
    { fecha: '20/06 08:12', evento: 'Registro creado', detalle: 'Detectado por control de calidad en línea' },
    { fecha: '20/06 10:40', evento: 'Análisis de causa', detalle: 'Termopar con deriva > 8°C' },
    { fecha: '21/06 09:00', evento: 'Cierre', detalle: 'Acción correctiva verificada' },
  ] },
  { id: 'SC-0813', fecha: '20/06', op: 'OP-0813', producto: 'Ref. B-340', linea: 'Línea 2', maquina: 'Inyectora IN-02', turno: 'Turno 2 (14-22)', lote: 'L-24062', tipo: 'CONFIGURACIÓN', causa: 'Setup incorrecto', causaRaiz: 'Falta de estandarización SMED', cantidad: 32, unidad: 'kg', costoUnit: 40000, costo: 1280000, operario: 'A. Torres', supervisor: 'S. Castro', reprocesable: true, disposicion: 'Reproceso', estado: 'EN ANÁLISIS', accionCorrectiva: 'Elaborar hoja de setup estandarizada.', historial: [
    { fecha: '20/06 15:20', evento: 'Registro creado', detalle: 'Cambio de referencia sin verificación' },
    { fecha: '20/06 16:05', evento: 'Derivado a reproceso', detalle: 'Material recuperable' },
  ] },
  { id: 'SC-0801', fecha: '19/06', op: 'OP-0801', producto: 'Ref. C-220', linea: 'Línea 3', maquina: 'Prensa PR-03', turno: 'Turno 1 (06-14)', lote: 'L-24055', tipo: 'MATERIAL', causa: 'MP fuera de spec', causaRaiz: 'Proveedor sin certificación de lote', cantidad: 120, unidad: 'kg', costoUnit: 20000, costo: 2400000, operario: 'L. Peña', supervisor: 'R. Gómez', reprocesable: false, disposicion: 'Cuarentena', estado: 'EN ANÁLISIS', accionCorrectiva: 'Reclamo a proveedor y bloqueo de lote MP.', historial: [
    { fecha: '19/06 07:45', evento: 'Registro creado', detalle: 'Densidad fuera de rango' },
    { fecha: '19/06 11:00', evento: 'Cuarentena', detalle: 'Lote de MP retenido' },
  ] },
  { id: 'SC-0802', fecha: '19/06', op: 'OP-0802', producto: 'Ref. A-120', linea: 'Línea 1', maquina: 'Extrusora EX-01', turno: 'Turno 3 (22-06)', lote: 'L-24056', tipo: 'OPERADOR', causa: 'Error humano', causaRaiz: 'Capacitación insuficiente', cantidad: 18, unidad: 'kg', costoUnit: 20000, costo: 360000, operario: 'C. Ruiz', supervisor: 'D. Herrera', reprocesable: true, disposicion: 'Reproceso', estado: 'CERRADO', accionCorrectiva: 'Refuerzo de entrenamiento operativo.', historial: [
    { fecha: '19/06 23:30', evento: 'Registro creado', detalle: 'Arranque sin purga previa' },
    { fecha: '20/06 08:00', evento: 'Cierre', detalle: 'Reprocesado con éxito' },
  ] },
  { id: 'SC-0795', fecha: '19/06', op: 'OP-0795', producto: 'Ref. D-100', linea: 'Línea 4', maquina: 'Termoformadora TF-04', turno: 'Turno 2 (14-22)', lote: 'L-24050', tipo: 'PROCESO', causa: 'Desgaste herramienta', causaRaiz: 'Mantenimiento preventivo vencido', cantidad: 85, unidad: 'kg', costoUnit: 20000, costo: 1700000, operario: 'M. García', supervisor: 'S. Castro', reprocesable: false, disposicion: 'Reciclaje', estado: 'ABIERTO', accionCorrectiva: 'Generar OT de mantenimiento del molde.', historial: [
    { fecha: '19/06 17:10', evento: 'Registro creado', detalle: 'Rebabas por molde desgastado' },
  ] },
  { id: 'SC-0789', fecha: '18/06', op: 'OP-0789', producto: 'Ref. B-340', linea: 'Línea 2', maquina: 'Inyectora IN-02', turno: 'Turno 1 (06-14)', lote: 'L-24044', tipo: 'CONFIGURACIÓN', causa: 'Parámetro mal configurado', causaRaiz: 'Receta de proceso no validada', cantidad: 60, unidad: 'kg', costoUnit: 40000, costo: 2400000, operario: 'P. López', supervisor: 'R. Gómez', reprocesable: true, disposicion: 'Reproceso', estado: 'CERRADO', accionCorrectiva: 'Validar y bloquear receta en HMI.', historial: [
    { fecha: '18/06 09:20', evento: 'Registro creado', detalle: 'Presión de inyección fuera de receta' },
    { fecha: '18/06 14:00', evento: 'Cierre', detalle: 'Receta corregida y validada' },
  ] },
  { id: 'SC-0790', fecha: '18/06', op: 'OP-0790', producto: 'Ref. E-500', linea: 'Línea 5', maquina: 'Selladora SL-05', turno: 'Turno 3 (22-06)', lote: 'L-24045', tipo: 'MATERIAL', causa: 'Contaminación', causaRaiz: 'Limpieza de tolva deficiente', cantidad: 200, unidad: 'kg', costoUnit: 18000, costo: 3600000, operario: 'J. Martínez', supervisor: 'D. Herrera', reprocesable: false, disposicion: 'Desecho', estado: 'EN ANÁLISIS', accionCorrectiva: 'Instaurar checklist de limpieza de tolva por turno.', historial: [
    { fecha: '18/06 22:50', evento: 'Registro creado', detalle: 'Puntos negros en producto' },
    { fecha: '19/06 06:30', evento: 'Análisis de causa', detalle: 'Residuos de lote anterior en tolva' },
  ] },
  { id: 'SC-0780', fecha: '17/06', op: 'OP-0780', producto: 'Ref. C-220', linea: 'Línea 3', maquina: 'Prensa PR-03', turno: 'Turno 2 (14-22)', lote: 'L-24038', tipo: 'PROCESO', causa: 'Velocidad excesiva', causaRaiz: 'Override manual del operario', cantidad: 45, unidad: 'kg', costoUnit: 20000, costo: 900000, operario: 'A. Torres', supervisor: 'S. Castro', reprocesable: false, disposicion: 'Reciclaje', estado: 'CERRADO', accionCorrectiva: 'Bloquear override de velocidad por perfil.', historial: [
    { fecha: '17/06 16:40', evento: 'Registro creado', detalle: 'Deformación por sobrevelocidad' },
    { fecha: '18/06 08:10', evento: 'Cierre', detalle: 'Permisos de HMI ajustados' },
  ] },
  { id: 'SC-0781', fecha: '17/06', op: 'OP-0781', producto: 'Ref. A-120', linea: 'Línea 1', maquina: 'Extrusora EX-01', turno: 'Turno 1 (06-14)', lote: 'L-24039', tipo: 'OPERADOR', causa: 'Mal manejo de material', causaRaiz: 'Procedimiento de manipulación no seguido', cantidad: 22, unidad: 'kg', costoUnit: 20000, costo: 440000, operario: 'L. Peña', supervisor: 'R. Gómez', reprocesable: true, disposicion: 'Reproceso', estado: 'CERRADO', accionCorrectiva: 'Reinducción en manejo de material.', historial: [
    { fecha: '17/06 09:05', evento: 'Registro creado', detalle: 'Contaminación por manipulación' },
    { fecha: '17/06 15:00', evento: 'Cierre', detalle: 'Reprocesado' },
  ] },
  { id: 'SC-0771', fecha: '16/06', op: 'OP-0771', producto: 'Ref. D-100', linea: 'Línea 4', maquina: 'Termoformadora TF-04', turno: 'Turno 2 (14-22)', lote: 'L-24030', tipo: 'PROCESO', causa: 'Vibración excesiva', causaRaiz: 'Anclaje de máquina flojo', cantidad: 70, unidad: 'kg', costoUnit: 20000, costo: 1400000, operario: 'C. Ruiz', supervisor: 'D. Herrera', reprocesable: false, disposicion: 'Desecho', estado: 'ABIERTO', accionCorrectiva: 'Reapriete de anclajes y verificación de nivelación.', historial: [
    { fecha: '16/06 15:30', evento: 'Registro creado', detalle: 'Espesor irregular por vibración' },
  ] },
]

const tendencia6m = [
  { mes: 'Ene', rate: 2.8 }, { mes: 'Feb', rate: 2.5 }, { mes: 'Mar', rate: 2.3 },
  { mes: 'Abr', rate: 2.4 }, { mes: 'May', rate: 2.2 }, { mes: 'Jun', rate: 2.1 },
]

const REPROC_MOCK: ReprocRow[] = [
  { id: 'RP-0813', opOrigen: 'OP-0813', producto: 'Ref. B-340', linea: 'Línea 2', cantidad: 32,  unidad: 'uds', causa: 'Setup incorrecto',     estado: 'EN PROCESO', fecha: '20/06', responsable: 'A. Torres',   tiempoEstimado: 4,  costoEstimado: 640000,  avance: 55, descripcion: 'Regranulado y reinyección del material recuperable.' },
  { id: 'RP-0802', opOrigen: 'OP-0802', producto: 'Ref. A-120', linea: 'Línea 1', cantidad: 18,  unidad: 'uds', causa: 'Error operador',       estado: 'COMPLETADO', fecha: '19/06', responsable: 'C. Ruiz',     tiempoEstimado: 2,  costoEstimado: 220000,  avance: 100, descripcion: 'Reproceso de arranque, material reintegrado a producción.' },
  { id: 'RP-0789', opOrigen: 'OP-0789', producto: 'Ref. B-340', linea: 'Línea 2', cantidad: 60,  unidad: 'uds', causa: 'Parámetro incorrecto', estado: 'COMPLETADO', fecha: '18/06', responsable: 'P. López',    tiempoEstimado: 6,  costoEstimado: 900000,  avance: 100, descripcion: 'Corrección de receta y reinyección.' },
  { id: 'RP-0781', opOrigen: 'OP-0781', producto: 'Ref. A-120', linea: 'Línea 1', cantidad: 22,  unidad: 'uds', causa: 'Mal manejo',          estado: 'COMPLETADO', fecha: '17/06', responsable: 'L. Peña',     tiempoEstimado: 2,  costoEstimado: 260000,  avance: 100, descripcion: 'Limpieza y reproceso del material contaminado.' },
  { id: 'RP-0765', opOrigen: 'OP-0765', producto: 'Ref. E-500', linea: 'Línea 5', cantidad: 90,  unidad: 'uds', causa: 'Lote fuera de spec',   estado: 'PENDIENTE',  fecha: '15/06', responsable: 'M. García',   tiempoEstimado: 8,  costoEstimado: 1200000, avance: 0,  descripcion: 'Pendiente de liberación de calidad para reproceso.' },
  { id: 'RP-0754', opOrigen: 'OP-0754', producto: 'Ref. C-220', linea: 'Línea 3', cantidad: 45,  unidad: 'uds', causa: 'Temperatura',         estado: 'EN PROCESO', fecha: '14/06', responsable: 'A. Torres',   tiempoEstimado: 5,  costoEstimado: 700000,  avance: 40, descripcion: 'Reproceso térmico bajo perfil corregido.' },
  { id: 'RP-0741', opOrigen: 'OP-0741', producto: 'Ref. D-100', linea: 'Línea 4', cantidad: 120, unidad: 'uds', causa: 'Dimensión',           estado: 'COMPLETADO', fecha: '12/06', responsable: 'C. Ruiz',     tiempoEstimado: 10, costoEstimado: 1500000, avance: 100, descripcion: 'Retrabajo dimensional y verificación con calibre.' },
  { id: 'RP-0730', opOrigen: 'OP-0730', producto: 'Ref. A-120', linea: 'Línea 1', cantidad: 38,  unidad: 'uds', causa: 'Contaminación menor', estado: 'PENDIENTE',  fecha: '10/06', responsable: 'L. Peña',     tiempoEstimado: 3,  costoEstimado: 400000,  avance: 0,  descripcion: 'A la espera de disponibilidad de línea.' },
]

const KAIZENS_MOCK: Kaizen[] = [
  { id: 'KZ-01', nombre: 'Reducción tiempo setup L-1', area: 'Línea 1', lider: 'J. Martínez', avance: 72, dias: 8,  objetivo: 'Reducir setup de 45 a 18 min', ahorroEstimado: 4200000, inicio: '05/06', acciones: ['Mapear actividades internas/externas', 'Preparar carro de herramientas SMED', 'Estandarizar hoja de cambio'] },
  { id: 'KZ-02', nombre: 'Estandarización 5S almacén', area: 'Almacén',  lider: 'A. Torres',   avance: 45, dias: 14, objetivo: 'Alcanzar 90% en auditoría 5S', ahorroEstimado: 2100000, inicio: '02/06', acciones: ['Clasificar y descartar obsoletos', 'Demarcar zonas de piso', 'Implementar tableros de sombra'] },
  { id: 'KZ-03', nombre: 'Eliminación movimientos NVA', area: 'Línea 3', lider: 'L. Peña',     avance: 88, dias: 3,  objetivo: 'Reducir 30% recorridos operario', ahorroEstimado: 3600000, inicio: '28/05', acciones: ['Diagrama spaghetti', 'Reubicar insumos a punto de uso', 'Balancear estación'] },
  { id: 'KZ-04', nombre: 'Mejora flujo de materiales',  area: 'Picking',  lider: 'C. Ruiz',     avance: 30, dias: 21, objetivo: 'Implementar flujo continuo', ahorroEstimado: 5400000, inicio: '10/06', acciones: ['Análisis de flujo actual', 'Diseñar supermercado', 'Definir kanban de reposición'] },
  { id: 'KZ-05', nombre: 'Control visual de proceso',   area: 'Línea 2',  lider: 'M. García',   avance: 60, dias: 10, objetivo: 'Tableros andon en 3 estaciones', ahorroEstimado: 1800000, inicio: '01/06', acciones: ['Definir indicadores clave', 'Instalar tableros visuales', 'Capacitar en gestión visual'] },
]

const cincoS = [
  { s: 'Seiri (Clasificar)',    pct: 88, area: 'Promedio' },
  { s: 'Seiton (Ordenar)',      pct: 82, area: 'Promedio' },
  { s: 'Seiso (Limpiar)',       pct: 91, area: 'Promedio' },
  { s: 'Seiketsu (Estandarizar)', pct: 76, area: 'Promedio' },
  { s: 'Shitsuke (Disciplina)', pct: 71, area: 'Promedio' },
]

const smedRows = [
  { referencia: 'Ref. A-120', antes: 45, despues: 18, reduccion: 60, objetivo: 12 },
  { referencia: 'Ref. B-340', antes: 52, despues: 24, reduccion: 54, objetivo: 18 },
  { referencia: 'Ref. C-220', antes: 38, despues: 16, reduccion: 58, objetivo: 10 },
  { referencia: 'Ref. D-100', antes: 61, despues: 28, reduccion: 54, objetivo: 20 },
]

const causasScrap = [
  { causa: 'Temperatura excesiva',   kg: 820, pct: 29 },
  { causa: 'MP fuera de spec',       kg: 740, pct: 26 },
  { causa: 'Setup incorrecto',       kg: 580, pct: 20 },
  { causa: 'Desgaste herramienta',   kg: 420, pct: 15 },
  { causa: 'Error operador',         kg: 280, pct: 10 },
]

const LINEAS_SCRAP: LineaScrap[] = [
  { linea: 'Línea 1', maquina: 'Extrusora EX-01',      kg: 710, pct: 2.8, costo: 12400000, productoTop: 'Ref. A-120', causaTop: 'Temperatura excesiva', unidades: 1420, tendencia: '↓ 0.3 pp vs mes ant.' },
  { linea: 'Línea 2', maquina: 'Inyectora IN-02',      kg: 620, pct: 2.3, costo: 10800000, productoTop: 'Ref. B-340', causaTop: 'Setup incorrecto',     unidades: 1240, tendencia: '↓ 0.2 pp vs mes ant.' },
  { linea: 'Línea 3', maquina: 'Prensa PR-03',         kg: 540, pct: 2.0, costo:  9200000, productoTop: 'Ref. C-220', causaTop: 'Velocidad excesiva',   unidades: 1080, tendencia: '→ estable' },
  { linea: 'Línea 4', maquina: 'Termoformadora TF-04', kg: 480, pct: 1.8, costo:  8400000, productoTop: 'Ref. D-100', causaTop: 'Desgaste herramienta', unidades: 960,  tendencia: '↓ 0.4 pp vs mes ant.' },
  { linea: 'Línea 5', maquina: 'Selladora SL-05',      kg: 490, pct: 1.7, costo:  7400000, productoTop: 'Ref. E-500', causaTop: 'Contaminación',        unidades: 980,  tendencia: '↓ 0.1 pp vs mes ant.' },
]

const sparkline = [2.4, 2.1, 2.3, 1.9, 2.0, 2.2, 2.5, 2.1, 1.8, 2.0]

// ─── Helpers ──────────────────────────────────────────────────────────────────
type Notify = (msg: string, sev?: 'success' | 'info' | 'warning' | 'error') => void

const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B' },
  '& label': { color: '#64748B' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(8,145,178,0.25)' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(8,145,178,0.5)' },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

function TipoScrapChip({ t }: { t: TipoScrap }) {
  const map: Record<TipoScrap, string> = { MATERIAL: '#7c3aed', PROCESO: MES_COLOR, 'CONFIGURACIÓN': '#ea580c', OPERADOR: '#d97706' }
  return <Chip label={t} size="small" sx={{ bgcolor: map[t], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function EstadoReprocChip({ e }: { e: EstadoReproc }) {
  const map: Record<EstadoReproc, string> = { PENDIENTE: '#64748b', 'EN PROCESO': MES_COLOR, COMPLETADO: '#16a34a' }
  return <Chip label={e} size="small" sx={{ bgcolor: map[e], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

const ESTADO_SCRAP_COLOR: Record<EstadoScrap, string> = { ABIERTO: '#dc2626', 'EN ANÁLISIS': '#d97706', CERRADO: '#16a34a' }
function EstadoScrapChip({ e }: { e: EstadoScrap }) {
  return <Chip label={e} size="small" sx={{ bgcolor: ESTADO_SCRAP_COLOR[e], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function semaforoColor(pct: number) {
  if (pct <= 1.5) return '#22c55e'
  if (pct <= 2.0) return '#f59e0b'
  return '#ef4444'
}

function money(n: number) { return `$${n.toLocaleString('es-CO')}` }

function InfoTile({ label, value, color = '#1E293B' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25 }}>
      <Typography fontSize={10} color="#64748B" fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
      <Typography fontSize={13} fontWeight={600} sx={{ color }}>{value}</Typography>
    </Box>
  )
}

// ─── Formulario Nuevo Scrap ─────────────────────────────────────────────────────
interface NewScrapForm {
  producto: string; linea: string; maquina: string; turno: string; lote: string
  op: string; causa: string; tipo: TipoScrap; causaRaiz: string; cantidad: string
  unidad: string; costoUnit: string; operario: string; supervisor: string
  disposicion: string; reprocesable: string; accionCorrectiva: string
}
const EMPTY_SCRAP: NewScrapForm = {
  producto: '', linea: '', maquina: '', turno: TURNOS[0], lote: '', op: '',
  causa: '', tipo: 'PROCESO', causaRaiz: '', cantidad: '', unidad: 'kg',
  costoUnit: '', operario: '', supervisor: '', disposicion: 'Desecho',
  reprocesable: 'NO', accionCorrectiva: '',
}

// ─── Tab 0: Scrap & Mermas ────────────────────────────────────────────────────
function ScrapTab({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<ScrapRow[]>(SCRAP_MOCK)
  const [selected, setSelected] = useState<ScrapRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<NewScrapForm>(EMPTY_SCRAP)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const [search, setSearch] = useState('')
  const [fLinea, setFLinea] = useState('Todas')
  const [fCausa, setFCausa] = useState('Todas')
  const [fTipo, setFTipo] = useState('Todos')

  const causasUnicas = useMemo(() => Array.from(new Set(rows.map(r => r.causa))).sort(), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (fLinea !== 'Todas' && r.linea !== fLinea) return false
    if (fCausa !== 'Todas' && r.causa !== fCausa) return false
    if (fTipo !== 'Todos' && r.tipo !== fTipo) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.op.toLowerCase().includes(q) && !r.producto.toLowerCase().includes(q) &&
          !r.id.toLowerCase().includes(q) && !r.operario.toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, fLinea, fCausa, fTipo, search])

  const hayFiltros = search || fLinea !== 'Todas' || fCausa !== 'Todas' || fTipo !== 'Todos'
  const resetFiltros = () => { setSearch(''); setFLinea('Todas'); setFCausa('Todas'); setFTipo('Todos') }

  const totalCosto = useMemo(() => rows.reduce((s, r) => s + r.costo, 0), [rows])

  const setField = (f: keyof NewScrapForm, v: string) => setForm(prev => ({ ...prev, [f]: v }))

  const openCreate = () => { setForm(EMPTY_SCRAP); setTriedSubmit(false); setCreateOpen(true) }

  const formValido = !!form.producto && !!form.linea && !!form.causa &&
    !!form.cantidad && Number(form.cantidad) > 0 && !!form.costoUnit && Number(form.costoUnit) > 0

  const handleCreate = () => {
    if (!formValido) {
      setTriedSubmit(true)
      notify('Complete los campos obligatorios: producto, línea, causa, cantidad y costo unitario', 'warning')
      return
    }
    const cant = Number(form.cantidad)
    const cu = Number(form.costoUnit)
    const hoy = new Date()
    const fecha = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}`
    const num = rows.length + 1
    const nueva: ScrapRow = {
      id: `SC-${String(900 + num)}`,
      fecha,
      op: form.op || `OP-${String(900 + num)}`,
      producto: form.producto,
      linea: form.linea,
      maquina: form.maquina || MAQUINA_POR_LINEA[form.linea] || '—',
      turno: form.turno,
      lote: form.lote || `L-${hoy.getFullYear().toString().slice(2)}${String(num).padStart(3, '0')}`,
      tipo: form.tipo,
      causa: form.causa,
      causaRaiz: form.causaRaiz || 'Por determinar',
      cantidad: cant,
      unidad: form.unidad,
      costoUnit: cu,
      costo: cant * cu,
      operario: form.operario || 'Sin asignar',
      supervisor: form.supervisor || 'Sin asignar',
      reprocesable: form.reprocesable === 'SÍ',
      disposicion: form.disposicion,
      estado: 'ABIERTO',
      accionCorrectiva: form.accionCorrectiva || 'Pendiente de definir.',
      historial: [{ fecha: `${fecha} ${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`, evento: 'Registro creado', detalle: 'Registro manual de scrap' }],
    }
    setRows(prev => [nueva, ...prev])
    setCreateOpen(false)
    notify(`Scrap ${nueva.id} registrado (${money(nueva.costo)})`, 'success')
  }

  const handleDelete = (row: ScrapRow) => {
    setRows(prev => prev.filter(r => r.id !== row.id))
    setSelected(null)
    notify(`Registro ${row.id} eliminado`, 'warning')
  }

  const handleReproc = (row: ScrapRow) => {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, disposicion: 'Reproceso', estado: 'EN ANÁLISIS' } : r))
    setSelected(s => s ? { ...s, disposicion: 'Reproceso', estado: 'EN ANÁLISIS' } : s)
    notify(`Orden de reproceso generada desde ${row.id}`, 'success')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header acciones */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>Registros de Scrap</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify('Exportando registros de scrap a Excel...', 'info')}
            sx={{ borderColor: 'rgba(8,145,178,0.4)', color: MES_DARK, borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
            Exportar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
            Registrar scrap
          </Button>
        </Stack>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2}>
        {[
          { label: 'Scrap Mes',    value: '2,840 kg', sub: money(totalCosto),  color: '#ef4444' },
          { label: 'Scrap Rate',   value: '2.1%',     sub: 'del total prod', color: '#f97316' },
          { label: 'Meta Scrap',   value: '< 1.5%',   sub: 'objetivo mes', color: '#16a34a' },
          { label: 'Brecha',       value: '0.6 pp',   sub: 'por encima meta', color: '#dc2626' },
        ].map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Card sx={{ border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 26, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 11, mt: 0.3 }}>{k.sub}</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 10, mt: 0.3, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Card sx={{ border: '1px solid rgba(8,145,178,0.15)', borderRadius: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField size="small" placeholder="Buscar por OP, producto, código u operario..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 260, flex: '1 1 260px', ...inputSx }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
            <TextField select size="small" label="Línea" value={fLinea} onChange={(e) => setFLinea(e.target.value)} sx={{ minWidth: 140, ...inputSx }}>
              <MenuItem value="Todas">Todas</MenuItem>
              {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Causa" value={fCausa} onChange={(e) => setFCausa(e.target.value)} sx={{ minWidth: 180, ...inputSx }}>
              <MenuItem value="Todas">Todas</MenuItem>
              {causasUnicas.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Tipo" value={fTipo} onChange={(e) => setFTipo(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
              {['Todos', 'MATERIAL', 'PROCESO', 'CONFIGURACIÓN', 'OPERADOR'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>{filtered.length} de {rows.length} registros</Typography>
            {hayFiltros && (
              <Button size="small" variant="outlined" onClick={resetFiltros}
                sx={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', '&:hover': { bgcolor: alpha('#EF4444', 0.08), borderColor: '#EF4444' }, fontWeight: 600, fontSize: 11 }}>
                Limpiar
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Tabla scrap */}
      <Box>
        <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                {['Código', 'Fecha', 'OP', 'Producto', 'Línea', 'Tipo', 'Causa', 'Cantidad', 'Costo Est.', 'Operario', 'Estado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} onClick={() => setSelected(row)}
                  sx={{ cursor: 'pointer', transition: 'background 0.15s', '&:hover': { bgcolor: `${MES_COLOR}12` } }}>
                  <TableCell sx={{ color: MES_DARK, fontFamily: 'monospace', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 12 }}>{row.id}</TableCell>
                  <TableCell sx={{ color: '#64748b', borderColor: '#E5E7EB', fontSize: 12 }}>{row.fecha}</TableCell>
                  <TableCell sx={{ color: '#0284c7', fontFamily: 'monospace', borderColor: '#E5E7EB', fontSize: 12 }}>{row.op}</TableCell>
                  <TableCell sx={{ color: '#1E293B', fontWeight: 600, borderColor: '#E5E7EB', fontSize: 12 }}>{row.producto}</TableCell>
                  <TableCell sx={{ color: '#64748b', borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{row.linea}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}><TipoScrapChip t={row.tipo} /></TableCell>
                  <TableCell sx={{ color: '#64748b', borderColor: '#E5E7EB', fontSize: 12 }}>{row.causa}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{row.cantidad} {row.unidad}</TableCell>
                  <TableCell sx={{ color: '#16a34a', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{money(row.costo)}</TableCell>
                  <TableCell sx={{ color: '#1E293B', borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{row.operario}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}><EstadoScrapChip e={row.estado} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={11} sx={{ textAlign: 'center', color: '#94A3B8', py: 5, borderColor: '#E5E7EB' }}>
                  No hay registros que coincidan con los filtros.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Tendencia 6 meses */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Tendencia Scrap Rate — Últimos 6 Meses</Typography>
        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130 }}>
            {tendencia6m.map((t) => {
              const barH = (t.rate / 3.5) * 110
              return (
                <Box key={t.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <Typography sx={{ color: semaforoColor(t.rate), fontWeight: 900, fontSize: 14, mb: 0.5 }}>{t.rate}%</Typography>
                  <Box sx={{ width: '70%', height: `${barH}px`, bgcolor: semaforoColor(t.rate), opacity: 0.8, borderRadius: '4px 4px 0 0', transition: 'all 0.3s' }} />
                  <Box sx={{ width: '100%', height: 2, bgcolor: '#E5E7EB', mt: 0.5 }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.5, fontWeight: 600 }}>{t.mes}</Typography>
                </Box>
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Box sx={{ width: 20, height: 2, bgcolor: '#22c55e', borderTop: '2px dashed #22c55e' }} />
            <Typography sx={{ color: '#22c55e', fontSize: 11 }}>Meta: 1.5%</Typography>
          </Box>
        </Card>
      </Box>

      {/* ── Dialog: DETALLE DE SCRAP ── */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha('#ef4444', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DeleteSweep sx={{ color: '#ef4444' }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>{selected.id}</Typography>
                    <EstadoScrapChip e={selected.estado} />
                  </Stack>
                  <Typography fontSize={15} fontWeight={700} color="#1E293B">{selected.producto} · {selected.op}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                {/* Chips */}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <TipoScrapChip t={selected.tipo} />
                  <Chip label={`Disposición: ${selected.disposicion}`} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 600 }} />
                  <Chip label={selected.reprocesable ? 'REPROCESABLE' : 'NO REPROCESABLE'} size="small"
                    sx={{ bgcolor: selected.reprocesable ? '#16a34a22' : '#dc262622', color: selected.reprocesable ? '#16a34a' : '#dc2626', fontWeight: 700 }} />
                </Stack>

                {/* Causa raíz */}
                <Box sx={{ bgcolor: alpha('#ef4444', 0.05), border: `1px solid ${alpha('#ef4444', 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
                    <ScienceIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                    <Typography fontSize={11} fontWeight={700} color="#991b1b" textTransform="uppercase" letterSpacing="0.04em">Causa & Causa Raíz</Typography>
                  </Stack>
                  <Typography fontSize={13} color="#334155" fontWeight={600}>{selected.causa}</Typography>
                  <Typography fontSize={12} color="#64748B" mt={0.25}>Raíz: {selected.causaRaiz}</Typography>
                </Box>

                {/* Grilla de datos */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Producto" value={<Stack direction="row" alignItems="center" spacing={0.5}><ProductIcon sx={{ fontSize: 15, color: MES_COLOR }} /><span>{selected.producto}</span></Stack>} />
                  <InfoTile label="Línea" value={<Stack direction="row" alignItems="center" spacing={0.5}><FactoryIcon sx={{ fontSize: 15, color: MES_COLOR }} /><span>{selected.linea}</span></Stack>} />
                  <InfoTile label="Máquina" value={<Stack direction="row" alignItems="center" spacing={0.5}><MachineIcon sx={{ fontSize: 15, color: MES_COLOR }} /><span>{selected.maquina}</span></Stack>} />
                  <InfoTile label="Turno" value={selected.turno} />
                  <InfoTile label="Lote" value={selected.lote} />
                  <InfoTile label="Fecha" value={selected.fecha} />
                  <InfoTile label="Cantidad" value={<Stack direction="row" alignItems="center" spacing={0.5}><ScaleIcon sx={{ fontSize: 15, color: '#f59e0b' }} /><span>{selected.cantidad} {selected.unidad}</span></Stack>} color="#f59e0b" />
                  <InfoTile label="Costo unitario" value={money(selected.costoUnit)} />
                  <InfoTile label="Costo total" value={money(selected.costo)} color="#16a34a" />
                  <InfoTile label="Operario" value={<Stack direction="row" alignItems="center" spacing={0.5}><PersonIcon sx={{ fontSize: 15, color: MES_COLOR }} /><span>{selected.operario}</span></Stack>} />
                  <InfoTile label="Supervisor" value={selected.supervisor} />
                  <InfoTile label="% del scrap del mes" value={`${((selected.costo / totalCosto) * 100).toFixed(1)}%`} color="#dc2626" />
                </Box>

                {/* Acción correctiva */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <MetricIcon sx={{ fontSize: 16, color: MES_COLOR }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">Acción correctiva</Typography>
                  </Stack>
                  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.5 }}>
                    <Typography fontSize={13} color="#334155">{selected.accionCorrectiva}</Typography>
                  </Box>
                </Box>

                {/* Trazabilidad */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <HistoryIcon sx={{ fontSize: 16, color: '#8B5CF6' }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">
                      Trazabilidad ({selected.historial.length})
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {selected.historial.map((h, i) => (
                      <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25 }}>
                        <Box sx={{ minWidth: 96 }}>
                          <Typography fontSize={11} fontWeight={700} color="#1E293B">{h.fecha}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontSize={12} fontWeight={700} color="#334155">{h.evento}</Typography>
                          <Typography fontSize={11} color="#64748B">{h.detalle}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button startIcon={<DeleteIcon />} onClick={() => handleDelete(selected)}
                sx={{ color: '#EF4444', fontWeight: 600, '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}>
                Eliminar registro
              </Button>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify(`Ficha de ${selected.id} exportada a PDF`, 'info')}
                  sx={{ borderColor: '#E5E7EB', color: '#64748B', borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: '#CBD5E1', bgcolor: alpha('#64748B', 0.06) } }}>
                  Exportar ficha
                </Button>
                <Button variant="contained" startIcon={<ReprocIcon />} disabled={!selected.reprocesable || selected.disposicion === 'Reproceso'}
                  onClick={() => handleReproc(selected)}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, boxShadow: `0 4px 16px ${alpha(MES_COLOR, 0.35)}` }}>
                  Generar reproceso
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: REGISTRAR SCRAP ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize={16} color="#1E293B">Registrar scrap / merma</Typography>
              <Typography fontSize={12} color="#64748B">Complete los datos del evento de desperdicio</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setCreateOpen(false)} sx={{ color: 'grey.500' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Stack spacing={2} mt={0.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Producto *" value={form.producto}
                onChange={(e) => setField('producto', e.target.value)} sx={inputSx}
                error={triedSubmit && !form.producto}
                helperText={triedSubmit && !form.producto ? 'Seleccione el producto' : ' '}>
                {PRODUCTOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Línea *" value={form.linea}
                onChange={(e) => { const l = e.target.value; setForm(prev => ({ ...prev, linea: l, maquina: MAQUINA_POR_LINEA[l] || prev.maquina })) }} sx={inputSx}
                error={triedSubmit && !form.linea}
                helperText={triedSubmit && !form.linea ? 'Seleccione la línea' : 'Autocompleta la máquina'}>
                {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Máquina" value={form.maquina} InputProps={{ readOnly: true }}
                sx={inputSx} helperText="Derivada de la línea" />
              <TextField select fullWidth size="small" label="Turno" value={form.turno}
                onChange={(e) => setField('turno', e.target.value)} sx={inputSx} helperText=" ">
                {TURNOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="OP" value={form.op}
                onChange={(e) => setField('op', e.target.value)} sx={inputSx} placeholder="Ej. OP-0820" helperText=" " />
              <TextField fullWidth size="small" label="Lote" value={form.lote}
                onChange={(e) => setField('lote', e.target.value)} sx={inputSx} placeholder="Ej. L-24070" helperText=" " />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Causa *" value={form.causa}
                onChange={(e) => {
                  const c = e.target.value
                  const cat = CAUSAS_CATALOGO.find(x => x.causa === c)
                  setForm(prev => ({ ...prev, causa: c, tipo: cat ? cat.tipo : prev.tipo, causaRaiz: cat ? cat.causaRaiz : prev.causaRaiz }))
                }} sx={inputSx}
                error={triedSubmit && !form.causa}
                helperText={triedSubmit && !form.causa ? 'Seleccione la causa' : 'Autocompleta tipo y raíz'}>
                {CAUSAS_CATALOGO.map(c => <MenuItem key={c.causa} value={c.causa}>{c.causa}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Tipo" value={form.tipo} InputProps={{ readOnly: true }}
                sx={inputSx} helperText="Derivado de la causa" />
            </Stack>
            <TextField fullWidth size="small" label="Causa raíz" value={form.causaRaiz} InputProps={{ readOnly: true }}
              sx={inputSx} helperText="Derivada de la causa" />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Cantidad *" type="number" value={form.cantidad}
                onChange={(e) => setField('cantidad', e.target.value)} sx={inputSx}
                error={triedSubmit && (!form.cantidad || Number(form.cantidad) <= 0)}
                helperText={triedSubmit && (!form.cantidad || Number(form.cantidad) <= 0) ? 'Ingrese una cantidad > 0' : ' '} />
              <TextField select fullWidth size="small" label="Unidad" value={form.unidad}
                onChange={(e) => setField('unidad', e.target.value)} sx={inputSx} helperText=" ">
                {UNIDADES.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Costo unitario *" type="number" value={form.costoUnit}
                onChange={(e) => setField('costoUnit', e.target.value)} sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={13} color="#94A3B8">$</Typography></InputAdornment> }}
                error={triedSubmit && (!form.costoUnit || Number(form.costoUnit) <= 0)}
                helperText={triedSubmit && (!form.costoUnit || Number(form.costoUnit) <= 0) ? 'Ingrese el costo unitario' : (form.cantidad && form.costoUnit ? `Total: ${money(Number(form.cantidad) * Number(form.costoUnit))}` : ' ')} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Operario" value={form.operario}
                onChange={(e) => setField('operario', e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {OPERARIOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Supervisor" value={form.supervisor}
                onChange={(e) => setField('supervisor', e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {SUPERVISORES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Disposición" value={form.disposicion}
                onChange={(e) => setField('disposicion', e.target.value)} sx={inputSx}>
                {DISPOSICIONES.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="¿Reprocesable?" value={form.reprocesable}
                onChange={(e) => setField('reprocesable', e.target.value)} sx={inputSx}>
                {['SÍ', 'NO'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField fullWidth size="small" label="Acción correctiva" multiline rows={2} value={form.accionCorrectiva}
              onChange={(e) => setField('accionCorrectiva', e.target.value)} sx={inputSx}
              placeholder="Contención inmediata y acción para evitar recurrencia..." />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B', fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!formValido}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Formulario Nuevo Reproceso ─────────────────────────────────────────────────
interface NewReprocForm {
  opOrigen: string; producto: string; linea: string; cantidad: string; unidad: string
  causa: string; responsable: string; tiempo: string; descripcion: string
}
const EMPTY_REPROC: NewReprocForm = {
  opOrigen: '', producto: '', linea: '', cantidad: '', unidad: 'uds',
  causa: '', responsable: '', tiempo: '', descripcion: '',
}

// ─── Tab 1: Reprocesos ────────────────────────────────────────────────────────
function ReprocesosTab({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<ReprocRow[]>(REPROC_MOCK)
  const [selected, setSelected] = useState<ReprocRow | null>(null)
  const [form, setForm] = useState<NewReprocForm>(EMPTY_REPROC)
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [fEstado, setFEstado] = useState('Todos')

  // OP de scrap reprocesable como opciones (deriva producto/línea/causa)
  const opOptions = useMemo(() => SCRAP_MOCK.filter(s => s.reprocesable), [])

  const filtered = useMemo(() => rows.filter(r => fEstado === 'Todos' || r.estado === fEstado), [rows, fEstado])

  const setField = (f: keyof NewReprocForm, v: string) => setForm(prev => ({ ...prev, [f]: v }))

  const formValido = !!form.opOrigen && !!form.cantidad && Number(form.cantidad) > 0 && !!form.responsable

  const handleCreate = () => {
    if (!formValido) {
      setTriedSubmit(true)
      notify('Complete los campos obligatorios: OP de origen, cantidad y responsable', 'warning')
      return
    }
    const hoy = new Date()
    const fecha = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}`
    const nueva: ReprocRow = {
      id: `RP-${900 + rows.length + 1}`,
      opOrigen: form.opOrigen,
      producto: form.producto || '—',
      linea: form.linea || '—',
      cantidad: Number(form.cantidad),
      unidad: form.unidad,
      causa: form.causa || 'Por determinar',
      estado: 'PENDIENTE',
      fecha,
      responsable: form.responsable,
      tiempoEstimado: form.tiempo ? Number(form.tiempo) : 0,
      costoEstimado: 0,
      avance: 0,
      descripcion: form.descripcion || 'Sin descripción.',
    }
    setRows(prev => [nueva, ...prev])
    setForm(EMPTY_REPROC)
    setTriedSubmit(false)
    notify(`Orden de reproceso ${nueva.id} registrada`, 'success')
  }

  const handleAdvance = (row: ReprocRow) => {
    setRows(prev => prev.map(r => {
      if (r.id !== row.id) return r
      const estado: EstadoReproc = r.estado === 'PENDIENTE' ? 'EN PROCESO' : 'COMPLETADO'
      return { ...r, estado, avance: estado === 'COMPLETADO' ? 100 : Math.max(r.avance, 50) }
    }))
    setSelected(s => {
      if (!s || s.id !== row.id) return s
      const estado: EstadoReproc = s.estado === 'PENDIENTE' ? 'EN PROCESO' : 'COMPLETADO'
      return { ...s, estado, avance: estado === 'COMPLETADO' ? 100 : Math.max(s.avance, 50) }
    })
    notify(`Reproceso ${row.id} avanzado de estado`, 'success')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs */}
      <Grid container spacing={2}>
        {[
          { label: 'Unidades Reprocesadas Mes', value: '840',     color: MES_COLOR },
          { label: 'Costo Reproceso Mes',       value: '$12.4M',  color: '#f97316' },
          { label: 'Tasa de Reproceso',         value: '0.8%',    color: '#d97706' },
        ].map((k) => (
          <Grid size={{ xs: 12, md: 4 }} key={k.label}>
            <Card sx={{ border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '14px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 30, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.5, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla reprocesos */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>Órdenes de Reproceso</Typography>
          <TextField select size="small" label="Estado" value={fEstado} onChange={(e) => setFEstado(e.target.value)} sx={{ minWidth: 170, ...inputSx }}>
            {['Todos', 'PENDIENTE', 'EN PROCESO', 'COMPLETADO'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
        <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 860 }}>
            <TableHead>
              <TableRow>
                {['Código', 'OP Original', 'Producto', 'Línea', 'Cantidad', 'Causa', 'Estado', 'Fecha'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} onClick={() => setSelected(row)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}12` } }}>
                  <TableCell sx={{ color: MES_DARK, fontFamily: 'monospace', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 12 }}>{row.id}</TableCell>
                  <TableCell sx={{ color: '#0284c7', fontFamily: 'monospace', borderColor: '#E5E7EB', fontSize: 12 }}>{row.opOrigen}</TableCell>
                  <TableCell sx={{ color: '#1E293B', fontWeight: 600, borderColor: '#E5E7EB', fontSize: 12 }}>{row.producto}</TableCell>
                  <TableCell sx={{ color: '#64748b', borderColor: '#E5E7EB', fontSize: 12 }}>{row.linea}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 12 }}>{row.cantidad} {row.unidad}</TableCell>
                  <TableCell sx={{ color: '#64748b', borderColor: '#E5E7EB', fontSize: 12 }}>{row.causa}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}><EstadoReprocChip e={row.estado} /></TableCell>
                  <TableCell sx={{ color: '#64748b', borderColor: '#E5E7EB', fontSize: 12 }}>{row.fecha}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', color: '#94A3B8', py: 5, borderColor: '#E5E7EB' }}>
                  No hay órdenes con ese estado.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Formulario registro */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Registrar Orden de Reproceso</Typography>
        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth size="small" label="OP de Origen *" value={form.opOrigen}
                onChange={(e) => {
                  const op = e.target.value
                  const src = opOptions.find(s => s.op === op)
                  setForm(prev => ({ ...prev, opOrigen: op, producto: src ? src.producto : prev.producto, linea: src ? src.linea : prev.linea, causa: src ? src.causa : prev.causa, unidad: src ? src.unidad : prev.unidad }))
                }} sx={inputSx}
                error={triedSubmit && !form.opOrigen}
                helperText={triedSubmit && !form.opOrigen ? 'Seleccione la OP de origen' : 'Autocompleta producto, línea y causa'}>
                {opOptions.map(s => <MenuItem key={s.op} value={s.op}>{s.op} · {s.producto}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Producto" value={form.producto} InputProps={{ readOnly: true }} sx={inputSx} helperText="Derivado" />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Línea" value={form.linea} InputProps={{ readOnly: true }} sx={inputSx} helperText="Derivada" />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField fullWidth size="small" label="Cantidad *" type="number" value={form.cantidad}
                onChange={(e) => setField('cantidad', e.target.value)} sx={inputSx}
                error={triedSubmit && (!form.cantidad || Number(form.cantidad) <= 0)}
                helperText={triedSubmit && (!form.cantidad || Number(form.cantidad) <= 0) ? '> 0' : ' '} />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField select fullWidth size="small" label="Unidad" value={form.unidad}
                onChange={(e) => setField('unidad', e.target.value)} sx={inputSx}>
                {UNIDADES.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth size="small" label="Responsable *" value={form.responsable}
                onChange={(e) => setField('responsable', e.target.value)} sx={inputSx}
                error={triedSubmit && !form.responsable}
                helperText={triedSubmit && !form.responsable ? 'Seleccione responsable' : ' '}>
                {OPERARIOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Tiempo estimado (hrs)" type="number" value={form.tiempo}
                onChange={(e) => setField('tiempo', e.target.value)} sx={inputSx} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Descripción del trabajo" multiline rows={2} value={form.descripcion}
                onChange={(e) => setField('descripcion', e.target.value)} sx={inputSx} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!formValido}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: 2 }}>
                Registrar Reproceso
              </Button>
            </Grid>
          </Grid>
        </Card>
      </Box>

      {/* ── Dialog: DETALLE DE REPROCESO ── */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ReprocIcon sx={{ color: MES_COLOR }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>{selected.id}</Typography>
                    <EstadoReprocChip e={selected.estado} />
                  </Stack>
                  <Typography fontSize={15} fontWeight={700} color="#1E293B">{selected.producto} · {selected.opOrigen}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.5 }}>
                  <Typography fontSize={13} color="#334155">{selected.descripcion}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="OP origen" value={selected.opOrigen} />
                  <InfoTile label="Línea" value={selected.linea} />
                  <InfoTile label="Cantidad" value={`${selected.cantidad} ${selected.unidad}`} color="#f59e0b" />
                  <InfoTile label="Causa" value={selected.causa} />
                  <InfoTile label="Responsable" value={selected.responsable} />
                  <InfoTile label="Fecha" value={selected.fecha} />
                  <InfoTile label="Tiempo estimado" value={`${selected.tiempoEstimado} h`} />
                  <InfoTile label="Costo estimado" value={money(selected.costoEstimado)} color="#16a34a" />
                  <InfoTile label="Avance" value={`${selected.avance}%`} color={MES_COLOR} />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={11} color="#64748B" fontWeight={600}>Progreso del reproceso</Typography>
                    <Typography fontSize={12} color={MES_COLOR} fontWeight={700}>{selected.avance}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={selected.avance}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: selected.avance >= 100 ? '#16a34a' : MES_COLOR, borderRadius: 4 } }} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setSelected(null)} sx={{ color: '#64748B', fontWeight: 600 }}>Cerrar</Button>
              <Button variant="contained" startIcon={<PlayIcon />} disabled={selected.estado === 'COMPLETADO'}
                onClick={() => handleAdvance(selected)}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
                {selected.estado === 'PENDIENTE' ? 'Iniciar reproceso' : 'Marcar completado'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

// ─── Tab 2: Lean Tools ────────────────────────────────────────────────────────
function LeanTab({ notify }: { notify: Notify }) {
  const [andonState, setAndonState] = useState<'VERDE' | 'AMARILLO' | 'ROJO'>('VERDE')
  const [selKaizen, setSelKaizen] = useState<Kaizen | null>(null)
  const andonColors: Record<string, string> = { VERDE: '#22c55e', AMARILLO: '#f59e0b', ROJO: '#ef4444' }

  const changeAndon = (s: 'VERDE' | 'AMARILLO' | 'ROJO') => {
    setAndonState(s)
    notify(`Andon cambiado a ${s}`, s === 'ROJO' ? 'error' : s === 'AMARILLO' ? 'warning' : 'success')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={2}>

        {/* Andon */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircleOutlined sx={{ color: MES_COLOR }} />
                <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: 16 }}>Sistema Andon</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                {(['VERDE', 'AMARILLO', 'ROJO'] as const).map((s) => (
                  <Box key={s} sx={{
                    width: 64, height: 64, borderRadius: '50%',
                    bgcolor: andonState === s ? andonColors[s] : `${andonColors[s]}33`,
                    border: `3px solid ${andonColors[s]}`,
                    boxShadow: andonState === s ? `0 0 24px ${andonColors[s]}88` : 'none',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </Box>
              <Typography sx={{ color: andonColors[andonState], fontWeight: 900, fontSize: 18, textAlign: 'center', mb: 2 }}>
                ESTADO: {andonState}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                {(['VERDE', 'AMARILLO', 'ROJO'] as const).map((s) => (
                  <Button key={s} size="small" onClick={() => changeAndon(s)}
                    sx={{ bgcolor: `${andonColors[s]}22`, color: andonColors[s], border: `1px solid ${andonColors[s]}55`,
                      fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: `${andonColors[s]}33` } }}>
                    {s}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Kaizen */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmojiObjects sx={{ color: '#f59e0b' }} />
                <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: 16 }}>Eventos Kaizen Activos</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {KAIZENS_MOCK.map((k) => (
                  <Box key={k.id} onClick={() => setSelKaizen(k)}
                    sx={{ cursor: 'pointer', borderRadius: 1, p: 0.75, mx: -0.75, transition: 'background 0.15s', '&:hover': { bgcolor: `${MES_COLOR}0D` } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Box>
                        <Typography sx={{ color: '#1E293B', fontSize: 12, fontWeight: 600 }}>{k.nombre}</Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 10 }}>{k.area} · {k.lider}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: k.avance >= 80 ? '#22c55e' : k.avance >= 50 ? '#f59e0b' : '#94a3b8', fontWeight: 900, fontSize: 14 }}>
                          {k.avance}%
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 10 }}>{k.dias}d rest.</Typography>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={k.avance}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#E5E7EB',
                        '& .MuiLinearProgress-bar': { bgcolor: k.avance >= 80 ? '#22c55e' : k.avance >= 50 ? '#f59e0b' : MES_COLOR } }} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 5S */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: '#22c55e' }} />
                  <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: 16 }}>Auditoría 5S</Typography>
                </Box>
                <Typography sx={{ color: '#64748b', fontSize: 11 }}>Última: 15/06/2024</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {cincoS.map((s, i) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444']
                  return (
                    <Box key={s.s}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                        <Typography sx={{ color: '#1E293B', fontSize: 12, fontWeight: 600 }}>{s.s}</Typography>
                        <Typography sx={{ color: colors[i], fontWeight: 900, fontSize: 13 }}>{s.pct}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={s.pct}
                        sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB',
                          '& .MuiLinearProgress-bar': { bgcolor: colors[i] } }} />
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* SMED */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Warning sx={{ color: MES_COLOR }} />
                <Typography sx={{ color: '#1E293B', fontWeight: 700, fontSize: 16 }}>SMED — Tiempos de Changeover</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Referencia', 'Antes', 'Después', 'Reducción', 'Objetivo'].map((h) => (
                        <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 10, borderColor: '#E5E7EB', p: '4px 8px' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {smedRows.map((row) => (
                      <TableRow key={row.referencia} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                        <TableCell sx={{ color: '#1E293B', borderColor: '#E5E7EB', fontSize: 11, p: '4px 8px' }}>{row.referencia}</TableCell>
                        <TableCell sx={{ color: '#ef4444', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 11, p: '4px 8px' }}>{row.antes} min</TableCell>
                        <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 11, p: '4px 8px' }}>{row.despues} min</TableCell>
                        <TableCell sx={{ color: MES_COLOR, fontWeight: 900, borderColor: '#E5E7EB', fontSize: 12, p: '4px 8px' }}>{row.reduccion}%</TableCell>
                        <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 11, p: '4px 8px' }}>{row.objetivo} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* ── Dialog: DETALLE KAIZEN ── */}
      <Dialog open={!!selKaizen} onClose={() => setSelKaizen(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selKaizen && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha('#f59e0b', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EmojiObjects sx={{ color: '#f59e0b' }} />
                </Box>
                <Box>
                  <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>{selKaizen.id}</Typography>
                  <Typography fontSize={15} fontWeight={700} color="#1E293B">{selKaizen.nombre}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelKaizen(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                <Box sx={{ bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                  <Typography fontSize={13} color="#334155"><strong>Objetivo:</strong> {selKaizen.objetivo}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Área" value={selKaizen.area} />
                  <InfoTile label="Líder" value={selKaizen.lider} />
                  <InfoTile label="Inicio" value={selKaizen.inicio} />
                  <InfoTile label="Días restantes" value={`${selKaizen.dias} d`} color={selKaizen.dias <= 5 ? '#dc2626' : '#1E293B'} />
                  <InfoTile label="Avance" value={`${selKaizen.avance}%`} color={MES_COLOR} />
                  <InfoTile label="Ahorro estimado" value={money(selKaizen.ahorroEstimado)} color="#16a34a" />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={11} color="#64748B" fontWeight={600}>Progreso</Typography>
                    <Typography fontSize={12} color={MES_COLOR} fontWeight={700}>{selKaizen.avance}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={selKaizen.avance}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: selKaizen.avance >= 80 ? '#22c55e' : selKaizen.avance >= 50 ? '#f59e0b' : MES_COLOR, borderRadius: 4 } }} />
                </Box>
                <Box>
                  <Typography fontSize={12} fontWeight={700} color="#1E293B" mb={1} textTransform="uppercase" letterSpacing="0.04em">Acciones del evento</Typography>
                  <Stack spacing={1}>
                    {selKaizen.acciones.map((a, i) => (
                      <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25 }}>
                        <Avatar sx={{ width: 20, height: 20, bgcolor: alpha('#f59e0b', 0.15), color: '#d97706', fontSize: 11, fontWeight: 800 }}>{i + 1}</Avatar>
                        <Typography fontSize={12} color="#334155">{a}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setSelKaizen(null)} sx={{ color: '#64748B', fontWeight: 600 }}>Cerrar</Button>
              <Button variant="contained" onClick={() => { notify(`Kaizen ${selKaizen.id} marcado para seguimiento`, 'success'); setSelKaizen(null) }}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
                Seguir evento
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

// ─── Tab 3: Análisis ──────────────────────────────────────────────────────────
function AnalisisTab({ notify }: { notify: Notify }) {
  const [selLinea, setSelLinea] = useState<LineaScrap | null>(null)
  const maxKg = Math.max(...causasScrap.map((c) => c.kg))
  const barColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']
  const sparkMax = Math.max(...sparkline)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Pareto causas */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Pareto de Causas de Scrap</Typography>
        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {causasScrap.map((c, i) => (
              <Box key={c.causa}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ color: '#1E293B', fontSize: 13, fontWeight: 600 }}>{c.causa}</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ color: barColors[i], fontWeight: 900, fontSize: 13 }}>{c.kg} kg</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>{c.pct}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 22, bgcolor: '#F8FAFC', borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${(c.kg / maxKg) * 100}%`, bgcolor: barColors[i], opacity: 0.85, borderRadius: 1 }} />
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>

      {/* Scrap por línea */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Scrap por Línea de Producción</Typography>
        <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Línea', 'Kg Scrap', '% Rate', 'Costo', 'Estado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {LINEAS_SCRAP.map((l) => (
                <TableRow key={l.linea} onClick={() => setSelLinea(l)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}12` } }}>
                  <TableCell sx={{ color: '#1E293B', fontWeight: 600, borderColor: '#E5E7EB', fontSize: 13 }}>{l.linea}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB' }}>{l.kg} kg</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Typography sx={{ color: semaforoColor(l.pct), fontWeight: 900, fontSize: 14 }}>{l.pct}%</Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#16a34a', fontWeight: 700, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{money(l.costo)}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: semaforoColor(l.pct) }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Sparkline tendencia diaria */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Tendencia Diaria Scrap Rate — Últimas 2 Semanas</Typography>
        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80 }}>
            {sparkline.map((v, i) => {
              const h = (v / sparkMax) * 70
              return (
                <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: 9, mb: 0.3 }}>{v}%</Typography>
                  <Box sx={{ width: '70%', height: `${h}px`, bgcolor: semaforoColor(v), opacity: 0.8, borderRadius: '3px 3px 0 0' }} />
                </Box>
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 1 }}>
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>07/Jun</Typography>
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>20/Jun</Typography>
          </Box>
        </Card>
      </Box>

      {/* ── Dialog: DETALLE LÍNEA ── */}
      <Dialog open={!!selLinea} onClose={() => setSelLinea(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selLinea && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FactoryIcon sx={{ color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography fontSize={15} fontWeight={700} color="#1E293B">{selLinea.linea}</Typography>
                  <Typography fontSize={12} color="#64748B">{selLinea.maquina}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelLinea(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Rate ${selLinea.pct}%`} size="small" sx={{ bgcolor: alpha(semaforoColor(selLinea.pct), 0.15), color: semaforoColor(selLinea.pct), fontWeight: 700 }} />
                  <Chip label={selLinea.tendencia} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 600 }} />
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Kg scrap" value={`${selLinea.kg} kg`} color="#f59e0b" />
                  <InfoTile label="% Rate" value={`${selLinea.pct}%`} color={semaforoColor(selLinea.pct)} />
                  <InfoTile label="Costo" value={money(selLinea.costo)} color="#16a34a" />
                  <InfoTile label="Unidades afectadas" value={String(selLinea.unidades)} />
                  <InfoTile label="Producto top" value={selLinea.productoTop} />
                  <InfoTile label="Causa top" value={selLinea.causaTop} />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={11} color="#64748B" fontWeight={600}>Rate vs meta (1.5%)</Typography>
                    <Typography fontSize={12} color={semaforoColor(selLinea.pct)} fontWeight={700}>{selLinea.pct}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={Math.min(100, (selLinea.pct / 3.5) * 100)}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: semaforoColor(selLinea.pct), borderRadius: 4 } }} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setSelLinea(null)} sx={{ color: '#64748B', fontWeight: 600 }}>Cerrar</Button>
              <Button variant="contained" startIcon={<ExportIcon />} onClick={() => { notify(`Reporte de ${selLinea.linea} exportado`, 'info'); setSelLinea(null) }}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
                Exportar reporte
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MESScrap() {
  const [tab, setTab] = useState(0)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>({ open: false, msg: '', sev: 'success' })
  const notify: Notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  const tabLabels = ['Scrap & Mermas', 'Reprocesos', 'Lean Tools', 'Análisis']
  const tabIcons = [<DeleteSweep />, <Autorenew />, <EmojiObjects />, <Analytics />]

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: 3, background: '#F8FAFC' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: `${MES_COLOR}22`, border: `1px solid ${MES_COLOR}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: MES_COLOR,
          }}>
            <DeleteSweep fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#1E293B', fontWeight: 800, lineHeight: 1 }}>
              MES — Scrap & Lean Manufacturing
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
              ICOLTRANS · Scrap · Reprocesos · Lean Tools · Análisis de Desperdicios
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ bgcolor: '#E5E7EB', mb: 3 }} />

        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{
          mb: 1,
          '& .MuiTab-root': { color: '#64748b', fontWeight: 600, textTransform: 'none', fontSize: 14 },
          '& .Mui-selected': { color: MES_COLOR },
          '& .MuiTabs-indicator': { bgcolor: MES_COLOR },
        }}>
          {tabLabels.map((label, i) => (
            <Tab key={label} label={label} icon={tabIcons[i]} iconPosition="start" />
          ))}
        </Tabs>

        <Divider sx={{ bgcolor: '#E5E7EB', mb: 1 }} />

        <TabPanel value={tab} index={0}><ScrapTab notify={notify} /></TabPanel>
        <TabPanel value={tab} index={1}><ReprocesosTab notify={notify} /></TabPanel>
        <TabPanel value={tab} index={2}><LeanTab notify={notify} /></TabPanel>
        <TabPanel value={tab} index={3}><AnalisisTab notify={notify} /></TabPanel>
      </Box>

      {/* Snackbar global */}
      <Snackbar open={snack.open} autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
