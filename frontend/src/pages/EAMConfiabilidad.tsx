import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Grid, Card, CardContent, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Button,
  TextField, MenuItem, InputAdornment, Stack, Snackbar, Alert, Tooltip, alpha,
} from '@mui/material'
import {
  Engineering, Timeline, BugReport, Assessment, Warning, Close as CloseIcon,
  Search as SearchIcon, Add as AddIcon, FileDownload as ExportIcon,
  Build as ComponenteIcon, Handyman as OTIcon, Speed as MetricIcon,
  History as HistoryIcon, Science as RootCauseIcon, TrendingUp, TrendingDown,
  ReportProblem as EfectoIcon, CheckCircle as CheckIcon, LocalFireDepartment,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const EAM_COLOR = '#32AC5C'
const EAM_DARK = '#27884A'

// ─── Types ────────────────────────────────────────────────────────────────────
interface KpiCard {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
  trend: string
  trendUp: boolean
  desc: string
}

interface AssetTypeRow {
  tipo: string
  mtbf: number
  mttr: number
  disponibilidad: number
  fallas: number
  indiceFallas: number
  activos: number
  costoMantenimiento: number
  fallasPorModo: { modo: string; casos: number }[]
}

interface TopFailureRow {
  rank: number
  activo: string
  codigo: string
  fallas: number
  horasParado: number
  costo: number
  ultimaFalla: string
  responsable: string
  causaPrincipal: string
  tendencia: 'sube' | 'baja' | 'estable'
}

interface FmeaRow {
  id: number
  activo: string
  componente: string
  funcion: string
  modoFalla: string
  efecto: string
  causa: string
  s: number
  o: number
  d: number
  accion: string
  responsable: string
  estado: 'Abierto' | 'En Proceso' | 'Cerrado'
  fechaObjetivo: string
}

interface MonthlyFailure {
  id: number
  activo: string
  codigo: string
  descripcion: string
  causaRaiz: string
  solucion: string
  tiempoParado: number
  costo: number
  ot: string
  fecha: string
  tecnico: string
  categoria: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const kpiCards: KpiCard[] = [
  { label: 'MTBF', value: '312', unit: 'hrs', icon: <Timeline />, trend: '+8.3%', trendUp: true, desc: 'Tiempo Medio Entre Fallas — promedio de horas de operación entre fallas consecutivas de la flota.' },
  { label: 'MTTR', value: '4.2', unit: 'hrs', icon: <Engineering />, trend: '-12.5%', trendUp: true, desc: 'Tiempo Medio Para Reparar — promedio de horas desde la detección de la falla hasta la reparación.' },
  { label: 'Disponibilidad', value: '94.2', unit: '%', icon: <Assessment />, trend: '+1.4%', trendUp: true, desc: 'Porcentaje de tiempo en que los activos están disponibles para operar. Meta corporativa: 95%.' },
  { label: 'Mantenibilidad', value: '96.8', unit: '%', icon: <Engineering />, trend: '+0.6%', trendUp: true, desc: 'Probabilidad de restaurar un activo a condición operativa dentro del tiempo estándar establecido.' },
  { label: 'Confiabilidad', value: '91.5', unit: '%', icon: <Timeline />, trend: '-0.3%', trendUp: false, desc: 'Probabilidad de que un activo cumpla su función sin fallar en un periodo determinado.' },
  { label: 'Backlog', value: '180', unit: 'hrs', icon: <Warning />, trend: '+5.0%', trendUp: false, desc: 'Carga de trabajo de mantenimiento pendiente acumulada. Objetivo: mantener por debajo de 160 hrs.' },
]

const assetTypeRows: AssetTypeRow[] = [
  { tipo: 'Vehículos', mtbf: 345, mttr: 3.8, disponibilidad: 95.1, fallas: 18, indiceFallas: 0.052, activos: 42, costoMantenimiento: 68400000, fallasPorModo: [{ modo: 'Falla mecánica', casos: 7 }, { modo: 'Falla eléctrica', casos: 5 }, { modo: 'Neumáticos', casos: 4 }, { modo: 'Otros', casos: 2 }] },
  { tipo: 'Montacargas', mtbf: 280, mttr: 5.1, disponibilidad: 92.8, fallas: 24, indiceFallas: 0.086, activos: 15, costoMantenimiento: 41200000, fallasPorModo: [{ modo: 'Falla hidráulica', casos: 10 }, { modo: 'Batería / Motor', casos: 8 }, { modo: 'Transmisión', casos: 4 }, { modo: 'Otros', casos: 2 }] },
  { tipo: 'Infraestructura', mtbf: 410, mttr: 6.2, disponibilidad: 96.4, fallas: 9, indiceFallas: 0.024, activos: 12, costoMantenimiento: 54800000, fallasPorModo: [{ modo: 'Refrigeración', casos: 4 }, { modo: 'Falla eléctrica', casos: 3 }, { modo: 'Estructura', casos: 2 }] },
  { tipo: 'Equipos Tecnológicos', mtbf: 520, mttr: 2.1, disponibilidad: 98.2, fallas: 7, indiceFallas: 0.013, activos: 28, costoMantenimiento: 12100000, fallasPorModo: [{ modo: 'Falla eléctrica', casos: 3 }, { modo: 'Baterías', casos: 2 }, { modo: 'Software', casos: 2 }] },
  { tipo: 'Maquinaria Pesada', mtbf: 190, mttr: 7.8, disponibilidad: 88.6, fallas: 31, indiceFallas: 0.163, activos: 9, costoMantenimiento: 92600000, fallasPorModo: [{ modo: 'Falla hidráulica', casos: 12 }, { modo: 'Falla mecánica', casos: 10 }, { modo: 'Frenos', casos: 6 }, { modo: 'Otros', casos: 3 }] },
]

const topFailures: TopFailureRow[] = [
  { rank: 1, activo: 'Montacargas Hyster H80', codigo: 'MF-012', fallas: 14, horasParado: 87, costo: 4200000, ultimaFalla: '28/06/2026', responsable: 'Mantenimiento Industrial', causaPrincipal: 'Fuga de aceite hidráulico', tendencia: 'sube' },
  { rank: 2, activo: 'Tracto Kenworth T800', codigo: 'VH-034', fallas: 11, horasParado: 62, costo: 3750000, ultimaFalla: '19/06/2026', responsable: 'Taller Mecánico', causaPrincipal: 'Sobrecalentamiento motor', tendencia: 'baja' },
  { rank: 3, activo: 'Maquinaria CAT 320', codigo: 'MP-007', fallas: 9, horasParado: 74, costo: 6100000, ultimaFalla: '25/06/2026', responsable: 'Taller Especializado', causaPrincipal: 'Desgaste de pastillas de freno', tendencia: 'sube' },
  { rank: 4, activo: 'Montacargas Clark C50', codigo: 'MF-019', fallas: 8, horasParado: 48, costo: 2900000, ultimaFalla: '11/06/2026', responsable: 'Taller Mecánico', causaPrincipal: 'Deslizamiento de embrague', tendencia: 'estable' },
  { rank: 5, activo: 'Tractomula Freightliner', codigo: 'VH-051', fallas: 7, horasParado: 55, costo: 3200000, ultimaFalla: '30/06/2026', responsable: 'Taller Eléctrico', causaPrincipal: 'Cortocircuito en arnés', tendencia: 'baja' },
]

const initialFmeaRows: FmeaRow[] = [
  { id: 1, activo: 'Tracto Kenworth T800', componente: 'Motor Diesel', funcion: 'Generar potencia motriz', modoFalla: 'Sobrecalentamiento del motor', efecto: 'Parada total del vehículo', causa: 'Obstrucción del radiador / falla de termostato', s: 9, o: 6, d: 4, accion: 'Revisar sistema de refrigeración cada 5.000 km', responsable: 'Taller Mecánico', estado: 'Abierto', fechaObjetivo: '2026-07-31' },
  { id: 2, activo: 'Montacargas Hyster H80', componente: 'Sistema Hidráulico', funcion: 'Elevar y descender cargas', modoFalla: 'Fuga de aceite hidráulico', efecto: 'Pérdida de capacidad de izaje', causa: 'Deterioro de sellos y mangueras', s: 8, o: 7, d: 3, accion: 'Inspección de sellos y mangueras mensual', responsable: 'Mantenimiento Industrial', estado: 'En Proceso', fechaObjetivo: '2026-07-20' },
  { id: 3, activo: 'Maquinaria CAT 320', componente: 'Sistema de Frenos', funcion: 'Detener la máquina con seguridad', modoFalla: 'Desgaste excesivo de pastillas', efecto: 'Riesgo de accidente por pérdida de frenado', causa: 'Superación de vida útil sin reemplazo', s: 10, o: 5, d: 5, accion: 'Reemplazo preventivo cada 500 horas', responsable: 'Taller Especializado', estado: 'Abierto', fechaObjetivo: '2026-07-15' },
  { id: 4, activo: 'Compresor Atlas Copco', componente: 'Compresor de Aire', funcion: 'Suministrar aire comprimido a 120 PSI', modoFalla: 'Falla en válvula de presión', efecto: 'Interrupción del suministro de aire a línea de producción', causa: 'Descalibración por fatiga', s: 7, o: 4, d: 5, accion: 'Calibración de válvulas trimestral', responsable: 'Mantenimiento Locativo', estado: 'Cerrado', fechaObjetivo: '2026-05-30' },
  { id: 5, activo: 'Tractomula Freightliner', componente: 'Sistema Eléctrico', funcion: 'Alimentar sistemas electrónicos del vehículo', modoFalla: 'Cortocircuito en arnés eléctrico', efecto: 'Falla de instrumentación y luces', causa: 'Roce y deterioro de aislamiento', s: 6, o: 5, d: 6, accion: 'Inspección de arneses y conectores semestral', responsable: 'Taller Eléctrico', estado: 'En Proceso', fechaObjetivo: '2026-08-10' },
  { id: 6, activo: 'Montacargas Clark C50', componente: 'Transmisión', funcion: 'Transferir potencia a las ruedas', modoFalla: 'Deslizamiento de embrague', efecto: 'Reducción de capacidad de tracción', causa: 'Desgaste del disco de embrague', s: 7, o: 6, d: 4, accion: 'Ajuste y lubricación de embrague cada 3.000 hrs', responsable: 'Taller Mecánico', estado: 'Abierto', fechaObjetivo: '2026-07-25' },
  { id: 7, activo: 'Grúa Puente 10T', componente: 'Cable de Acero', funcion: 'Sostener y elevar cargas hasta 10 toneladas', modoFalla: 'Fatiga y rotura de hilos del cable', efecto: 'Riesgo de caída de carga y accidente grave', causa: 'Fatiga por ciclos de carga', s: 10, o: 3, d: 3, accion: 'Inspección visual diaria y reemplazo anual', responsable: 'Mantenimiento Industrial', estado: 'Cerrado', fechaObjetivo: '2026-06-01' },
  { id: 8, activo: 'UPS Sala de Servidores', componente: 'Batería de Respaldo', funcion: 'Proveer energía eléctrica ante cortes', modoFalla: 'Degradación de baterías por temperatura', efecto: 'Pérdida de respaldo eléctrico — riesgo de caída de sistemas IT', causa: 'Exposición a temperatura ambiente elevada', s: 8, o: 4, d: 4, accion: 'Prueba de carga de baterías semestral', responsable: 'TI / Mantenimiento', estado: 'En Proceso', fechaObjetivo: '2026-08-15' },
]

const paretoData = [
  { tipo: 'Falla eléctrica', fallas: 34, pct: 34, cumPct: 34 },
  { tipo: 'Falla mecánica', fallas: 28, pct: 28, cumPct: 62 },
  { tipo: 'Falla hidráulica', fallas: 18, pct: 18, cumPct: 80 },
  { tipo: 'Falla neumática', fallas: 12, pct: 12, cumPct: 92 },
  { tipo: 'Otras', fallas: 8, pct: 8, cumPct: 100 },
]

interface CausaRaiz {
  causa: string
  casos: number
  accion: string
  tendencia: 'sube' | 'baja' | 'estable'
  costoAsociado: number
  categoria: string
  cincoPorques: string[]
  activosAfectados: string[]
  responsable: string
}

const causasRaiz: CausaRaiz[] = [
  {
    causa: 'Falta de mantenimiento preventivo', casos: 42,
    accion: 'Reforzar cumplimiento del plan de MP y auditar rutinas vencidas.',
    tendencia: 'sube', costoAsociado: 18600000, categoria: 'Gestión de mantenimiento',
    cincoPorques: [
      '¿Por qué falló el activo? — Un componente crítico llegó al final de su vida útil sin ser reemplazado.',
      '¿Por qué no se reemplazó? — La rutina preventiva estaba vencida.',
      '¿Por qué estaba vencida? — No se ejecutó en la ventana programada por falta de disponibilidad del activo.',
      '¿Por qué no se reprogramó? — No existe un mecanismo de seguimiento de rutinas vencidas.',
      '¿Por qué no existe seguimiento? — El indicador de cumplimiento de MP no se monitorea semanalmente. (Causa raíz)',
    ],
    activosAfectados: ['Tracto Kenworth T800', 'Montacargas Clark C50', 'Maquinaria CAT 320'],
    responsable: 'Planeación de Mantenimiento',
  },
  {
    causa: 'Desgaste por uso', casos: 31,
    accion: 'Ajustar intervalos de reemplazo de componentes según horas reales.',
    tendencia: 'estable', costoAsociado: 12400000, categoria: 'Ciclo de vida',
    cincoPorques: [
      '¿Por qué falló el componente? — Superó su vida útil nominal.',
      '¿Por qué se superó? — El intervalo de reemplazo se define por calendario, no por uso real.',
      '¿Por qué por calendario? — No se capturan horas de operación reales por activo.',
      '¿Por qué no se capturan? — Los horómetros no se registran en la orden de trabajo.',
      '¿Por qué no se registran? — Falta un campo obligatorio de medidor en la OT. (Causa raíz)',
    ],
    activosAfectados: ['Montacargas Hyster H80', 'Grúa Puente 10T'],
    responsable: 'Ingeniería de Confiabilidad',
  },
  {
    causa: 'Falla de componente', casos: 24,
    accion: 'Evaluar calidad de repuestos y proveedores; análisis de garantía.',
    tendencia: 'baja', costoAsociado: 9800000, categoria: 'Calidad de repuestos',
    cincoPorques: [
      '¿Por qué falló prematuramente? — El repuesto no cumplió su vida esperada.',
      '¿Por qué no cumplió? — Repuesto de proveedor alterno de menor calidad.',
      '¿Por qué se usó ese proveedor? — El repuesto original estaba en desabasto.',
      '¿Por qué desabasto? — Stock de seguridad mal calculado.',
      '¿Por qué mal calculado? — No se revisa el punto de reorden críticos. (Causa raíz)',
    ],
    activosAfectados: ['Compresor Atlas Copco', 'UPS Sala de Servidores'],
    responsable: 'Compras / Almacén',
  },
  {
    causa: 'Error operacional', casos: 18,
    accion: 'Programa de capacitación y certificación de operadores.',
    tendencia: 'baja', costoAsociado: 6200000, categoria: 'Factor humano',
    cincoPorques: [
      '¿Por qué se dañó el equipo? — Operación fuera de los parámetros seguros.',
      '¿Por qué fuera de parámetros? — El operador desconocía el límite de carga.',
      '¿Por qué lo desconocía? — No recibió inducción específica del equipo.',
      '¿Por qué no la recibió? — La inducción no es requisito para operar.',
      '¿Por qué no es requisito? — Falta política de certificación de operadores. (Causa raíz)',
    ],
    activosAfectados: ['Montacargas Toyota 8FGCU25', 'Reach Truck Crown'],
    responsable: 'Operaciones / SST',
  },
  {
    causa: 'Condiciones ambientales', casos: 11,
    accion: 'Mejorar protección, climatización y control de contaminantes.',
    tendencia: 'estable', costoAsociado: 4100000, categoria: 'Entorno',
    cincoPorques: [
      '¿Por qué se degradó el componente? — Exposición a temperatura y humedad elevadas.',
      '¿Por qué esa exposición? — El equipo opera sin control ambiental.',
      '¿Por qué sin control? — La sala no cuenta con climatización adecuada.',
      '¿Por qué no cuenta? — No se contempló en el diseño de la instalación.',
      '¿Por qué no se contempló? — Falta estudio de condiciones de operación. (Causa raíz)',
    ],
    activosAfectados: ['UPS Sala de Servidores', 'Servidor Dell PowerEdge'],
    responsable: 'Infraestructura / TI',
  },
]

const monthlyFailures: MonthlyFailure[] = [
  { id: 1, activo: 'Tracto Kenworth T800', codigo: 'VH-034', descripcion: 'Sobrecalentamiento motor', causaRaiz: 'Falta MP', solucion: 'Reemplazo termostato y limpieza radiador', tiempoParado: 8.5, costo: 1850000, ot: 'OT-2024-0612', fecha: '19/06/2026', tecnico: 'J. Méndez', categoria: 'Falla mecánica' },
  { id: 2, activo: 'Montacargas Hyster H80', codigo: 'MF-012', descripcion: 'Fuga aceite hidráulico', causaRaiz: 'Desgaste sello', solucion: 'Reemplazo kit sellos hidráulicos', tiempoParado: 4.0, costo: 680000, ot: 'OT-2024-0589', fecha: '28/06/2026', tecnico: 'L. Vargas', categoria: 'Falla hidráulica' },
  { id: 3, activo: 'Maquinaria CAT 320', codigo: 'MP-007', descripcion: 'Frenos sin respuesta', causaRaiz: 'Desgaste pastillas', solucion: 'Reemplazo pastillas y ajuste sistema', tiempoParado: 12.0, costo: 3200000, ot: 'OT-2024-0601', fecha: '25/06/2026', tecnico: 'C. Díaz', categoria: 'Falla mecánica' },
  { id: 4, activo: 'Compresor Atlas Copco', codigo: 'CMP-07', descripcion: 'Baja presión de aire', causaRaiz: 'Válvula defectuosa', solucion: 'Reemplazo válvula de alivio', tiempoParado: 6.0, costo: 920000, ot: 'OT-2024-0578', fecha: '14/06/2026', tecnico: 'L. Herrera', categoria: 'Falla neumática' },
  { id: 5, activo: 'Tractomula Freightliner', codigo: 'VH-051', descripcion: 'Falla eléctrica general', causaRaiz: 'Cortocircuito arnés', solucion: 'Reparación arnés y reemplazo fusibles', tiempoParado: 5.5, costo: 1100000, ot: 'OT-2024-0617', fecha: '30/06/2026', tecnico: 'A. Rojas', categoria: 'Falla eléctrica' },
  { id: 6, activo: 'Grúa Puente 10T', codigo: 'GP-001', descripcion: 'Ruido en polipasto', causaRaiz: 'Rodamiento desgastado', solucion: 'Reemplazo rodamiento y lubricación', tiempoParado: 9.0, costo: 2400000, ot: 'OT-2024-0594', fecha: '10/06/2026', tecnico: 'M. Vargas', categoria: 'Falla mecánica' },
  { id: 7, activo: 'Montacargas Clark C50', codigo: 'MF-019', descripcion: 'Embrague resbalando', causaRaiz: 'Desgaste disco', solucion: 'Reemplazo disco de embrague', tiempoParado: 7.0, costo: 1560000, ot: 'OT-2024-0603', fecha: '11/06/2026', tecnico: 'P. Torres', categoria: 'Falla mecánica' },
  { id: 8, activo: 'UPS Sala de Servidores', codigo: 'UPS-01', descripcion: 'Alarma de batería baja', causaRaiz: 'Degradación baterías', solucion: 'Reemplazo banco de baterías', tiempoParado: 2.0, costo: 4800000, ot: 'OT-2024-0621', fecha: '22/06/2026', tecnico: 'A. Rojas', categoria: 'Falla eléctrica' },
]

const formatCOP = (v: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const ESTADO_FMEA_COLOR: Record<FmeaRow['estado'], string> = {
  Abierto: '#ef4444',
  'En Proceso': '#f97316',
  Cerrado: '#22c55e',
}

// ─── Catálogos derivados de los datos (para formularios controlados) ────────────
const ACTIVOS_CATALOGO: string[] = Array.from(
  new Set<string>([
    ...initialFmeaRows.map((r) => r.activo),
    ...topFailures.map((r) => r.activo),
    ...monthlyFailures.map((r) => r.activo),
    ...causasRaiz.flatMap((c) => c.activosAfectados),
  ]),
).sort((a, b) => a.localeCompare(b))

const ACTIVO_CODIGO: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  ;[...topFailures, ...monthlyFailures].forEach((r) => {
    if (!m[r.activo]) m[r.activo] = r.codigo
  })
  return m
})()

const ACTIVO_DEFAULTS: Record<string, { componente: string; funcion: string; causa: string }> = (() => {
  const m: Record<string, { componente: string; funcion: string; causa: string }> = {}
  initialFmeaRows.forEach((r) => {
    if (!m[r.activo]) m[r.activo] = { componente: r.componente, funcion: r.funcion, causa: r.causa }
  })
  return m
})()

const COMPONENTES_CATALOGO: string[] = Array.from(
  new Set(initialFmeaRows.map((r) => r.componente)),
).sort((a, b) => a.localeCompare(b))

const RESPONSABLES_CATALOGO: string[] = Array.from(
  new Set(initialFmeaRows.map((r) => r.responsable)),
).sort((a, b) => a.localeCompare(b))

// ─── Sub-components ───────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

function RpnCell({ rpn }: { rpn: number }) {
  const color = rpn >= 200 ? '#ef4444' : rpn >= 100 ? '#f97316' : '#22c55e'
  return (
    <Typography sx={{ fontWeight: 900, fontSize: 18, color, textAlign: 'center' }}>
      {rpn}
    </Typography>
  )
}

function EstadoChip({ estado }: { estado: FmeaRow['estado'] }) {
  return <Chip label={estado} size="small" sx={{ bgcolor: ESTADO_FMEA_COLOR[estado], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function fmeaRowBg(rpn: number): string {
  if (rpn >= 200) return 'rgba(239,68,68,0.12)'
  if (rpn >= 100) return 'rgba(249,115,22,0.10)'
  return 'transparent'
}

const dialogPaperProps = {
  sx: { bgcolor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB' },
}

// Estilo de campos para el tema claro (texto oscuro, acento EAM)
const formFieldSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B', bgcolor: '#FFFFFF' },
  '& label': { color: '#64748B' },
  '& label.Mui-focused': { color: EAM_DARK },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.5)' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EAM_COLOR },
  '& .MuiFormHelperText-root': { color: '#94A3B8' },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
}

function DialogHeader({ code, title, subtitle, onClose }: { code: string; title: string; subtitle?: string; onClose: () => void }) {
  return (
    <DialogTitle sx={{ p: 2.5, pb: 2 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px">
            {code}
          </Typography>
          <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
            {title}
          </Typography>
          {subtitle && (
            <Typography fontSize={12.5} color="#64748B" mt={0.3}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#94A3B8', mt: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </DialogTitle>
  )
}

function DetailField({ label, value, valueColor = '#1E293B' }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box>
      <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Typography>
      <Typography fontSize={13.5} fontWeight={600} color={valueColor} sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  )
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} mb={1.5} mt={0.5}>
      <Box sx={{ color: EAM_COLOR, display: 'flex' }}>{icon}</Box>
      <Typography fontWeight={700} fontSize={14} color="#1E293B">{children}</Typography>
    </Stack>
  )
}

// ─── Dialog: Detalle de Tipo de Activo ─────────────────────────────────────────
function AssetTypeDialog({ row, onClose, onNav }: { row: AssetTypeRow | null; onClose: () => void; onNav: () => void }) {
  if (!row) return null
  const maxCasos = Math.max(...row.fallasPorModo.map((f) => f.casos))
  const dispColor = row.disponibilidad >= 95 ? '#16A34A' : row.disponibilidad >= 90 ? '#f59e0b' : '#ef4444'
  const kpis = [
    { label: 'MTBF', value: `${row.mtbf} hrs`, color: '#06B6D4' },
    { label: 'MTTR', value: `${row.mttr} hrs`, color: '#0EA5E9' },
    { label: 'Disponibilidad', value: `${row.disponibilidad}%`, color: dispColor },
    { label: 'Índice de fallas', value: row.indiceFallas.toFixed(3), color: row.indiceFallas > 0.1 ? '#ef4444' : row.indiceFallas > 0.05 ? '#f59e0b' : '#22c55e' },
    { label: 'Fallas del mes', value: String(row.fallas), color: '#ef4444' },
    { label: 'Activos en flota', value: String(row.activos), color: '#8B5CF6' },
  ]
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogHeader code="INDICADOR POR TIPO DE ACTIVO" title={row.tipo} subtitle={`${row.activos} activos · costo de mantenimiento acumulado ${formatCOP(row.costoMantenimiento)}`} onClose={onClose} />
      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <DialogContent>
        <Grid container spacing={1.5} mb={2}>
          {kpis.map((k) => (
            <Grid key={k.label} size={{ xs: 6, sm: 4 }}>
              <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}>
                <Typography fontSize={18} fontWeight={900} color={k.color} lineHeight={1.1} noWrap>{k.value}</Typography>
                <Typography fontSize={10.5} color="#64748B" mt={0.5}>{k.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box mb={2}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography fontSize={12} color="#64748B">Disponibilidad operativa</Typography>
            <Typography fontSize={12} fontWeight={700} color={dispColor}>{row.disponibilidad}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={row.disponibilidad} sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: dispColor, borderRadius: 5 } }} />
        </Box>

        <SectionTitle icon={<BugReport sx={{ fontSize: 18 }} />}>Distribución de fallas por modo</SectionTitle>
        <Stack spacing={1.25}>
          {row.fallasPorModo.map((f) => (
            <Box key={f.modo}>
              <Stack direction="row" justifyContent="space-between" mb={0.3}>
                <Typography fontSize={12.5} color="#334155" fontWeight={600}>{f.modo}</Typography>
                <Typography fontSize={12.5} fontWeight={700} color={EAM_DARK}>{f.casos} casos</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={(f.casos / maxCasos) * 100} sx={{ height: 7, borderRadius: 4, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: EAM_COLOR, borderRadius: 4 } }} />
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        <Button variant="contained" startIcon={<OTIcon />} onClick={onNav} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
          Ver activos de este tipo
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Detalle Top Falla ─────────────────────────────────────────────────
function TopFailureDialog({ row, onClose, onNav }: { row: TopFailureRow | null; onClose: () => void; onNav: (codigo: string) => void }) {
  if (!row) return null
  const TrendIcon = row.tendencia === 'sube' ? TrendingUp : row.tendencia === 'baja' ? TrendingDown : Timeline
  const trendColor = row.tendencia === 'sube' ? '#ef4444' : row.tendencia === 'baja' ? '#22c55e' : '#64748B'
  const trendLabel = row.tendencia === 'sube' ? 'Tendencia al alza' : row.tendencia === 'baja' ? 'Tendencia a la baja' : 'Estable'
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogHeader code={`RANKING #${row.rank} · ${row.codigo}`} title={row.activo} subtitle={`Responsable: ${row.responsable}`} onClose={onClose} />
      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <DialogContent>
        <Grid container spacing={1.5} mb={2}>
          <Grid size={{ xs: 6, sm: 3 }}><Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}><Typography fontSize={20} fontWeight={900} color="#ef4444">{row.fallas}</Typography><Typography fontSize={10.5} color="#64748B">Fallas (año)</Typography></Paper></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}><Typography fontSize={20} fontWeight={900} color="#f59e0b">{row.horasParado}h</Typography><Typography fontSize={10.5} color="#64748B">Horas parado</Typography></Paper></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}><Typography fontSize={15} fontWeight={900} color="#22c55e" noWrap>{formatCOP(row.costo)}</Typography><Typography fontSize={10.5} color="#64748B">Costo acum.</Typography></Paper></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}><Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}><TrendIcon sx={{ fontSize: 20, color: trendColor }} /></Stack><Typography fontSize={10.5} color="#64748B" mt={0.3}>{trendLabel}</Typography></Paper></Grid>
        </Grid>

        <Paper elevation={0} sx={{ bgcolor: alpha('#ef4444', 0.06), border: `1px solid ${alpha('#ef4444', 0.25)}`, borderRadius: '12px', p: 2, mb: 2 }}>
          <SectionTitle icon={<RootCauseIcon sx={{ fontSize: 18 }} />}>Causa raíz predominante</SectionTitle>
          <Typography fontSize={13.5} color="#334155" fontWeight={600}>{row.causaPrincipal}</Typography>
          <Typography fontSize={12} color="#64748B" mt={1}>Última falla registrada: <strong>{row.ultimaFalla}</strong></Typography>
        </Paper>

        <SectionTitle icon={<HistoryIcon sx={{ fontSize: 18 }} />}>Impacto y recomendación</SectionTitle>
        <Stack spacing={1}>
          <Typography fontSize={12.5} color="#64748B">• Promedio de <strong>{(row.horasParado / row.fallas).toFixed(1)} hrs</strong> de indisponibilidad por evento de falla.</Typography>
          <Typography fontSize={12.5} color="#64748B">• Costo promedio por falla: <strong>{formatCOP(Math.round(row.costo / row.fallas))}</strong>.</Typography>
          <Typography fontSize={12.5} color="#64748B">• Se recomienda un análisis RCA formal y plan FMEA dedicado para este activo.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        <Button variant="contained" startIcon={<OTIcon />} onClick={() => onNav(row.codigo)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
          Ver órdenes de trabajo
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Detalle FMEA ──────────────────────────────────────────────────────
function FmeaDialog({ row, onClose, onExport, onChangeEstado }: { row: FmeaRow | null; onClose: () => void; onExport: (r: FmeaRow) => void; onChangeEstado: (id: number, estado: FmeaRow['estado']) => void }) {
  if (!row) return null
  const rpn = row.s * row.o * row.d
  const rpnColor = rpn >= 200 ? '#ef4444' : rpn >= 100 ? '#f97316' : '#22c55e'
  const rpnLabel = rpn >= 200 ? 'CRÍTICO' : rpn >= 100 ? 'ALTO' : 'NORMAL'
  const severidad = [
    { label: 'Severidad (S)', value: row.s, hint: 'Gravedad del efecto de la falla' },
    { label: 'Ocurrencia (O)', value: row.o, hint: 'Frecuencia esperada de la falla' },
    { label: 'Detección (D)', value: row.d, hint: 'Dificultad para detectar la falla' },
  ]
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogHeader code={`FMEA-${String(row.id).padStart(3, '0')} · ${row.componente}`} title={row.activo} subtitle={row.funcion} onClose={onClose} />
      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <DialogContent>
        {/* RPN banner */}
        <Paper elevation={0} sx={{ bgcolor: alpha(rpnColor, 0.08), border: `1px solid ${alpha(rpnColor, 0.3)}`, borderRadius: '12px', p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {rpn >= 200 && <LocalFireDepartment sx={{ color: rpnColor }} />}
              <Box>
                <Typography fontSize={11} fontWeight={700} color="#64748B">NÚMERO DE PRIORIDAD DE RIESGO (RPN)</Typography>
                <Typography fontSize={12} color="#64748B">S × O × D = {row.s} × {row.o} × {row.d}</Typography>
              </Box>
            </Stack>
            <Stack alignItems="center">
              <Typography fontSize={34} fontWeight={900} color={rpnColor} lineHeight={1}>{rpn}</Typography>
              <Chip label={rpnLabel} size="small" sx={{ bgcolor: rpnColor, color: '#fff', fontWeight: 700, fontSize: 10, mt: 0.3 }} />
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={1.5} mb={2}>
          {severidad.map((s) => (
            <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
              <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}>
                <Typography fontSize={24} fontWeight={900} color={s.value >= 8 ? '#ef4444' : s.value >= 5 ? '#f97316' : '#22c55e'} lineHeight={1}>{s.value}</Typography>
                <Typography fontSize={11.5} fontWeight={700} color="#334155" mt={0.5}>{s.label}</Typography>
                <Typography fontSize={10} color="#94A3B8">{s.hint}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} mb={1}>
          <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Modo de falla" value={row.modoFalla} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Efecto de la falla" value={row.efecto} valueColor="#b45309" /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Causa probable" value={row.causa} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Componente / Función" value={`${row.componente} — ${row.funcion}`} /></Grid>
        </Grid>

        <Divider sx={{ borderColor: '#E5E7EB', my: 1.5 }} />

        <SectionTitle icon={<CheckIcon sx={{ fontSize: 18 }} />}>Acción recomendada</SectionTitle>
        <Paper elevation={0} sx={{ bgcolor: alpha(EAM_COLOR, 0.06), border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '10px', p: 1.75, mb: 2 }}>
          <Typography fontSize={13.5} color="#334155">{row.accion}</Typography>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Responsable" value={row.responsable} /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Fecha objetivo" value={row.fechaObjetivo} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">Estado del análisis</Typography>
            <TextField
              select size="small" fullWidth value={row.estado}
              onChange={(e) => onChangeEstado(row.id, e.target.value as FmeaRow['estado'])}
              sx={{ mt: 0.5 }}
            >
              {(['Abierto', 'En Proceso', 'Cerrado'] as const).map((o) => (
                <MenuItem key={o} value={o}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: ESTADO_FMEA_COLOR[o] }} />
                    <span>{o}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        {row.estado !== 'Cerrado' && (
          <Button
            variant="outlined" startIcon={<CheckIcon />}
            onClick={() => onChangeEstado(row.id, 'Cerrado')}
            sx={{ color: '#16A34A', borderColor: alpha('#22c55e', 0.5), '&:hover': { borderColor: '#22c55e', bgcolor: alpha('#22c55e', 0.06) }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
          >
            Cerrar análisis
          </Button>
        )}
        <Button variant="contained" startIcon={<ExportIcon />} onClick={() => onExport(row)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
          Exportar ficha FMEA
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Detalle Falla del mes ─────────────────────────────────────────────
function FailureDialog({ row, onClose, onNav }: { row: MonthlyFailure | null; onClose: () => void; onNav: (ot: string) => void }) {
  if (!row) return null
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogHeader code={`${row.ot} · ${row.codigo}`} title={row.activo} subtitle={`Falla registrada el ${row.fecha} · Técnico ${row.tecnico}`} onClose={onClose} />
      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <DialogContent>
        <Grid container spacing={1.5} mb={2}>
          <Grid size={{ xs: 6 }}><Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}><Typography fontSize={20} fontWeight={900} color="#f59e0b">{row.tiempoParado} h</Typography><Typography fontSize={10.5} color="#64748B">Tiempo parado</Typography></Paper></Grid>
          <Grid size={{ xs: 6 }}><Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}><Typography fontSize={16} fontWeight={900} color="#22c55e" noWrap>{formatCOP(row.costo)}</Typography><Typography fontSize={10.5} color="#64748B">Costo</Typography></Paper></Grid>
        </Grid>

        <SectionTitle icon={<EfectoIcon sx={{ fontSize: 18 }} />}>Descripción de la falla</SectionTitle>
        <Typography fontSize={13.5} color="#334155" mb={2}>{row.descripcion}</Typography>

        <Grid container spacing={2} mb={2}>
          <Grid size={{ xs: 6 }}>
            <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">Causa raíz</Typography>
            <Box mt={0.5}><Chip label={row.causaRaiz} size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_DARK, fontWeight: 700, fontSize: 11 }} /></Box>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">Categoría</Typography>
            <Box mt={0.5}><Chip label={row.categoria} size="small" sx={{ bgcolor: alpha('#3b82f6', 0.15), color: '#2563eb', fontWeight: 700, fontSize: 11 }} /></Box>
          </Grid>
        </Grid>

        <SectionTitle icon={<CheckIcon sx={{ fontSize: 18 }} />}>Solución aplicada</SectionTitle>
        <Paper elevation={0} sx={{ bgcolor: alpha(EAM_COLOR, 0.06), border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '10px', p: 1.75 }}>
          <Typography fontSize={13.5} color="#334155">{row.solucion}</Typography>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        <Button variant="contained" startIcon={<OTIcon />} onClick={() => onNav(row.ot)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
          Ver orden de trabajo
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Detalle Causa Raíz ────────────────────────────────────────────────
function CausaRaizDialog({ causa, total, onClose, onExport }: { causa: CausaRaiz | null; total: number; onClose: () => void; onExport: (c: CausaRaiz) => void }) {
  if (!causa) return null
  const pct = ((causa.casos / total) * 100)
  const TrendIcon = causa.tendencia === 'sube' ? TrendingUp : causa.tendencia === 'baja' ? TrendingDown : Timeline
  const trendColor = causa.tendencia === 'sube' ? '#ef4444' : causa.tendencia === 'baja' ? '#22c55e' : '#64748B'
  const trendLabel = causa.tendencia === 'sube' ? 'En aumento' : causa.tendencia === 'baja' ? 'En descenso' : 'Estable'
  const kpis = [
    { label: 'Casos registrados', value: String(causa.casos), color: '#ef4444', icon: <BugReport sx={{ fontSize: 16 }} /> },
    { label: '% del total', value: `${pct.toFixed(1)}%`, color: '#f59e0b', icon: <MetricIcon sx={{ fontSize: 16 }} /> },
    { label: 'Costo asociado', value: formatCOP(causa.costoAsociado), color: '#22c55e', icon: <ComponenteIcon sx={{ fontSize: 16 }} /> },
  ]
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogHeader code={`ANÁLISIS CAUSA RAÍZ · ${causa.categoria.toUpperCase()}`} title={causa.causa} subtitle={`Responsable de la acción: ${causa.responsable}`} onClose={onClose} />
      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <DialogContent>
        {/* KPIs */}
        <Grid container spacing={1.5} mb={2}>
          {kpis.map((k) => (
            <Grid key={k.label} size={{ xs: 6, sm: 4 }}>
              <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, textAlign: 'center' }}>
                <Box sx={{ color: k.color, display: 'flex', justifyContent: 'center', mb: 0.3 }}>{k.icon}</Box>
                <Typography fontSize={15.5} fontWeight={900} color={k.color} lineHeight={1.1} noWrap>{k.value}</Typography>
                <Typography fontSize={10.5} color="#64748B" mt={0.3}>{k.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Peso relativo + tendencia */}
        <Box mb={2}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography fontSize={12} color="#64748B">Peso relativo sobre el total de fallas</Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <TrendIcon sx={{ fontSize: 15, color: trendColor }} />
              <Typography fontSize={12} fontWeight={700} color={trendColor}>{trendLabel}</Typography>
            </Stack>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: EAM_COLOR, borderRadius: 5 } }} />
        </Box>

        {/* 5 Porqués */}
        <SectionTitle icon={<RootCauseIcon sx={{ fontSize: 18 }} />}>Análisis 5 Porqués</SectionTitle>
        <Stack spacing={1} mb={2}>
          {causa.cincoPorques.map((q, i) => {
            const esRaiz = i === causa.cincoPorques.length - 1
            return (
              <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
                <Box sx={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', bgcolor: esRaiz ? '#ef4444' : alpha(EAM_COLOR, 0.15), color: esRaiz ? '#fff' : EAM_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>{i + 1}</Box>
                <Typography fontSize={12.5} color={esRaiz ? '#b91c1c' : '#334155'} fontWeight={esRaiz ? 700 : 500} lineHeight={1.4}>{q}</Typography>
              </Stack>
            )
          })}
        </Stack>

        {/* Activos afectados */}
        <SectionTitle icon={<HistoryIcon sx={{ fontSize: 18 }} />}>Activos afectados</SectionTitle>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          {causa.activosAfectados.map((a) => (
            <Chip key={a} label={a} size="small" sx={{ bgcolor: alpha('#3b82f6', 0.12), color: '#2563eb', fontWeight: 600, fontSize: 11 }} />
          ))}
        </Stack>

        {/* Acción correctiva */}
        <SectionTitle icon={<CheckIcon sx={{ fontSize: 18 }} />}>Acción correctiva propuesta</SectionTitle>
        <Paper elevation={0} sx={{ bgcolor: alpha(EAM_COLOR, 0.06), border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '10px', p: 1.75 }}>
          <Typography fontSize={13.5} color="#334155">{causa.accion}</Typography>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        <Button variant="contained" startIcon={<ExportIcon />} onClick={() => onExport(causa)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
          Exportar RCA
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: KPI ───────────────────────────────────────────────────────────────
function KpiDialog({ kpi, onClose }: { kpi: KpiCard | null; onClose: () => void }) {
  if (!kpi) return null
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={dialogPaperProps}>
      <DialogHeader code="INDICADOR DE CONFIABILIDAD" title={kpi.label} onClose={onClose} />
      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <DialogContent>
        <Stack direction="row" alignItems="baseline" spacing={1} mb={1.5}>
          <Typography variant="h3" fontWeight={900} color="#1E293B">{kpi.value}</Typography>
          <Typography fontSize={16} color="#64748B">{kpi.unit}</Typography>
          <Chip label={kpi.trend} size="small" icon={kpi.trendUp ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />} sx={{ bgcolor: kpi.trendUp ? alpha('#22c55e', 0.15) : alpha('#ef4444', 0.15), color: kpi.trendUp ? '#16A34A' : '#ef4444', fontWeight: 700, fontSize: 11 }} />
        </Stack>
        <Typography fontSize={13.5} color="#64748B" lineHeight={1.6}>{kpi.desc}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Nuevo FMEA ────────────────────────────────────────────────────────
interface NewFmeaForm {
  activo: string
  componente: string
  funcion: string
  modoFalla: string
  efecto: string
  causa: string
  s: number
  o: number
  d: number
  accion: string
  responsable: string
  estado: FmeaRow['estado']
  fechaObjetivo: string
}

const emptyFmeaForm: NewFmeaForm = {
  activo: '', componente: '', funcion: '', modoFalla: '', efecto: '', causa: '',
  s: 5, o: 5, d: 5, accion: '', responsable: '', estado: 'Abierto', fechaObjetivo: '',
}

function NewFmeaDialog({ open, onClose, onCreate, onWarn }: { open: boolean; onClose: () => void; onCreate: (f: NewFmeaForm) => void; onWarn: (msg: string) => void }) {
  const [form, setForm] = useState<NewFmeaForm>(emptyFmeaForm)
  const [triedSubmit, setTriedSubmit] = useState(false)
  const set = (k: keyof NewFmeaForm, v: string | number) => setForm((p) => ({ ...p, [k]: v }))
  const rpn = form.s * form.o * form.d
  const rpnColor = rpn >= 200 ? '#ef4444' : rpn >= 100 ? '#f97316' : '#22c55e'
  const rpnLabel = rpn >= 200 ? 'CRÍTICO' : rpn >= 100 ? 'ALTO' : 'NORMAL'

  // Código / placa autocompletado a partir del activo seleccionado
  const codigo = ACTIVO_CODIGO[form.activo] ?? ''

  // Campos obligatorios
  const errActivo = !form.activo
  const errComponente = !form.componente
  const errModo = !form.modoFalla.trim()
  const errResponsable = !form.responsable
  const errFecha = !form.fechaObjetivo
  const valid = !errActivo && !errComponente && !errModo && !errResponsable && !errFecha

  // Al elegir un activo, precargar componente/función/causa conocidos si están vacíos
  const handleActivo = (activo: string) => {
    const d = ACTIVO_DEFAULTS[activo]
    setForm((p) => ({
      ...p,
      activo,
      componente: p.componente || d?.componente || '',
      funcion: p.funcion || d?.funcion || '',
      causa: p.causa || d?.causa || '',
    }))
  }

  const handleCreate = () => {
    if (!valid) {
      setTriedSubmit(true)
      onWarn('Complete los campos obligatorios: activo, componente, modo de falla, responsable y fecha objetivo')
      return
    }
    onCreate(form)
    setForm(emptyFmeaForm)
    setTriedSubmit(false)
  }
  const handleClose = () => { setForm(emptyFmeaForm); setTriedSubmit(false); onClose() }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogHeader code="NUEVO ANÁLISIS FMEA" title="Registrar modo de falla" subtitle="Complete los campos para incorporar el análisis a la matriz de riesgo" onClose={handleClose} />
      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <DialogContent>
        <Grid container spacing={2}>
          {/* Fila: activo + código autocompletado */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select label="Activo *" size="small" fullWidth sx={formFieldSx}
              value={form.activo} onChange={(e) => handleActivo(e.target.value)}
              error={triedSubmit && errActivo}
              helperText={triedSubmit && errActivo ? 'Seleccione el activo' : 'Se autocompleta el código'}
            >
              {ACTIVOS_CATALOGO.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Código / Placa" size="small" fullWidth sx={formFieldSx}
              value={codigo} InputProps={{ readOnly: true }}
              placeholder="—" helperText="Derivado del activo"
            />
          </Grid>

          {/* Fila: componente + responsable */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select label="Componente *" size="small" fullWidth sx={formFieldSx}
              value={form.componente} onChange={(e) => set('componente', e.target.value)}
              error={triedSubmit && errComponente}
              helperText={triedSubmit && errComponente ? 'Seleccione el componente' : ' '}
            >
              {COMPONENTES_CATALOGO.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select label="Responsable *" size="small" fullWidth sx={formFieldSx}
              value={form.responsable} onChange={(e) => set('responsable', e.target.value)}
              error={triedSubmit && errResponsable}
              helperText={triedSubmit && errResponsable ? 'Asigne un responsable' : ' '}
            >
              {RESPONSABLES_CATALOGO.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField label="Función del componente" size="small" fullWidth sx={formFieldSx} value={form.funcion} onChange={(e) => set('funcion', e.target.value)} helperText=" " />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Modo de falla *" size="small" fullWidth sx={formFieldSx}
              value={form.modoFalla} onChange={(e) => set('modoFalla', e.target.value)}
              error={triedSubmit && errModo}
              helperText={triedSubmit && errModo ? 'Describa el modo de falla' : ' '}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Efecto de la falla" size="small" fullWidth sx={formFieldSx} value={form.efecto} onChange={(e) => set('efecto', e.target.value)} helperText=" " /></Grid>
          <Grid size={{ xs: 12 }}><TextField label="Causa probable" size="small" fullWidth sx={formFieldSx} value={form.causa} onChange={(e) => set('causa', e.target.value)} helperText=" " /></Grid>

          <Grid size={{ xs: 4, sm: 3 }}>
            <TextField select label="Severidad (S)" size="small" fullWidth sx={formFieldSx} value={form.s} onChange={(e) => set('s', Number(e.target.value))} helperText=" ">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4, sm: 3 }}>
            <TextField select label="Ocurrencia (O)" size="small" fullWidth sx={formFieldSx} value={form.o} onChange={(e) => set('o', Number(e.target.value))} helperText=" ">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4, sm: 3 }}>
            <TextField select label="Detección (D)" size="small" fullWidth sx={formFieldSx} value={form.d} onChange={(e) => set('d', Number(e.target.value))} helperText=" ">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Paper elevation={0} sx={{ bgcolor: alpha(rpnColor, 0.08), border: `1px solid ${alpha(rpnColor, 0.3)}`, borderRadius: '10px', p: 1, textAlign: 'center', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography fontSize={22} fontWeight={900} color={rpnColor} lineHeight={1}>{rpn}</Typography>
              <Stack alignItems="flex-start">
                <Typography fontSize={9.5} color="#64748B" lineHeight={1}>RPN</Typography>
                <Typography fontSize={9.5} fontWeight={800} color={rpnColor} lineHeight={1.1}>{rpnLabel}</Typography>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}><TextField label="Acción recomendada" size="small" fullWidth multiline minRows={2} sx={formFieldSx} value={form.accion} onChange={(e) => set('accion', e.target.value)} helperText=" " /></Grid>
          <Grid size={{ xs: 6, sm: 6 }}>
            <TextField select label="Estado" size="small" fullWidth sx={formFieldSx} value={form.estado} onChange={(e) => set('estado', e.target.value as FmeaRow['estado'])} helperText=" ">
              {(['Abierto', 'En Proceso', 'Cerrado'] as const).map((o) => (
                <MenuItem key={o} value={o}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: ESTADO_FMEA_COLOR[o] }} />
                    <span>{o}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 6 }}>
            <TextField
              label="Fecha objetivo *" type="date" size="small" fullWidth sx={formFieldSx}
              InputLabelProps={{ shrink: true }} value={form.fechaObjetivo} onChange={(e) => set('fechaObjetivo', e.target.value)}
              error={triedSubmit && errFecha}
              helperText={triedSubmit && errFecha ? 'Defina la fecha objetivo' : ' '}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={handleClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={!valid} startIcon={<AddIcon />} onClick={handleCreate} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
          Agregar a la matriz
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Tab 0: KPIs Confiabilidad ────────────────────────────────────────────────
function KpisTab({
  onKpiClick, onAssetTypeClick, onTopFailureClick, tipoFilter, setTipoFilter,
}: {
  onKpiClick: (k: KpiCard) => void
  onAssetTypeClick: (r: AssetTypeRow) => void
  onTopFailureClick: (r: TopFailureRow) => void
  tipoFilter: string
  setTipoFilter: (v: string) => void
}) {
  const filteredAssetRows = tipoFilter === 'Todos' ? assetTypeRows : assetTypeRows.filter((r) => r.tipo === tipoFilter)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        {kpiCards.map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={kpi.label}>
            <Card
              onClick={() => onKpiClick(kpi)}
              sx={{ border: `1px solid ${EAM_COLOR}33`, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: EAM_COLOR, boxShadow: `0 4px 14px ${alpha(EAM_COLOR, 0.18)}`, transform: 'translateY(-2px)' } }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ color: EAM_COLOR }}>{kpi.icon}</Box>
                  <Chip
                    label={kpi.trend}
                    size="small"
                    sx={{ bgcolor: kpi.trendUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: kpi.trendUp ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 10 }}
                  />
                </Box>
                <Typography variant="h3" sx={{ color: '#1E293B', fontWeight: 900, lineHeight: 1 }}>
                  {kpi.value}
                  <Typography component="span" sx={{ fontSize: 16, color: '#64748B', ml: 0.5 }}>{kpi.unit}</Typography>
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontWeight: 600 }}>{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Asset type table */}
      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} mb={2}>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>Indicadores por Tipo de Activo</Typography>
          <TextField
            select size="small" label="Filtrar tipo" value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)} sx={{ minWidth: 220 }}
          >
            {['Todos', ...assetTypeRows.map((r) => r.tipo)].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
        </Stack>
        <TableContainer component={Paper} sx={{ border: `1px solid #E5E7EB` }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Tipo Activo', 'MTBF (hrs)', 'MTTR (hrs)', 'Disponibilidad%', 'Fallas este mes', 'Índice de Fallas'].map((h) => (
                  <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssetRows.map((row) => (
                <TableRow key={row.tipo} onClick={() => onAssetTypeClick(row)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(50,172,92,0.06)' } }}>
                  <TableCell sx={{ color: '#334155', fontWeight: 600, borderColor: '#E5E7EB' }}>{row.tipo}</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#E5E7EB' }}>{row.mtbf}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB' }}>{row.mttr}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate" value={row.disponibilidad}
                        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: row.disponibilidad >= 95 ? '#22c55e' : row.disponibilidad >= 90 ? '#f59e0b' : '#ef4444' } }}
                      />
                      <Typography sx={{ color: '#334155', fontSize: 12, minWidth: 40 }}>{row.disponibilidad}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{row.fallas}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Typography sx={{ color: row.indiceFallas > 0.1 ? '#ef4444' : row.indiceFallas > 0.05 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>{row.indiceFallas.toFixed(3)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAssetRows.length === 0 && (
                <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: '#94A3B8', borderColor: '#E5E7EB', py: 3 }}>Sin resultados para el filtro seleccionado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography fontSize={11.5} color="#94A3B8" mt={1}>Haz clic en una fila para ver el detalle de confiabilidad del tipo de activo.</Typography>
      </Box>

      {/* Bathtub curve */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Curva de Bañera — Tasa de Fallas vs. Tiempo</Typography>
        <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 160, position: 'relative' }}>
            <Box sx={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', color: '#64748B', fontSize: 11, whiteSpace: 'nowrap' }}>Tasa de Fallas</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Typography sx={{ color: '#ef4444', fontSize: 10, fontWeight: 700, mb: 0.5, textAlign: 'center' }}>Mortalidad Infantil</Typography>
              <Box sx={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: 120 }}>
                {[110, 90, 72, 58, 46, 37, 30, 26, 23].map((h, i) => (
                  <Box key={i} sx={{ flex: 1, height: `${h}px`, bgcolor: '#ef4444', opacity: 0.7, borderRadius: '2px 2px 0 0', transition: 'all 0.3s' }} />
                ))}
              </Box>
              <Box sx={{ width: '100%', height: 4, bgcolor: '#ef4444', opacity: 0.3 }} />
              <Typography sx={{ color: '#ef4444', fontSize: 9, mt: 0.5 }}>Decreciente</Typography>
            </Box>
            <Divider orientation="vertical" sx={{ bgcolor: '#E5E7EB', height: 130, alignSelf: 'flex-end' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.4 }}>
              <Typography sx={{ color: '#22c55e', fontSize: 10, fontWeight: 700, mb: 0.5, textAlign: 'center' }}>Vida Útil</Typography>
              <Box sx={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: 120 }}>
                {[22, 21, 22, 20, 22, 21, 21, 22, 20, 21, 22, 21].map((h, i) => (
                  <Box key={i} sx={{ flex: 1, height: `${h}px`, bgcolor: '#22c55e', opacity: 0.7, borderRadius: '2px 2px 0 0' }} />
                ))}
              </Box>
              <Box sx={{ width: '100%', height: 4, bgcolor: '#22c55e', opacity: 0.3 }} />
              <Typography sx={{ color: '#22c55e', fontSize: 9, mt: 0.5 }}>Constante (baja)</Typography>
            </Box>
            <Divider orientation="vertical" sx={{ bgcolor: '#E5E7EB', height: 130, alignSelf: 'flex-end' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Typography sx={{ color: '#f59e0b', fontSize: 10, fontWeight: 700, mb: 0.5, textAlign: 'center' }}>Desgaste</Typography>
              <Box sx={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: 120 }}>
                {[23, 26, 31, 38, 48, 60, 76, 95, 115].map((h, i) => (
                  <Box key={i} sx={{ flex: 1, height: `${Math.min(h, 120)}px`, bgcolor: '#f59e0b', opacity: 0.7, borderRadius: '2px 2px 0 0' }} />
                ))}
              </Box>
              <Box sx={{ width: '100%', height: 4, bgcolor: '#f59e0b', opacity: 0.3 }} />
              <Typography sx={{ color: '#f59e0b', fontSize: 9, mt: 0.5 }}>Creciente</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Typography sx={{ color: '#64748B', fontSize: 11 }}>Tiempo →</Typography>
          </Box>
        </Card>
      </Box>

      {/* Top 5 failures table */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Top 5 Activos con Mayor Número de Fallas este Año</Typography>
        <TableContainer component={Paper} sx={{ border: `1px solid #E5E7EB` }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Activo', 'Placa / Código', 'Fallas', 'Horas Parado', 'Costo Acumulado'].map((h) => (
                  <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {topFailures.map((row) => (
                <TableRow key={row.rank} onClick={() => onTopFailureClick(row)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(50,172,92,0.06)' } }}>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: row.rank === 1 ? '#ef4444' : row.rank === 2 ? '#f97316' : row.rank === 3 ? '#f59e0b' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 }}>{row.rank}</Box>
                  </TableCell>
                  <TableCell sx={{ color: '#334155', fontWeight: 600, borderColor: '#E5E7EB' }}>{row.activo}</TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB' }}>{row.codigo}</TableCell>
                  <TableCell sx={{ color: '#ef4444', fontWeight: 700, borderColor: '#E5E7EB' }}>{row.fallas}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB' }}>{row.horasParado} hrs</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#E5E7EB' }}>{formatCOP(row.costo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography fontSize={11.5} color="#94A3B8" mt={1}>Haz clic en un activo para ver su análisis de fallas y causa raíz.</Typography>
      </Box>
    </Box>
  )
}

// ─── Tab 1: FMEA ──────────────────────────────────────────────────────────────
function FmeaTab({
  rows, onRowClick, onNew, search, setSearch, estadoFilter, setEstadoFilter, riesgoFilter, setRiesgoFilter,
}: {
  rows: FmeaRow[]
  onRowClick: (r: FmeaRow) => void
  onNew: () => void
  search: string
  setSearch: (v: string) => void
  estadoFilter: string
  setEstadoFilter: (v: string) => void
  riesgoFilter: string
  setRiesgoFilter: (v: string) => void
}) {
  const filtered = rows.filter((row) => {
    const rpn = row.s * row.o * row.d
    if (estadoFilter !== 'Todos' && row.estado !== estadoFilter) return false
    if (riesgoFilter === 'Crítico' && rpn < 200) return false
    if (riesgoFilter === 'Alto' && (rpn < 100 || rpn >= 200)) return false
    if (riesgoFilter === 'Normal' && rpn >= 100) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!row.activo.toLowerCase().includes(q) && !row.componente.toLowerCase().includes(q) && !row.modoFalla.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1.5} mb={2}>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>Análisis de Modos y Efectos de Falla (FMEA)</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNew} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
          Nuevo análisis FMEA
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          size="small" placeholder="Buscar activo, componente o modo de falla…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 280, flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
        />
        <TextField select size="small" label="Estado" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} sx={{ minWidth: 160 }}>
          {['Todos', 'Abierto', 'En Proceso', 'Cerrado'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Nivel de riesgo" value={riesgoFilter} onChange={(e) => setRiesgoFilter(e.target.value)} sx={{ minWidth: 170 }}>
          {['Todos', 'Crítico', 'Alto', 'Normal'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      </Stack>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'rgba(239,68,68,0.4)', border: '1px solid #ef4444' }} />
          <Typography sx={{ color: '#64748B', fontSize: 12 }}>RPN ≥ 200 — Crítico</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'rgba(249,115,22,0.4)', border: '1px solid #f97316' }} />
          <Typography sx={{ color: '#64748B', fontSize: 12 }}>RPN 100–199 — Alto</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'transparent', border: '1px solid #334155' }} />
          <Typography sx={{ color: '#64748B', fontSize: 12 }}>RPN &lt; 100 — Normal</Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>{filtered.length} de {rows.length} análisis · clic en una fila para el detalle</Typography>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ border: `1px solid #E5E7EB`, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1400 }}>
          <TableHead>
            <TableRow>
              {['Activo', 'Componente', 'Función', 'Modo de Falla', 'Efecto', 'S', 'O', 'D', 'RPN', 'Acción Recomendada', 'Responsable', 'Estado'].map((h) => (
                <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => {
              const rpn = row.s * row.o * row.d
              return (
                <TableRow key={row.id} onClick={() => onRowClick(row)} sx={{ cursor: 'pointer', bgcolor: fmeaRowBg(rpn), '&:hover': { bgcolor: rpn >= 200 ? 'rgba(239,68,68,0.18)' : 'rgba(50,172,92,0.06)' } }}>
                  <TableCell sx={{ color: '#334155', fontWeight: 600, borderColor: '#E5E7EB', whiteSpace: 'nowrap', fontSize: 12 }}>{row.activo}</TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', whiteSpace: 'nowrap', fontSize: 12 }}>{row.componente}</TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12, maxWidth: 160 }}>{row.funcion}</TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12, maxWidth: 180 }}>{row.modoFalla}</TableCell>
                  <TableCell sx={{ color: '#b45309', borderColor: '#E5E7EB', fontSize: 12, maxWidth: 200 }}>{row.efecto}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: row.s >= 8 ? '#ef4444' : row.s >= 5 ? '#f97316' : '#22c55e', fontSize: 13 }}>{row.s}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: row.o >= 8 ? '#ef4444' : row.o >= 5 ? '#f97316' : '#22c55e', fontSize: 13 }}>{row.o}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: row.d >= 8 ? '#ef4444' : row.d >= 5 ? '#f97316' : '#22c55e', fontSize: 13 }}>{row.d}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB', textAlign: 'center' }}><RpnCell rpn={rpn} /></TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 11, maxWidth: 200 }}>{row.accion}</TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 11, whiteSpace: 'nowrap' }}>{row.responsable}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}><EstadoChip estado={row.estado} /></TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={12} sx={{ textAlign: 'center', color: '#94A3B8', borderColor: '#E5E7EB', py: 3 }}>No hay análisis FMEA que coincidan con los filtros.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

// ─── Tab 2: Análisis de Fallas ────────────────────────────────────────────────
function AnalisisFallasTab({
  onCausaClick, onFailureClick, onExport, search, setSearch, categoriaFilter, setCategoriaFilter,
}: {
  onCausaClick: (c: CausaRaiz) => void
  onFailureClick: (f: MonthlyFailure) => void
  onExport: () => void
  search: string
  setSearch: (v: string) => void
  categoriaFilter: string
  setCategoriaFilter: (v: string) => void
}) {
  const maxFallas = Math.max(...paretoData.map((d) => d.fallas))
  const maxCasos = Math.max(...causasRaiz.map((c) => c.casos))
  const categorias = ['Todas', ...Array.from(new Set(monthlyFailures.map((f) => f.categoria)))]

  const filteredFailures = monthlyFailures.filter((f) => {
    if (categoriaFilter !== 'Todas' && f.categoria !== categoriaFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!f.activo.toLowerCase().includes(q) && !f.descripcion.toLowerCase().includes(q) && !f.ot.toLowerCase().includes(q) && !f.causaRaiz.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Pareto Diagram */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Diagrama de Pareto — Top 5 Tipos de Falla</Typography>
        <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 200 }}>
            {paretoData.map((d, i) => {
              const barColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']
              const barH = Math.round((d.fallas / maxFallas) * 170)
              return (
                <Tooltip key={d.tipo} title={`${d.fallas} fallas · ${d.pct}% · acumulado ${d.cumPct}%`} arrow>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
                    <Typography sx={{ color: barColors[i], fontWeight: 900, fontSize: 14 }}>{d.fallas}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ color: '#64748B', fontSize: 9, mb: 0.3 }}>Acum: {d.cumPct}%</Typography>
                      <Box sx={{ width: '100%', height: barH, bgcolor: barColors[i], opacity: 0.85, borderRadius: '4px 4px 0 0', transition: 'all 0.3s', position: 'relative', '&:hover': { opacity: 1 } }} />
                    </Box>
                    <Divider sx={{ width: '100%', bgcolor: '#E5E7EB' }} />
                    <Typography sx={{ color: '#64748B', fontSize: 10, textAlign: 'center', lineHeight: 1.2, mt: 0.5 }}>{d.tipo}</Typography>
                    <Typography sx={{ color: barColors[i], fontSize: 10, fontWeight: 700 }}>{d.pct}%</Typography>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Typography sx={{ color: '#64748B', fontSize: 11 }}>Tipo de Falla → (Total: 100 fallas)</Typography>
          </Box>
        </Card>
      </Box>

      {/* Root causes */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Causas Raíz más Frecuentes</Typography>
        <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {causasRaiz.map((c, i) => {
              const pct = Math.round((c.casos / maxCasos) * 100)
              const colors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']
              return (
                <Box key={c.causa} onClick={() => onCausaClick(c)} sx={{ cursor: 'pointer', p: 1, mx: -1, borderRadius: 1.5, transition: 'background-color 0.12s', '&:hover': { bgcolor: 'rgba(50,172,92,0.06)' } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ color: '#334155', fontSize: 13, fontWeight: 600 }}>{c.causa}</Typography>
                    <Typography sx={{ color: colors[i], fontWeight: 700, fontSize: 13 }}>{c.casos} casos</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: colors[i], borderRadius: 4 } }} />
                </Box>
              )
            })}
          </Box>
          <Typography fontSize={11.5} color="#94A3B8" mt={2}>Haz clic en una causa para ver la acción correctiva propuesta.</Typography>
        </Card>
      </Box>

      {/* Monthly failures table */}
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1.5} mb={2}>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>Fallas del Mes en Curso</Typography>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={onExport} sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.5), '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
            Exportar registro
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small" placeholder="Buscar activo, falla, causa u OT…" value={search}
            onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 280, flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
          />
          <TextField select size="small" label="Categoría" value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} sx={{ minWidth: 180 }}>
            {categorias.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
        </Stack>

        <TableContainer component={Paper} sx={{ border: `1px solid #E5E7EB`, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                {['Activo', 'Descripción Falla', 'Causa Raíz', 'Solución Aplicada', 'Tiempo Parado (hrs)', 'Costo ($)', 'OT#'].map((h) => (
                  <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFailures.map((row) => (
                <TableRow key={row.id} onClick={() => onFailureClick(row)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(50,172,92,0.06)' } }}>
                  <TableCell sx={{ color: '#334155', fontWeight: 600, borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{row.activo}</TableCell>
                  <TableCell sx={{ color: '#b45309', borderColor: '#E5E7EB', fontSize: 12 }}>{row.descripcion}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB', fontSize: 12 }}>
                    <Chip label={row.causaRaiz} size="small" sx={{ bgcolor: 'rgba(50,172,92,0.15)', color: EAM_DARK, fontWeight: 600, fontSize: 10 }} />
                  </TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }}>{row.solucion}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB', textAlign: 'center', fontSize: 12 }}>{row.tiempoParado}</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{formatCOP(row.costo)}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Typography sx={{ color: '#2563eb', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{row.ot}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filteredFailures.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: '#94A3B8', borderColor: '#E5E7EB', py: 3 }}>No hay fallas que coincidan con los filtros.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function EAMConfiabilidad() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)

  // FMEA data as state (mutable for creation)
  const [fmeaRows, setFmeaRows] = useState<FmeaRow[]>(initialFmeaRows)

  // Filters
  const [tipoFilter, setTipoFilter] = useState('Todos')
  const [fmeaSearch, setFmeaSearch] = useState('')
  const [fmeaEstado, setFmeaEstado] = useState('Todos')
  const [fmeaRiesgo, setFmeaRiesgo] = useState('Todos')
  const [fallasSearch, setFallasSearch] = useState('')
  const [fallasCategoria, setFallasCategoria] = useState('Todas')

  // Dialog selection state
  const [kpiSel, setKpiSel] = useState<KpiCard | null>(null)
  const [assetTypeSel, setAssetTypeSel] = useState<AssetTypeRow | null>(null)
  const [topFailSel, setTopFailSel] = useState<TopFailureRow | null>(null)
  const [fmeaSel, setFmeaSel] = useState<FmeaRow | null>(null)
  const [failureSel, setFailureSel] = useState<MonthlyFailure | null>(null)
  const [causaSel, setCausaSel] = useState<CausaRaiz | null>(null)
  const [newFmeaOpen, setNewFmeaOpen] = useState(false)

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'info' | 'warning' }>({ open: false, msg: '', severity: 'success' })
  const notify = (msg: string, severity: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, severity })

  const totalCausas = useMemo(() => causasRaiz.reduce((s, c) => s + c.casos, 0), [])

  const handleCreateFmea = (form: NewFmeaForm) => {
    const nextId = Math.max(0, ...fmeaRows.map((r) => r.id)) + 1
    setFmeaRows((prev) => [
      { ...form, id: nextId, fechaObjetivo: form.fechaObjetivo || 'Sin fecha' },
      ...prev,
    ])
    setNewFmeaOpen(false)
    notify(`Análisis FMEA agregado (RPN ${form.s * form.o * form.d})`)
  }

  const handleChangeFmeaEstado = (id: number, estado: FmeaRow['estado']) => {
    setFmeaRows((prev) => prev.map((r) => (r.id === id ? { ...r, estado } : r)))
    setFmeaSel((prev) => (prev && prev.id === id ? { ...prev, estado } : prev))
    notify(`Estado del análisis FMEA actualizado a "${estado}"`)
  }

  const tabLabels = ['KPIs Confiabilidad', 'FMEA', 'Análisis de Fallas']
  const tabIcons = [<Assessment />, <BugReport />, <Timeline />]

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: `${EAM_COLOR}22`, border: `1px solid ${EAM_COLOR}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: EAM_COLOR }}>
            <Engineering fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#1E293B', fontWeight: 800, lineHeight: 1 }}>EAM — Confiabilidad</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>ICOLTRANS · Gestión de Confiabilidad, FMEA y Análisis de Fallas</Typography>
          </Box>
        </Box>

        <Divider sx={{ bgcolor: '#E5E7EB', mb: 3 }} />

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          sx={{ mb: 1, '& .MuiTab-root': { color: '#64748b', fontWeight: 600, textTransform: 'none', fontSize: 14 }, '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { bgcolor: EAM_COLOR } }}
        >
          {tabLabels.map((label, i) => (
            <Tab key={label} label={label} icon={tabIcons[i]} iconPosition="start" />
          ))}
        </Tabs>

        <Divider sx={{ bgcolor: '#E5E7EB', mb: 1 }} />

        <TabPanel value={tab} index={0}>
          <KpisTab
            onKpiClick={setKpiSel}
            onAssetTypeClick={setAssetTypeSel}
            onTopFailureClick={setTopFailSel}
            tipoFilter={tipoFilter}
            setTipoFilter={setTipoFilter}
          />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <FmeaTab
            rows={fmeaRows}
            onRowClick={setFmeaSel}
            onNew={() => setNewFmeaOpen(true)}
            search={fmeaSearch}
            setSearch={setFmeaSearch}
            estadoFilter={fmeaEstado}
            setEstadoFilter={setFmeaEstado}
            riesgoFilter={fmeaRiesgo}
            setRiesgoFilter={setFmeaRiesgo}
          />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <AnalisisFallasTab
            onCausaClick={setCausaSel}
            onFailureClick={setFailureSel}
            onExport={() => notify('Registro de fallas exportado a Excel', 'info')}
            search={fallasSearch}
            setSearch={setFallasSearch}
            categoriaFilter={fallasCategoria}
            setCategoriaFilter={setFallasCategoria}
          />
        </TabPanel>
      </Box>

      {/* Dialogs */}
      <KpiDialog kpi={kpiSel} onClose={() => setKpiSel(null)} />
      <AssetTypeDialog
        row={assetTypeSel}
        onClose={() => setAssetTypeSel(null)}
        onNav={() => { setAssetTypeSel(null); navigate('/eam/activos') }}
      />
      <TopFailureDialog
        row={topFailSel}
        onClose={() => setTopFailSel(null)}
        onNav={(codigo) => { setTopFailSel(null); navigate(`/eam/ordenes-trabajo?activo=${encodeURIComponent(codigo)}`) }}
      />
      <FmeaDialog
        row={fmeaSel}
        onClose={() => setFmeaSel(null)}
        onExport={(r) => { setFmeaSel(null); notify(`Ficha FMEA de "${r.componente}" exportada`, 'info') }}
        onChangeEstado={handleChangeFmeaEstado}
      />
      <FailureDialog
        row={failureSel}
        onClose={() => setFailureSel(null)}
        onNav={(ot) => { setFailureSel(null); navigate(`/eam/ordenes-trabajo?ot=${encodeURIComponent(ot)}`) }}
      />
      <CausaRaizDialog
        causa={causaSel}
        total={totalCausas}
        onClose={() => setCausaSel(null)}
        onExport={(c) => { setCausaSel(null); notify(`Informe RCA de "${c.causa}" exportado`, 'info') }}
      />
      <NewFmeaDialog open={newFmeaOpen} onClose={() => setNewFmeaOpen(false)} onCreate={handleCreateFmea} onWarn={(msg) => notify(msg, 'warning')} />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
