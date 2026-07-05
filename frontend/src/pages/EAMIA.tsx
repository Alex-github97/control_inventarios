import React, { useState, useRef, useEffect, useMemo, type ChangeEvent, type SyntheticEvent, type MouseEvent } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, alpha, Divider, LinearProgress, TextField,
  IconButton, Avatar, Tooltip, MenuItem, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
} from '@mui/material'
import {
  AutoAwesome as AIIcon,
  Build as BuildIcon,
  TrendingUp as TrendIcon,
  Inventory as StockIcon,
  Timeline as TimelineIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Speed as SpeedIcon,
  Close as CloseIcon,
  Insights as InsightsIcon,
  ShoppingCart as CartIcon,
  Search as SearchIcon,
  OpenInNew as OpenIcon,
  ShowChart as ChartIcon,
  ReportProblem as AlertIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'
const EAM_DARK = '#27884A'
const AI_COLOR = '#8B5CF6'
const TEXT_PRIMARY = '#1E293B'
const TEXT_SECONDARY = '#64748B'
const CARD_BG = '#FFFFFF'
const BORDER = '#E5E7EB'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

interface SensorPoint { t: string; v: number }

interface Prediccion {
  id: number
  activo: string
  activoNombre: string
  sistema: string
  probabilidad: number
  diasRestantes: number
  causa: string
  critico: boolean
  confianza: number
  modelo: string
  tipoFalla: string
  costoFalla: number
  costoPreventivo: number
  recomendacion: string
  evidencia: string[]
  serie: SensorPoint[]
  unidad: string
  umbral: number
  historial: { fecha: string; evento: string }[]
}

interface VentanaMantenimiento {
  id: number
  activo: string
  tipo: string
  diaSugerido: string
  turno: string
  impactoSinPM: string
  ahorro: number
  duracion: string
  tecnicoSugerido: string
  razon: string
  conflictoOperativo: string
  repuestosNecesarios: string[]
}

interface RepuestoCritico {
  codigo: string
  descripcion: string
  cantidadActual: number
  cantidadSugerida: number
  costo: number
  riesgo: 'ALTO' | 'MEDIO' | 'BAJO'
  proveedor: string
  leadTime: string
  consumoMensual: number
  activosAfectados: string[]
  motivo: string
}

interface Anomalia {
  id: number
  activo: string
  activoNombre: string
  tipoAnomalia: string
  valorDetectado: string
  valorNormal: string
  desviacion: number
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  fecha: string
  estado: 'NUEVA' | 'EN_REVISION' | 'RESUELTA'
  sensor: string
  metodo: string
  serie: SensorPoint[]
  unidad: string
  umbral: number
  interpretacion: string
  accionRecomendada: string
}

interface ChatMsg {
  role: 'user' | 'bot'
  text: string
  ts: Date
}

const PREDICCIONES: Prediccion[] = [
  {
    id: 1, activo: 'SRV-01', activoNombre: 'Servidor Dell PowerEdge R740', sistema: 'UPS / Alimentación',
    probabilidad: 91, diasRestantes: 3, causa: 'Batería degradada — tensión en caída', critico: true,
    confianza: 94, modelo: 'LSTM Anomaly v3.2', tipoFalla: 'Corte de energía / apagado no programado',
    costoFalla: 42000000, costoPreventivo: 1680000,
    recomendacion: 'Reemplazar el banco de baterías AGM del UPS y ejecutar prueba de autonomía antes de 72h.',
    evidencia: [
      'Tensión de batería cayó de 13.2V a 10.8V en 96 horas',
      'Autonomía medida: 4 min (nominal 15 min)',
      'Ciclos de carga: 1,240 (fin de vida útil estimado 1,200)',
      'Temperatura de celda 3 elevada (+8°C sobre promedio)',
    ],
    serie: [
      { t: 'D-5', v: 13.2 }, { t: 'D-4', v: 12.9 }, { t: 'D-3', v: 12.4 },
      { t: 'D-2', v: 11.8 }, { t: 'D-1', v: 11.2 }, { t: 'Hoy', v: 10.8 },
    ],
    unidad: 'V', umbral: 11.5,
    historial: [
      { fecha: '2024-06-01', evento: 'Instalación banco de baterías AGM' },
      { fecha: '2025-01-15', evento: 'PM preventivo — prueba de autonomía OK (14 min)' },
      { fecha: '2025-06-18', evento: 'Alerta IA: degradación acelerada detectada' },
    ],
  },
  {
    id: 2, activo: 'VH-001', activoNombre: 'Tractocamión Kenworth T800', sistema: 'Motor CUMMINS ISX15',
    probabilidad: 78, diasRestantes: 12, causa: 'Desgaste en laminillas de culata', critico: false,
    confianza: 86, modelo: 'Gradient Boosting v2.1', tipoFalla: 'Sobrecalentamiento / pérdida de compresión',
    costoFalla: 28000000, costoPreventivo: 3200000,
    recomendacion: 'Programar revisión de culata y sistema de refrigeración en próxima ventana nocturna.',
    evidencia: [
      'Temperatura de motor 108°C (umbral 95°C) en rutas de alta carga',
      'Consumo de refrigerante +18% en el último mes',
      'Análisis de aceite: partículas de aluminio elevadas',
    ],
    serie: [
      { t: 'D-5', v: 92 }, { t: 'D-4', v: 96 }, { t: 'D-3', v: 99 },
      { t: 'D-2', v: 103 }, { t: 'D-1', v: 106 }, { t: 'Hoy', v: 108 },
    ],
    unidad: '°C', umbral: 95,
    historial: [
      { fecha: '2025-05-15', evento: 'PM Motor a 480,000 km' },
      { fecha: '2025-06-10', evento: 'Reporte conductor: temperatura elevada en ascensos' },
      { fecha: '2025-06-19', evento: 'Alerta IA: tendencia térmica anómala' },
    ],
  },
  {
    id: 3, activo: 'MC-003', activoNombre: 'Montacargas Toyota 8FGCU25', sistema: 'Sistema hidráulico',
    probabilidad: 65, diasRestantes: 18, causa: 'Contaminación de aceite hidráulico', critico: false,
    confianza: 79, modelo: 'Random Forest v1.8', tipoFalla: 'Pérdida de capacidad de carga / falla de bomba',
    costoFalla: 9500000, costoPreventivo: 850000,
    recomendacion: 'Cambio de aceite hidráulico ISO 46 y reemplazo de filtro. Inspeccionar sellos.',
    evidencia: [
      'Presión hidráulica 180 bar (nominal 210 bar)',
      'Análisis de aceite: contaminación por partículas clase 22/20/17 ISO',
      'Tiempo de elevación +2.4s respecto a línea base',
    ],
    serie: [
      { t: 'D-5', v: 210 }, { t: 'D-4', v: 205 }, { t: 'D-3', v: 198 },
      { t: 'D-2', v: 192 }, { t: 'D-1', v: 185 }, { t: 'Hoy', v: 180 },
    ],
    unidad: 'bar', umbral: 195,
    historial: [
      { fecha: '2025-03-20', evento: 'Cambio de aceite hidráulico' },
      { fecha: '2025-06-15', evento: 'Alerta IA: caída progresiva de presión' },
    ],
  },
  {
    id: 4, activo: 'CMP-07', activoNombre: 'Compresor Atlas Copco GA22', sistema: 'Compresor',
    probabilidad: 54, diasRestantes: 25, causa: 'Vibración anormal — desbalanceo', critico: false,
    confianza: 72, modelo: 'FFT Vibration v2.0', tipoFalla: 'Falla de rodamiento / paro de línea',
    costoFalla: 15000000, costoPreventivo: 1100000,
    recomendacion: 'Balanceo dinámico del rotor y verificación de rodamientos. Análisis de vibración detallado.',
    evidencia: [
      'Vibración eje 8.2 mm/s RMS (ISO 10816 zona C, alarma en 7.1)',
      'Pico espectral a 1x RPM indica desbalanceo',
      'Temperatura de rodamiento +6°C sobre nominal',
    ],
    serie: [
      { t: 'D-5', v: 4.5 }, { t: 'D-4', v: 5.1 }, { t: 'D-3', v: 6.0 },
      { t: 'D-2', v: 6.8 }, { t: 'D-1', v: 7.6 }, { t: 'Hoy', v: 8.2 },
    ],
    unidad: 'mm/s', umbral: 7.1,
    historial: [
      { fecha: '2025-04-10', evento: 'Cambio de filtros y aceite' },
      { fecha: '2025-06-17', evento: 'Alerta IA: incremento de vibración' },
    ],
  },
  {
    id: 5, activo: 'VH-015', activoNombre: 'Tractocamión Volvo FH', sistema: 'Caja de cambios ZF',
    probabilidad: 43, diasRestantes: 31, causa: 'Temperatura en 4ta marcha elevada', critico: false,
    confianza: 68, modelo: 'Gradient Boosting v2.1', tipoFalla: 'Desgaste de sincronizadores',
    costoFalla: 22000000, costoPreventivo: 1900000,
    recomendacion: 'Cambio de aceite de transmisión y diagnóstico electrónico de la caja ZF.',
    evidencia: [
      'Temperatura aceite caja 125°C (nominal 95°C) en 4ta marcha',
      'Análisis de aceite: viscosidad degradada',
    ],
    serie: [
      { t: 'D-5', v: 98 }, { t: 'D-4', v: 104 }, { t: 'D-3', v: 110 },
      { t: 'D-2', v: 116 }, { t: 'D-1', v: 121 }, { t: 'Hoy', v: 125 },
    ],
    unidad: '°C', umbral: 105,
    historial: [
      { fecha: '2025-02-28', evento: 'PM Transmisión' },
      { fecha: '2025-06-16', evento: 'Alerta IA: temperatura elevada intermitente' },
    ],
  },
  {
    id: 6, activo: 'EV-001', activoNombre: 'Evaporador Cuarto Frío', sistema: 'Refrigeración',
    probabilidad: 38, diasRestantes: 45, causa: 'Acumulación progresiva de hielo', critico: false,
    confianza: 64, modelo: 'Random Forest v1.8', tipoFalla: 'Pérdida de eficiencia / cadena de frío',
    costoFalla: 35000000, costoPreventivo: 620000,
    recomendacion: 'Revisar ciclo de descongelamiento y sensor de temperatura. Limpieza del serpentín.',
    evidencia: [
      'Consumo eléctrico 18.4A (nominal 12.0A)',
      'Ciclo de deshielo se activa 40% menos de lo esperado',
    ],
    serie: [
      { t: 'D-5', v: 12.0 }, { t: 'D-4', v: 13.5 }, { t: 'D-3', v: 15.0 },
      { t: 'D-2', v: 16.2 }, { t: 'D-1', v: 17.5 }, { t: 'Hoy', v: 18.4 },
    ],
    unidad: 'A', umbral: 14.0,
    historial: [
      { fecha: '2025-05-01', evento: 'Limpieza de serpentín' },
      { fecha: '2025-06-20', evento: 'Alerta IA: consumo eléctrico creciente' },
    ],
  },
]

const VENTANAS: VentanaMantenimiento[] = [
  { id: 1, activo: 'VH-001 Tractocamión Kenworth', tipo: 'PM Motor', diaSugerido: 'Martes', turno: 'Nocturno 22:00', impactoSinPM: 'Riesgo falla en ruta Bogotá-Cali', ahorro: 28000000, duracion: '4h', tecnicoSugerido: 'Jorge Méndez', razon: 'Vehículo sin ruta programada martes; menor impacto operativo.', conflictoOperativo: 'Ninguno detectado', repuestosNecesarios: ['Filtro aceite CUMMINS', 'Aceite 15W-40', 'Termostato'] },
  { id: 2, activo: 'CMP-07 Compresor', tipo: 'Mantenimiento Predictivo', diaSugerido: 'Sábado', turno: 'Diurno 08:00', impactoSinPM: 'Paro de línea bodega 3', ahorro: 15000000, duracion: '3h', tecnicoSugerido: 'Luis Vargas', razon: 'Sábado con baja demanda de aire comprimido en planta.', conflictoOperativo: 'Requiere compresor de respaldo activo', repuestosNecesarios: ['Válvula presión KAESER'] },
  { id: 3, activo: 'MC-003 Montacargas', tipo: 'Servicio Hidráulico', diaSugerido: 'Miércoles', turno: 'Nocturno 00:00', impactoSinPM: 'Reducción capacidad carga 40%', ahorro: 9500000, duracion: '4h', tecnicoSugerido: 'Carlos Díaz', razon: 'Turno nocturno sin operación de bodega.', conflictoOperativo: 'Ninguno detectado', repuestosNecesarios: ['Aceite hidráulico ISO 46', 'Sello mecánico'] },
  { id: 4, activo: 'VH-015 Tractocamión Volvo', tipo: 'PM Transmisión', diaSugerido: 'Viernes', turno: 'Tarde 14:00', impactoSinPM: 'Bloqueo en ruta Barranquilla', ahorro: 22000000, duracion: '5h', tecnicoSugerido: 'Ana Rojas', razon: 'Retorno de ruta viernes mediodía, disponible en tarde.', conflictoOperativo: 'Ruta lunes debe reasignarse', repuestosNecesarios: ['Aceite transmisión ZF'] },
  { id: 5, activo: 'EV-001 Evaporador', tipo: 'Mantenimiento Frío', diaSugerido: 'Domingo', turno: 'Diurno 06:00', impactoSinPM: 'Pérdida cadena frío producto', ahorro: 35000000, duracion: '3h', tecnicoSugerido: 'Pedro Torres', razon: 'Domingo con cuarto frío en carga mínima.', conflictoOperativo: 'Trasladar producto crítico a cuarto 2', repuestosNecesarios: ['Filtro cabina EV-001'] },
]

const REPUESTOS_CRITICOS: RepuestoCritico[] = [
  { codigo: 'FIL-001', descripcion: 'Filtro aceite CUMMINS ISX15', cantidadActual: 2, cantidadSugerida: 8, costo: 185000, riesgo: 'ALTO', proveedor: 'Cummins Service Center', leadTime: '5 días', consumoMensual: 6, activosAfectados: ['VH-001', 'VH-002'], motivo: 'Consumo mensual (6) supera stock actual; PM de VH-001 inminente.' },
  { codigo: 'BAT-UPS', descripcion: 'Batería AGM 12V 100Ah', cantidadActual: 0, cantidadSugerida: 4, costo: 420000, riesgo: 'ALTO', proveedor: 'ElectrAuto Ltda.', leadTime: '7 días', consumoMensual: 2, activosAfectados: ['SRV-01'], motivo: 'Stock en cero y falla predicha de UPS en 3 días.' },
  { codigo: 'SEL-HID', descripcion: 'Sello mecánico sistema hidráulico', cantidadActual: 1, cantidadSugerida: 5, costo: 68000, riesgo: 'MEDIO', proveedor: 'HydroTech SAS', leadTime: '4 días', consumoMensual: 3, activosAfectados: ['MC-003', 'MC-004'], motivo: 'Servicio hidráulico programado para MC-003.' },
  { codigo: 'VAL-COM', descripcion: 'Válvula presión compresor KAESER', cantidadActual: 0, cantidadSugerida: 2, costo: 340000, riesgo: 'ALTO', proveedor: 'HydroTech SAS', leadTime: '12 días', consumoMensual: 1, activosAfectados: ['CMP-07'], motivo: 'Lead time alto y anomalía de vibración activa.' },
  { codigo: 'ACE-HID', descripcion: 'Aceite hidráulico ISO 46 (20L)', cantidadActual: 3, cantidadSugerida: 10, costo: 280000, riesgo: 'MEDIO', proveedor: 'HydroTech SAS', leadTime: '3 días', consumoMensual: 5, activosAfectados: ['MC-003', 'MC-004', 'ELV-02'], motivo: 'Varios servicios hidráulicos proyectados.' },
  { codigo: 'COR-DIV', descripcion: 'Correa distribución VH-015', cantidadActual: 1, cantidadSugerida: 3, costo: 195000, riesgo: 'MEDIO', proveedor: 'AutoTaller Express S.A.', leadTime: '6 días', consumoMensual: 1, activosAfectados: ['VH-015'], motivo: 'PM de transmisión próximo.' },
  { codigo: 'FIL-CAB', descripcion: 'Filtro cabina EV-001', cantidadActual: 0, cantidadSugerida: 6, costo: 45000, riesgo: 'BAJO', proveedor: 'Taller Interno Bogotá', leadTime: '2 días', consumoMensual: 4, activosAfectados: ['EV-001'], motivo: 'Reposición de stock de consumibles.' },
  { codigo: 'TER-MOT', descripcion: 'Termostato motor VH-001', cantidadActual: 0, cantidadSugerida: 2, costo: 125000, riesgo: 'ALTO', proveedor: 'Cummins Service Center', leadTime: '5 días', consumoMensual: 1, activosAfectados: ['VH-001'], motivo: 'Falla térmica predicha en VH-001.' },
]

const ANOMALIAS: Anomalia[] = [
  {
    id: 1, activo: 'VH-001', activoNombre: 'Tractocamión Kenworth T800', tipoAnomalia: 'Temperatura Motor',
    valorDetectado: '108°C', valorNormal: '90°C', desviacion: 20, severidad: 'CRITICA', fecha: '2025-06-20 06:42', estado: 'NUEVA',
    sensor: 'TS-MOTOR-01', metodo: 'Umbral dinámico + Z-score', unidad: '°C', umbral: 95,
    serie: [{ t: '02:00', v: 88 }, { t: '03:00', v: 91 }, { t: '04:00', v: 96 }, { t: '05:00', v: 101 }, { t: '06:00', v: 106 }, { t: '06:42', v: 108 }],
    interpretacion: 'Aumento sostenido de temperatura fuera del rango operativo. Correlaciona con predicción de desgaste de culata.',
    accionRecomendada: 'Detener operación de alta carga. Revisar refrigeración y generar OT correctiva de culata.',
  },
  {
    id: 2, activo: 'CMP-07', activoNombre: 'Compresor Atlas Copco GA22', tipoAnomalia: 'Vibración eje',
    valorDetectado: '8.2 mm/s', valorNormal: '4.5 mm/s', desviacion: 82, severidad: 'ALTA', fecha: '2025-06-20 07:15', estado: 'EN_REVISION',
    sensor: 'VIB-CMP-07', metodo: 'FFT espectral', unidad: 'mm/s', umbral: 7.1,
    serie: [{ t: 'D-4', v: 5.1 }, { t: 'D-3', v: 6.0 }, { t: 'D-2', v: 6.8 }, { t: 'D-1', v: 7.6 }, { t: 'Hoy', v: 8.2 }],
    interpretacion: 'Pico espectral a 1x RPM sugiere desbalanceo del rotor. Zona C de ISO 10816.',
    accionRecomendada: 'Programar balanceo dinámico y verificar estado de rodamientos.',
  },
  {
    id: 3, activo: 'MC-003', activoNombre: 'Montacargas Toyota 8FGCU25', tipoAnomalia: 'Presión hidráulica',
    valorDetectado: '180 bar', valorNormal: '210 bar', desviacion: -14, severidad: 'ALTA', fecha: '2025-06-20 08:00', estado: 'NUEVA',
    sensor: 'PRS-HID-03', metodo: 'Umbral estático', unidad: 'bar', umbral: 195,
    serie: [{ t: 'D-4', v: 205 }, { t: 'D-3', v: 198 }, { t: 'D-2', v: 192 }, { t: 'D-1', v: 185 }, { t: 'Hoy', v: 180 }],
    interpretacion: 'Caída progresiva de presión asociada a contaminación de aceite o desgaste de bomba.',
    accionRecomendada: 'Cambio de aceite hidráulico y filtro; inspeccionar sellos.',
  },
  {
    id: 4, activo: 'VH-015', activoNombre: 'Tractocamión Volvo FH', tipoAnomalia: 'Temperatura aceite',
    valorDetectado: '125°C', valorNormal: '95°C', desviacion: 32, severidad: 'ALTA', fecha: '2025-06-19 22:30', estado: 'EN_REVISION',
    sensor: 'TS-CAJA-15', metodo: 'Umbral dinámico', unidad: '°C', umbral: 105,
    serie: [{ t: 'D-4', v: 104 }, { t: 'D-3', v: 110 }, { t: 'D-2', v: 116 }, { t: 'D-1', v: 121 }, { t: 'Hoy', v: 125 }],
    interpretacion: 'Sobrecalentamiento del aceite de caja en 4ta marcha; posible desgaste de sincronizadores.',
    accionRecomendada: 'Cambio de aceite de transmisión y diagnóstico electrónico ZF.',
  },
  {
    id: 5, activo: 'SRV-01', activoNombre: 'Servidor Dell PowerEdge R740', tipoAnomalia: 'Tensión batería',
    valorDetectado: '10.8V', valorNormal: '13.2V', desviacion: -18, severidad: 'CRITICA', fecha: '2025-06-20 05:00', estado: 'NUEVA',
    sensor: 'BAT-UPS-01', metodo: 'LSTM + umbral', unidad: 'V', umbral: 11.5,
    serie: [{ t: 'D-4', v: 12.9 }, { t: 'D-3', v: 12.4 }, { t: 'D-2', v: 11.8 }, { t: 'D-1', v: 11.2 }, { t: 'Hoy', v: 10.8 }],
    interpretacion: 'Batería del UPS por debajo del umbral crítico. Riesgo de apagado no programado del servidor.',
    accionRecomendada: 'Reemplazo urgente del banco de baterías AGM en menos de 72h.',
  },
  {
    id: 6, activo: 'EV-001', activoNombre: 'Evaporador Cuarto Frío', tipoAnomalia: 'Consumo eléctrico',
    valorDetectado: '18.4A', valorNormal: '12.0A', desviacion: 53, severidad: 'MEDIA', fecha: '2025-06-20 09:10', estado: 'NUEVA',
    sensor: 'AMP-EV-01', metodo: 'Z-score', unidad: 'A', umbral: 14.0,
    serie: [{ t: 'D-4', v: 13.5 }, { t: 'D-3', v: 15.0 }, { t: 'D-2', v: 16.2 }, { t: 'D-1', v: 17.5 }, { t: 'Hoy', v: 18.4 }],
    interpretacion: 'Consumo eléctrico creciente por acumulación de hielo y ciclo de deshielo deficiente.',
    accionRecomendada: 'Revisar ciclo de descongelamiento y limpiar serpentín.',
  },
  {
    id: 7, activo: 'VH-003', activoNombre: 'Camioneta Ford Ranger', tipoAnomalia: 'Presión aceite',
    valorDetectado: '28 psi', valorNormal: '45 psi', desviacion: -38, severidad: 'ALTA', fecha: '2025-06-19 18:20', estado: 'RESUELTA',
    sensor: 'PRS-MOT-03', metodo: 'Umbral estático', unidad: 'psi', umbral: 35,
    serie: [{ t: 'D-4', v: 44 }, { t: 'D-3', v: 40 }, { t: 'D-2', v: 35 }, { t: 'D-1', v: 30 }, { t: 'Resuelto', v: 45 }],
    interpretacion: 'Baja presión de aceite corregida tras cambio de bomba y sensor.',
    accionRecomendada: 'Resuelto — OT-2026-0081 completada.',
  },
  {
    id: 8, activo: 'GRU-02', activoNombre: 'Grúa Puente Bodega 2', tipoAnomalia: 'Corriente motor',
    valorDetectado: '42A', valorNormal: '30A', desviacion: 40, severidad: 'MEDIA', fecha: '2025-06-20 10:05', estado: 'EN_REVISION',
    sensor: 'AMP-GRU-02', metodo: 'Z-score', unidad: 'A', umbral: 36,
    serie: [{ t: 'D-4', v: 31 }, { t: 'D-3', v: 34 }, { t: 'D-2', v: 37 }, { t: 'D-1', v: 40 }, { t: 'Hoy', v: 42 }],
    interpretacion: 'Sobreconsumo del motor de izaje; posible fricción mecánica o sobrecarga.',
    accionRecomendada: 'Inspeccionar reductor y lubricación del sistema de izaje.',
  },
]

const QUICK_PROMPTS = [
  '¿Cuál es el MTBF de la flota?',
  'Dime el estado del motor VH-001',
  '¿Qué activos están en riesgo esta semana?',
  'Resumir anomalías críticas del día',
]

const BOT_RESPONSES: Record<string, string> = {
  mtbf: `📊 MTBF de la Flota (últimos 6 meses):\n\n• Flota tracto-camiones: 312 horas (↑8% vs período anterior)\n• Montacargas: 480 horas (estable)\n• Compresores: 220 horas (↓12% — CMP-07 arrastra el promedio)\n• MTBF global fleet: 337 horas\n\nEl objetivo corporativo es ≥350 hrs. Acciones recomendadas: priorizar PM de CMP-07 y VH-001.`,
  vh001: `🔧 Estado actual VH-001 — Tractocamión Kenworth T800:\n\n• Kilometraje: 487,320 km\n• Último PM: 15/05/2025 (480,000 km)\n• Próximo PM: 510,000 km (estimado 22/07/2025)\n• ⚠️ Alerta activa: Temperatura motor 108°C (umbral 95°C)\n• Probabilidad de falla motor: 78% en 12 días\n• Acción sugerida: Generar OT preventiva urgente — revisión de culata.`,
  riesgo: `⚠️ Activos en riesgo esta semana:\n\n1. 🔴 SRV-01 UPS — 91% probabilidad falla en 3 días (batería crítica)\n2. 🔴 VH-001 Motor — 78% probabilidad falla en 12 días\n3. 🟠 MC-003 Sistema hidráulico — 65% probabilidad, 18 días\n4. 🟠 CMP-07 Compresor — vibración anormal, seguimiento requerido\n\n💡 Se recomienda generar OTs preventivas para SRV-01 y VH-001 de inmediato.`,
  anomal: `🚨 Anomalías críticas detectadas hoy (${new Date().toLocaleDateString('es-CO')}):\n\n• SRV-01 UPS: Tensión batería 10.8V (normal 13.2V) — CRÍTICA\n• VH-001: Temperatura motor 108°C (normal 90°C) — CRÍTICA\n• CMP-07: Vibración eje 8.2 mm/s (normal 4.5 mm/s) — ALTA\n• MC-003: Presión hidráulica baja 180 bar (normal 210 bar) — ALTA\n\nTotal anomalías activas: 7 (2 críticas, 4 altas, 1 media).`,
}

const getBotReply = (input: string): string => {
  const lower = input.toLowerCase()
  if (lower.includes('mtbf')) return BOT_RESPONSES.mtbf
  if (lower.includes('vh-001') || lower.includes('vh001')) return BOT_RESPONSES.vh001
  if (lower.includes('riesgo') || lower.includes('semana')) return BOT_RESPONSES.riesgo
  if (lower.includes('anomal') || lower.includes('críti') || lower.includes('criti')) return BOT_RESPONSES.anomal
  return `🤖 Procesando consulta: "${input}"\n\nEsta función de IA está en desarrollo. Por ahora puedes usar los prompts rápidos o consultar directamente los dashboards de predicción y anomalías.`
}

const probColor = (p: number) => p >= 70 ? '#EF4444' : p >= 40 ? '#EAB308' : EAM_COLOR
const sevColor = (s: string) => ({ CRITICA: '#EF4444', ALTA: '#F97316', MEDIA: '#EAB308', BAJA: EAM_COLOR })[s] ?? '#9CA3AF'
const riesgoColor = (r: string) => ({ ALTO: '#EF4444', MEDIO: '#F97316', BAJO: EAM_COLOR })[r] ?? '#9CA3AF'
const estadoAnomColor = (e: string) =>
  e === 'RESUELTA' ? EAM_COLOR : e === 'EN_REVISION' ? '#F59E0B' : '#EF4444'

// ─── Mini sparkline (SVG, sin dependencias) ─────────────────────────────────────
function Sparkline({ serie, umbral, color, unidad }: { serie: SensorPoint[]; umbral: number; color: string; unidad: string }) {
  const w = 460, h = 140, padX = 34, padY = 18
  const values = serie.map(s => s.v).concat([umbral])
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const x = (i: number) => padX + (i * (w - padX - 12)) / Math.max(serie.length - 1, 1)
  const y = (v: number) => padY + (1 - (v - min) / range) * (h - padY * 2)
  const linePath = serie.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.v)}`).join(' ')
  const areaPath = `${linePath} L ${x(serie.length - 1)} ${h - padY} L ${x(0)} ${h - padY} Z`
  const uy = y(umbral)
  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Umbral */}
        <line x1={padX} y1={uy} x2={w - 12} y2={uy} stroke="#EF4444" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
        <text x={w - 12} y={uy - 4} textAnchor="end" fontSize="9" fill="#EF4444">umbral {umbral}{unidad}</text>
        {/* Área + línea */}
        <path d={areaPath} fill="url(#spGrad)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {serie.map((s, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(s.v)} r="3.2" fill={color} />
            <text x={x(i)} y={h - 4} textAnchor="middle" fontSize="9" fill={TEXT_SECONDARY}>{s.t}</text>
          </g>
        ))}
        <text x={x(serie.length - 1)} y={y(serie[serie.length - 1].v) - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
          {serie[serie.length - 1].v}{unidad}
        </text>
      </svg>
    </Box>
  )
}

const KV = ({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) => (
  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25, border: `1px solid ${BORDER}` }}>
    <Typography fontSize={10} color={TEXT_SECONDARY} fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
    <Typography fontSize={13} fontWeight={700} color={color ?? TEXT_PRIMARY}>{value}</Typography>
  </Box>
)

export default function EAMIA() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [otGeneradas, setOtGeneradas] = useState<number[]>([])

  // Búsqueda / filtros predicción
  const [predSearch, setPredSearch] = useState('')
  const [predFiltro, setPredFiltro] = useState<'TODOS' | 'CRITICO' | 'ALTO' | 'MEDIO'>('TODOS')

  // Búsqueda / filtros anomalías
  const [anomSearch, setAnomSearch] = useState('')
  const [anomSev, setAnomSev] = useState('Todas')
  const [anomEstado, setAnomEstado] = useState('Todos')

  // Diálogos de detalle
  const [predSel, setPredSel] = useState<Prediccion | null>(null)
  const [anomSel, setAnomSel] = useState<Anomalia | null>(null)
  const [ventSel, setVentSel] = useState<VentanaMantenimiento | null>(null)
  const [repSel, setRepSel] = useState<RepuestoCritico | null>(null)

  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' }>({ open: false, msg: '', sev: 'success' })
  const showSnack = (msg: string, sev: 'success' | 'info' = 'success') => setSnack({ open: true, msg, sev })

  // Chat
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: 'bot', text: '¡Hola! Soy el Asistente Técnico de ICOLTRANS EAM. Puedo ayudarte con análisis predictivo, estado de activos, anomalías y más. ¿En qué puedo ayudarte?', ts: new Date() },
  ])
  const chatEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])

  const sendMsg = (text: string) => {
    if (!text.trim()) return
    const userMsg: ChatMsg = { role: 'user', text: text.trim(), ts: new Date() }
    setChatMsgs(prev => [...prev, userMsg])
    setChatInput('')
    setTimeout(() => {
      const botMsg: ChatMsg = { role: 'bot', text: getBotReply(text.trim()), ts: new Date() }
      setChatMsgs(prev => [...prev, botMsg])
    }, 600)
  }

  const crearOT = (activo: string) => {
    showSnack(`OT preventiva generada para ${activo}. Redirigiendo a Órdenes de Trabajo...`)
    const codigo = activo.split(' ')[0]
    setTimeout(() => navigate(`/eam/ordenes-trabajo?activo=${encodeURIComponent(codigo)}`), 1200)
  }

  // Predicciones filtradas
  const predsFiltradas = useMemo(() => PREDICCIONES.filter(p => {
    if (predFiltro === 'CRITICO' && !p.critico) return false
    if (predFiltro === 'ALTO' && p.probabilidad < 70) return false
    if (predFiltro === 'MEDIO' && (p.probabilidad >= 70 || p.probabilidad < 40)) return false
    if (predSearch) {
      const q = predSearch.toLowerCase()
      if (!p.activo.toLowerCase().includes(q) && !p.activoNombre.toLowerCase().includes(q) &&
        !p.sistema.toLowerCase().includes(q) && !p.causa.toLowerCase().includes(q)) return false
    }
    return true
  }), [predSearch, predFiltro])

  // Anomalías filtradas
  const anomFiltradas = useMemo(() => ANOMALIAS.filter(a => {
    if (anomSev !== 'Todas' && a.severidad !== anomSev) return false
    if (anomEstado !== 'Todos' && a.estado !== anomEstado) return false
    if (anomSearch) {
      const q = anomSearch.toLowerCase()
      if (!a.activo.toLowerCase().includes(q) && !a.activoNombre.toLowerCase().includes(q) &&
        !a.tipoAnomalia.toLowerCase().includes(q)) return false
    }
    return true
  }), [anomSearch, anomSev, anomEstado])

  const inputSx = {
    '& .MuiOutlinedInput-root': { color: TEXT_PRIMARY, bgcolor: CARD_BG },
    '& label': { color: TEXT_SECONDARY },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(AI_COLOR, 0.5) },
    '& .MuiSvgIcon-root': { color: TEXT_SECONDARY },
  }

  return (
    <>
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(AI_COLOR, 0.15), color: AI_COLOR }}>
            <AIIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color={TEXT_PRIMARY} letterSpacing="-0.5px">EAM — Inteligencia Artificial</Typography>
            <Typography variant="body2" color={TEXT_SECONDARY}>Motor predictivo, detección de anomalías y asistente técnico</Typography>
          </Box>
          <Box ml="auto">
            <Chip label="● IA Activa" size="small" sx={{ background: alpha(AI_COLOR, 0.12), color: AI_COLOR, fontWeight: 700 }} />
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: BORDER, mb: 3 }}>
          <Tabs value={tab} onChange={(_: SyntheticEvent, v: number) => setTab(v)} sx={{ '& .MuiTab-root': { color: TEXT_SECONDARY, textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: AI_COLOR }, '& .MuiTabs-indicator': { backgroundColor: AI_COLOR } }}>
            {['Predicción de Fallas', 'Optimización Mantenimiento', 'Anomalías', 'Asistente Técnico'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* Tab 0: Predicción de Fallas */}
        {tab === 0 && (
          <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={2} mb={3} flexWrap="wrap" useFlexGap>
              <Stack direction="row" alignItems="center" spacing={1}>
                <InsightsIcon sx={{ color: AI_COLOR }} />
                <Typography variant="h6" color={TEXT_PRIMARY} fontWeight={700}>Motor de Predicción de Fallas</Typography>
                <Chip label="Powered by AI" size="small" sx={{ background: alpha(AI_COLOR, 0.12), color: AI_COLOR, fontWeight: 600 }} />
              </Stack>
              <Stack direction="row" spacing={1} ml={{ md: 'auto' }} flexWrap="wrap" useFlexGap>
                <TextField
                  size="small" placeholder="Buscar activo, sistema o causa..."
                  value={predSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setPredSearch(e.target.value)}
                  sx={{ minWidth: 240, ...inputSx }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                />
                <TextField select size="small" label="Riesgo" value={predFiltro} onChange={(e: ChangeEvent<HTMLInputElement>) => setPredFiltro(e.target.value as typeof predFiltro)} sx={{ minWidth: 150, ...inputSx }}>
                  <MenuItem value="TODOS">Todos</MenuItem>
                  <MenuItem value="CRITICO">Solo críticos</MenuItem>
                  <MenuItem value="ALTO">Alto (≥70%)</MenuItem>
                  <MenuItem value="MEDIO">Medio (40-69%)</MenuItem>
                </TextField>
              </Stack>
            </Stack>
            <Grid container spacing={2}>
              {predsFiltradas.map(p => {
                const color = probColor(p.probabilidad)
                const otCreada = otGeneradas.includes(p.id)
                return (
                  <Grid key={p.id} size={{ xs: 12, md: 6 }}>
                    <Card
                      onClick={() => setPredSel(p)}
                      sx={{
                        background: CARD_BG, cursor: 'pointer', borderRadius: '14px',
                        border: `1px solid ${alpha(p.critico ? '#EF4444' : color, 0.35)}`,
                        ...(p.critico ? { boxShadow: `0 0 12px ${alpha('#EF4444', 0.15)}` } : {}),
                        transition: 'transform 0.12s, box-shadow 0.12s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0,0,0,0.10)', borderColor: color },
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="h6" fontWeight={800} color={TEXT_PRIMARY}>{p.activo}</Typography>
                              {p.critico && <Chip label="CRÍTICO" size="small" sx={{ background: alpha('#EF4444', 0.12), color: '#EF4444', fontWeight: 700, fontSize: 10 }} />}
                            </Stack>
                            <Typography variant="body2" color={TEXT_SECONDARY}>{p.sistema}</Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="h5" fontWeight={800} color={color}>{p.probabilidad}%</Typography>
                            <Typography variant="caption" color={TEXT_SECONDARY}>probabilidad</Typography>
                          </Box>
                        </Stack>

                        <Box mb={1.5}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color={TEXT_SECONDARY}>Probabilidad de falla</Typography>
                            <Typography variant="caption" color={color} fontWeight={700}>{p.probabilidad}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={p.probabilidad} sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 4 } }} />
                        </Box>

                        <Stack direction="row" spacing={2} mb={1.5}>
                          <Box>
                            <Typography variant="caption" color={TEXT_SECONDARY} display="block">⏱ Falla estimada</Typography>
                            <Typography variant="body2" fontWeight={700} color={color}>en {p.diasRestantes} día{p.diasRestantes !== 1 ? 's' : ''}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color={TEXT_SECONDARY} display="block">🎯 Confianza modelo</Typography>
                            <Typography variant="body2" fontWeight={700} color={AI_COLOR}>{p.confianza}%</Typography>
                          </Box>
                        </Stack>
                        <Typography variant="caption" color={TEXT_SECONDARY} display="block" mb={1.5}>
                          🔍 Causa: <span style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>{p.causa}</span>
                        </Typography>

                        <Stack direction="row" spacing={1}>
                          <Button
                            fullWidth size="small" variant="outlined" startIcon={<OpenIcon />}
                            onClick={(e: MouseEvent) => { e.stopPropagation(); setPredSel(p) }}
                            sx={{ textTransform: 'none', borderColor: alpha(AI_COLOR, 0.4), color: AI_COLOR, '&:hover': { borderColor: AI_COLOR, background: alpha(AI_COLOR, 0.08) } }}
                          >
                            Ver análisis
                          </Button>
                          <Button
                            fullWidth size="small"
                            variant={otCreada ? 'outlined' : 'contained'}
                            startIcon={<BuildIcon />}
                            onClick={(e: MouseEvent) => {
                              e.stopPropagation()
                              if (otCreada) return
                              setOtGeneradas(prev => [...prev, p.id])
                              showSnack(`OT preventiva generada para ${p.activo}`)
                            }}
                            disabled={otCreada}
                            sx={{ textTransform: 'none', bgcolor: otCreada ? 'transparent' : EAM_COLOR, borderColor: EAM_COLOR, color: otCreada ? EAM_COLOR : '#fff', '&:hover': { bgcolor: otCreada ? alpha(EAM_COLOR, 0.08) : EAM_DARK } }}
                          >
                            {otCreada ? '✓ OT Generada' : 'Generar OT'}
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
              {predsFiltradas.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography color={TEXT_SECONDARY} textAlign="center" py={6}>No hay predicciones que coincidan con los filtros.</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Tab 1: Optimización */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={3}>
              {/* KPIs ahorro */}
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={2}>
                  {[
                    { label: 'Ahorro Proyectado Anual', value: '$348M', icon: <TrendIcon />, color: EAM_COLOR },
                    { label: 'Reducción Correctivas', value: '65%', icon: <BuildIcon />, color: EAM_COLOR },
                    { label: 'Mejora Disponibilidad', value: '+12%', icon: <SpeedIcon />, color: AI_COLOR },
                  ].map((k, i) => (
                    <Grid key={i} size={{ xs: 12, md: 4 }}>
                      <Card sx={{ background: CARD_BG, borderRadius: '14px', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                        <CardContent>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(k.color, 0.12), color: k.color, display: 'flex' }}>{k.icon}</Box>
                            <Box>
                              <Typography variant="h5" fontWeight={800} color={TEXT_PRIMARY}>{k.value}</Typography>
                              <Typography variant="caption" color={TEXT_SECONDARY}>{k.label}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Ventanas óptimas */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ background: CARD_BG, borderRadius: '14px', border: `1px solid ${BORDER}` }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} color={TEXT_PRIMARY} mb={0.5}>Ventanas de Mantenimiento Óptimas</Typography>
                    <Typography variant="caption" color={TEXT_SECONDARY} mb={2} display="block">Clic en una fila para ver el plan sugerido por la IA</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { color: TEXT_SECONDARY, fontWeight: 700, borderBottom: `1px solid ${BORDER}` } }}>
                            <TableCell>Activo</TableCell>
                            <TableCell>Tipo PM</TableCell>
                            <TableCell>Día Sugerido</TableCell>
                            <TableCell>Turno</TableCell>
                            <TableCell align="right">Ahorro</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {VENTANAS.map(v => (
                            <TableRow key={v.id} onClick={() => setVentSel(v)} sx={{ cursor: 'pointer', '& td': { color: TEXT_PRIMARY, borderBottom: `1px solid ${BORDER}` }, '&:hover': { background: alpha(AI_COLOR, 0.05) } }}>
                              <TableCell><Typography variant="body2" fontWeight={600}>{v.activo}</Typography></TableCell>
                              <TableCell><Chip label={v.tipo} size="small" sx={{ background: alpha(AI_COLOR, 0.12), color: AI_COLOR, fontSize: 10 }} /></TableCell>
                              <TableCell><Typography variant="body2" fontWeight={600} color={EAM_COLOR}>{v.diaSugerido}</Typography></TableCell>
                              <TableCell><Typography variant="caption" color={TEXT_SECONDARY}>{v.turno}</Typography></TableCell>
                              <TableCell align="right"><Typography variant="body2" color={EAM_COLOR} fontWeight={700}>{fmt(v.ahorro)}</Typography></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Repuestos críticos */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ background: CARD_BG, borderRadius: '14px', border: `1px solid ${BORDER}` }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                      <StockIcon sx={{ color: EAM_COLOR, fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} color={TEXT_PRIMARY}>Repuestos Críticos a Stockear</Typography>
                    </Stack>
                    <Typography variant="caption" color={TEXT_SECONDARY} mb={2} display="block">Clic para ver justificación y solicitar compra</Typography>
                    <Stack spacing={1}>
                      {REPUESTOS_CRITICOS.map(r => (
                        <Box
                          key={r.codigo}
                          onClick={() => setRepSel(r)}
                          sx={{ p: 1.25, borderRadius: '10px', cursor: 'pointer', background: '#F8FAFC', border: `1px solid ${alpha(riesgoColor(r.riesgo), 0.25)}`, transition: 'background 0.12s', '&:hover': { background: alpha(riesgoColor(r.riesgo), 0.06) } }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box flex={1} minWidth={0}>
                              <Typography variant="caption" color={EAM_COLOR} fontFamily="monospace" fontWeight={700}>{r.codigo}</Typography>
                              <Typography variant="body2" color={TEXT_PRIMARY} noWrap sx={{ maxWidth: 180 }} title={r.descripcion}>{r.descripcion}</Typography>
                              <Typography variant="caption" color={TEXT_SECONDARY}>Stock: {r.cantidadActual} → <span style={{ color: EAM_COLOR, fontWeight: 700 }}>{r.cantidadSugerida}</span></Typography>
                            </Box>
                            <Stack alignItems="flex-end" spacing={0.5}>
                              <Chip label={r.riesgo} size="small" sx={{ background: alpha(riesgoColor(r.riesgo), 0.12), color: riesgoColor(r.riesgo), fontSize: 9, fontWeight: 700 }} />
                              <Typography variant="caption" color={TEXT_SECONDARY}>{fmt(r.costo)}/u</Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 2: Anomalías */}
        {tab === 2 && (
          <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} mb={2} spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TimelineIcon sx={{ color: AI_COLOR }} />
                <Typography variant="h6" color={TEXT_PRIMARY} fontWeight={700}>Detección de Anomalías</Typography>
                <Chip label="Tiempo Real" size="small" sx={{ background: alpha(EAM_COLOR, 0.12), color: EAM_COLOR, fontWeight: 600 }} />
              </Stack>
              <Stack direction="row" spacing={1}>
                {['CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map(s => (
                  <Chip key={s} label={`${s} ${ANOMALIAS.filter(a => a.severidad === s).length}`} size="small" sx={{ background: alpha(sevColor(s), 0.12), color: sevColor(s), fontWeight: 700, fontSize: 10 }} />
                ))}
              </Stack>
            </Stack>

            {/* Filtros */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small" placeholder="Buscar activo o tipo de anomalía..."
                value={anomSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setAnomSearch(e.target.value)}
                sx={{ minWidth: 260, flex: '1 1 260px', ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField select size="small" label="Severidad" value={anomSev} onChange={(e: ChangeEvent<HTMLInputElement>) => setAnomSev(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
                {['Todas', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Estado" value={anomEstado} onChange={(e: ChangeEvent<HTMLInputElement>) => setAnomEstado(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                {['Todos', 'NUEVA', 'EN_REVISION', 'RESUELTA'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Stack>

            {/* Timeline visual */}
            <Card sx={{ background: CARD_BG, borderRadius: '14px', border: `1px solid ${BORDER}`, mb: 2 }}>
              <CardContent>
                <Typography variant="caption" color={TEXT_SECONDARY} mb={1} display="block">Timeline de anomalías activas — clic para ver detalle</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {anomFiltradas.filter(a => a.estado !== 'RESUELTA').map(a => (
                    <Tooltip key={a.id} title={`${a.activoNombre}: ${a.tipoAnomalia}`}>
                      <Box onClick={() => setAnomSel(a)} sx={{ px: 1.5, py: 0.5, borderRadius: '8px', cursor: 'pointer', background: alpha(sevColor(a.severidad), 0.1), border: `1px solid ${alpha(sevColor(a.severidad), 0.4)}`, '&:hover': { background: alpha(sevColor(a.severidad), 0.18) } }}>
                        <Typography variant="caption" color={sevColor(a.severidad)} fontWeight={700}>{a.fecha.split(' ')[1]}</Typography>
                        <Typography variant="caption" color={TEXT_PRIMARY} display="block" fontWeight={600}>{a.activo}</Typography>
                      </Box>
                    </Tooltip>
                  ))}
                  {anomFiltradas.filter(a => a.estado !== 'RESUELTA').length === 0 && (
                    <Typography variant="caption" color={TEXT_SECONDARY}>Sin anomalías activas con los filtros seleccionados.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ background: CARD_BG, borderRadius: '14px', border: `1px solid ${BORDER}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: TEXT_SECONDARY, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, bgcolor: alpha(AI_COLOR, 0.04) } }}>
                    <TableCell>Activo</TableCell>
                    <TableCell>Tipo Anomalía</TableCell>
                    <TableCell align="center">Detectado</TableCell>
                    <TableCell align="center">Normal</TableCell>
                    <TableCell align="center">Desviación</TableCell>
                    <TableCell align="center">Severidad</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {anomFiltradas.map(a => (
                    <TableRow key={a.id} onClick={() => setAnomSel(a)} sx={{ cursor: 'pointer', '& td': { color: TEXT_PRIMARY, borderBottom: `1px solid ${BORDER}` }, '&:hover': { background: alpha(AI_COLOR, 0.05) } }}>
                      <TableCell><Typography variant="body2" fontWeight={700}>{a.activo}</Typography><Typography variant="caption" color={TEXT_SECONDARY}>{a.activoNombre}</Typography></TableCell>
                      <TableCell>{a.tipoAnomalia}</TableCell>
                      <TableCell align="center"><Typography variant="body2" fontWeight={700} color={sevColor(a.severidad)}>{a.valorDetectado}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color={TEXT_SECONDARY}>{a.valorNormal}</Typography></TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={700} color={Math.abs(a.desviacion) > 30 ? '#EF4444' : '#EAB308'}>
                          {a.desviacion > 0 ? '+' : ''}{a.desviacion}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={a.severidad} size="small" sx={{ background: alpha(sevColor(a.severidad), 0.12), color: sevColor(a.severidad), fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                      <TableCell><Typography variant="caption" color={TEXT_SECONDARY}>{a.fecha}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={a.estado.replace('_', ' ')} size="small" sx={{ background: alpha(estadoAnomColor(a.estado), 0.12), color: estadoAnomColor(a.estado), fontSize: 9, fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {anomFiltradas.length === 0 && (
                    <TableRow><TableCell colSpan={8}><Typography color={TEXT_SECONDARY} textAlign="center" py={4}>No hay anomalías que coincidan con los filtros.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 3: Asistente Técnico */}
        {tab === 3 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ background: CARD_BG, borderRadius: '14px', border: `1px solid ${alpha(AI_COLOR, 0.3)}`, height: 520, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ pb: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <BotIcon sx={{ color: AI_COLOR }} />
                    <Typography variant="subtitle1" fontWeight={700} color={TEXT_PRIMARY}>Asistente Técnico EAM</Typography>
                    <Chip label="Online" size="small" sx={{ background: alpha(EAM_COLOR, 0.12), color: EAM_COLOR, fontSize: 10 }} />
                  </Stack>
                </CardContent>
                <Divider sx={{ borderColor: BORDER, my: 1 }} />

                {/* Messages */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
                  {chatMsgs.map((m, i) => (
                    <Stack key={i} direction="row" spacing={1} mb={2} justifyContent={m.role === 'user' ? 'flex-end' : 'flex-start'} alignItems="flex-start">
                      {m.role === 'bot' && <Avatar sx={{ width: 28, height: 28, background: alpha(AI_COLOR, 0.15) }}><BotIcon sx={{ fontSize: 16, color: AI_COLOR }} /></Avatar>}
                      <Box sx={{ maxWidth: '80%', p: 1.5, borderRadius: 2, background: m.role === 'user' ? alpha(EAM_COLOR, 0.1) : alpha(AI_COLOR, 0.07), border: `1px solid ${m.role === 'user' ? alpha(EAM_COLOR, 0.3) : alpha(AI_COLOR, 0.2)}` }}>
                        <Typography variant="body2" color={TEXT_PRIMARY} sx={{ whiteSpace: 'pre-line' }}>{m.text}</Typography>
                        <Typography variant="caption" color="#94A3B8" display="block" mt={0.5}>{m.ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Typography>
                      </Box>
                      {m.role === 'user' && <Avatar sx={{ width: 28, height: 28, background: alpha(EAM_COLOR, 0.15) }}><PersonIcon sx={{ fontSize: 16, color: EAM_COLOR }} /></Avatar>}
                    </Stack>
                  ))}
                  <div ref={chatEndRef} />
                </Box>

                <Divider sx={{ borderColor: BORDER }} />
                <Box sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth size="small" placeholder="Escribe tu consulta técnica..." value={chatInput}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput) } }}
                      sx={inputSx}
                    />
                    <IconButton onClick={() => sendMsg(chatInput)} sx={{ background: alpha(AI_COLOR, 0.12), color: AI_COLOR, '&:hover': { background: alpha(AI_COLOR, 0.2) } }}>
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ background: CARD_BG, borderRadius: '14px', border: `1px solid ${BORDER}` }}>
                <CardContent>
                  <Typography variant="subtitle2" color={TEXT_SECONDARY} mb={2} fontWeight={700}>Consultas Rápidas</Typography>
                  <Stack spacing={1}>
                    {QUICK_PROMPTS.map((q, i) => (
                      <Button key={i} fullWidth variant="outlined" size="small" onClick={() => sendMsg(q)}
                        sx={{ textTransform: 'none', justifyContent: 'flex-start', borderColor: alpha(AI_COLOR, 0.3), color: TEXT_PRIMARY, fontSize: 12, py: 1, px: 1.5, '&:hover': { borderColor: AI_COLOR, background: alpha(AI_COLOR, 0.08) } }}>
                        {q}
                      </Button>
                    ))}
                  </Stack>
                  <Divider sx={{ borderColor: BORDER, my: 2 }} />
                  <Typography variant="subtitle2" color={TEXT_SECONDARY} mb={1.5} fontWeight={700}>Capacidades</Typography>
                  {['Análisis MTBF y confiabilidad', 'Estado de activos en tiempo real', 'Predicción de fallas con ML', 'Optimización de rutas de mantenimiento', 'Análisis costo-beneficio PM vs CM'].map((c, i) => (
                    <Stack key={i} direction="row" spacing={0.5} alignItems="center" mb={0.75}>
                      <CheckIcon sx={{ fontSize: 14, color: EAM_COLOR }} />
                      <Typography variant="caption" color={TEXT_SECONDARY}>{c}</Typography>
                    </Stack>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>

    {/* ── Dialog: detalle de PREDICCIÓN ── */}
    <Dialog open={!!predSel} onClose={() => setPredSel(null)} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(AI_COLOR, 0.3)}` } }}>
      {predSel && (() => {
        const color = probColor(predSel.probabilidad)
        const otCreada = otGeneradas.includes(predSel.id)
        return (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(AI_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <InsightsIcon sx={{ color: AI_COLOR }} />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontSize={15} fontWeight={800} color={TEXT_PRIMARY}>{predSel.activo}</Typography>
                    {predSel.critico && <Chip label="CRÍTICO" size="small" sx={{ background: alpha('#EF4444', 0.12), color: '#EF4444', fontWeight: 700, fontSize: 9 }} />}
                  </Stack>
                  <Typography fontSize={12} color={TEXT_SECONDARY}>{predSel.activoNombre} · {predSel.sistema}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setPredSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Stack spacing={2} mt={1}>
                {/* KPIs */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                  <KV label="Probabilidad" value={`${predSel.probabilidad}%`} color={color} />
                  <KV label="Falla estimada" value={`${predSel.diasRestantes} días`} color={color} />
                  <KV label="Confianza modelo" value={`${predSel.confianza}%`} color={AI_COLOR} />
                  <KV label="Modelo IA" value={predSel.modelo} />
                </Box>

                {/* Gráfico serie sensor */}
                <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px', p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <ChartIcon sx={{ fontSize: 18, color: AI_COLOR }} />
                    <Typography fontSize={13} fontWeight={700} color={TEXT_PRIMARY}>Tendencia del sensor ({predSel.unidad})</Typography>
                  </Stack>
                  <Sparkline serie={predSel.serie} umbral={predSel.umbral} color={color} unidad={predSel.unidad} />
                </Box>

                {/* Predicción + tipo de falla */}
                <Box sx={{ bgcolor: alpha('#EF4444', 0.05), border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', p: 1.5 }}>
                  <Typography fontSize={10} color="#EF4444" fontWeight={700} textTransform="uppercase" mb={0.5}>Predicción del modo de falla</Typography>
                  <Typography fontSize={13} fontWeight={700} color={TEXT_PRIMARY}>{predSel.tipoFalla}</Typography>
                  <Typography fontSize={12} color={TEXT_SECONDARY} mt={0.5}>Causa detectada: {predSel.causa}</Typography>
                </Box>

                {/* Evidencia */}
                <Box>
                  <Typography fontSize={13} fontWeight={700} color={TEXT_PRIMARY} mb={1}>Datos que sustentan la predicción</Typography>
                  <Stack spacing={0.75}>
                    {predSel.evidencia.map((e, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                        <ChartIcon sx={{ fontSize: 14, color: AI_COLOR, mt: '2px' }} />
                        <Typography fontSize={12} color={TEXT_SECONDARY}>{e}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>

                {/* Costo-beneficio */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                  <KV label="Costo falla (correctivo)" value={fmt(predSel.costoFalla)} color="#EF4444" />
                  <KV label="Costo preventivo" value={fmt(predSel.costoPreventivo)} color={EAM_COLOR} />
                  <KV label="Ahorro potencial" value={fmt(predSel.costoFalla - predSel.costoPreventivo)} color={EAM_COLOR} />
                </Box>

                {/* Acción recomendada */}
                <Box sx={{ bgcolor: alpha(EAM_COLOR, 0.06), border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '12px', p: 1.5 }}>
                  <Typography fontSize={10} color={EAM_DARK} fontWeight={700} textTransform="uppercase" mb={0.5}>Acción recomendada por la IA</Typography>
                  <Typography fontSize={13} color={TEXT_PRIMARY}>{predSel.recomendacion}</Typography>
                </Box>

                {/* Historial */}
                <Box>
                  <Typography fontSize={13} fontWeight={700} color={TEXT_PRIMARY} mb={1}>Historial del activo</Typography>
                  <Stack spacing={0.5}>
                    {predSel.historial.map((h, i) => (
                      <Stack key={i} direction="row" spacing={1.5} sx={{ py: 0.5, borderBottom: `1px solid ${BORDER}` }}>
                        <Typography fontSize={11} color={AI_COLOR} fontWeight={700} sx={{ minWidth: 90 }}>{h.fecha}</Typography>
                        <Typography fontSize={12} color={TEXT_SECONDARY}>{h.evento}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setPredSel(null)} sx={{ color: TEXT_SECONDARY, textTransform: 'none' }}>Cerrar</Button>
              <Button variant="outlined" startIcon={<BuildIcon />} disabled={otCreada}
                onClick={() => { setOtGeneradas(prev => [...prev, predSel.id]); showSnack(`OT preventiva generada para ${predSel.activo}`) }}
                sx={{ textTransform: 'none', borderColor: EAM_COLOR, color: EAM_COLOR, '&:hover': { background: alpha(EAM_COLOR, 0.08), borderColor: EAM_DARK } }}>
                {otCreada ? '✓ OT Generada' : 'Marcar OT generada'}
              </Button>
              <Button variant="contained" startIcon={<OpenIcon />}
                onClick={() => { setPredSel(null); crearOT(predSel.activo) }}
                sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
                Crear OT en módulo
              </Button>
            </DialogActions>
          </>
        )
      })()}
    </Dialog>

    {/* ── Dialog: detalle de ANOMALÍA ── */}
    <Dialog open={!!anomSel} onClose={() => setAnomSel(null)} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(AI_COLOR, 0.3)}` } }}>
      {anomSel && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(sevColor(anomSel.severidad), 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertIcon sx={{ color: sevColor(anomSel.severidad) }} />
              </Box>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontSize={15} fontWeight={800} color={TEXT_PRIMARY}>{anomSel.activo} · {anomSel.tipoAnomalia}</Typography>
                  <Chip label={anomSel.severidad} size="small" sx={{ background: alpha(sevColor(anomSel.severidad), 0.12), color: sevColor(anomSel.severidad), fontWeight: 700, fontSize: 9 }} />
                </Stack>
                <Typography fontSize={12} color={TEXT_SECONDARY}>{anomSel.activoNombre} · Sensor {anomSel.sensor}</Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setAnomSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0 }}>
            <Stack spacing={2} mt={1}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                <KV label="Valor detectado" value={anomSel.valorDetectado} color={sevColor(anomSel.severidad)} />
                <KV label="Valor normal" value={anomSel.valorNormal} />
                <KV label="Desviación" value={`${anomSel.desviacion > 0 ? '+' : ''}${anomSel.desviacion}%`} color={Math.abs(anomSel.desviacion) > 30 ? '#EF4444' : '#EAB308'} />
                <KV label="Estado" value={anomSel.estado.replace('_', ' ')} color={estadoAnomColor(anomSel.estado)} />
              </Box>

              <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px', p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <ChartIcon sx={{ fontSize: 18, color: sevColor(anomSel.severidad) }} />
                  <Typography fontSize={13} fontWeight={700} color={TEXT_PRIMARY}>Serie temporal del sensor ({anomSel.unidad})</Typography>
                </Stack>
                <Sparkline serie={anomSel.serie} umbral={anomSel.umbral} color={sevColor(anomSel.severidad)} unidad={anomSel.unidad} />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <KV label="Método de detección" value={anomSel.metodo} />
                <KV label="Fecha detección" value={anomSel.fecha} />
              </Box>

              <Box sx={{ bgcolor: alpha(AI_COLOR, 0.05), border: `1px solid ${alpha(AI_COLOR, 0.2)}`, borderRadius: '12px', p: 1.5 }}>
                <Typography fontSize={10} color={AI_COLOR} fontWeight={700} textTransform="uppercase" mb={0.5}>Interpretación de la IA</Typography>
                <Typography fontSize={13} color={TEXT_PRIMARY}>{anomSel.interpretacion}</Typography>
              </Box>

              <Box sx={{ bgcolor: alpha(EAM_COLOR, 0.06), border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '12px', p: 1.5 }}>
                <Typography fontSize={10} color={EAM_DARK} fontWeight={700} textTransform="uppercase" mb={0.5}>Acción recomendada</Typography>
                <Typography fontSize={13} color={TEXT_PRIMARY}>{anomSel.accionRecomendada}</Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAnomSel(null)} sx={{ color: TEXT_SECONDARY, textTransform: 'none' }}>Cerrar</Button>
            {anomSel.estado !== 'RESUELTA' && (
              <Button variant="outlined" onClick={() => { showSnack(`Anomalía de ${anomSel.activo} marcada en revisión`, 'info'); setAnomSel(null) }}
                sx={{ textTransform: 'none', borderColor: '#F59E0B', color: '#F59E0B', '&:hover': { background: alpha('#F59E0B', 0.08) } }}>
                Marcar en revisión
              </Button>
            )}
            <Button variant="contained" startIcon={<BuildIcon />}
              onClick={() => { setAnomSel(null); crearOT(anomSel.activo) }}
              sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              Crear OT correctiva
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>

    {/* ── Dialog: detalle de VENTANA ── */}
    <Dialog open={!!ventSel} onClose={() => setVentSel(null)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(AI_COLOR, 0.3)}` } }}>
      {ventSel && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BuildIcon sx={{ color: EAM_COLOR }} />
              </Box>
              <Box>
                <Typography fontSize={15} fontWeight={800} color={TEXT_PRIMARY}>{ventSel.activo}</Typography>
                <Typography fontSize={12} color={TEXT_SECONDARY}>{ventSel.tipo} · Ventana sugerida por IA</Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setVentSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0 }}>
            <Stack spacing={2} mt={1}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <KV label="Día sugerido" value={ventSel.diaSugerido} color={EAM_COLOR} />
                <KV label="Turno" value={ventSel.turno} />
                <KV label="Duración estimada" value={ventSel.duracion} />
                <KV label="Técnico sugerido" value={ventSel.tecnicoSugerido} />
                <KV label="Ahorro estimado" value={fmt(ventSel.ahorro)} color={EAM_COLOR} />
                <KV label="Conflicto operativo" value={ventSel.conflictoOperativo} color={ventSel.conflictoOperativo.includes('Ninguno') ? EAM_COLOR : '#F59E0B'} />
              </Box>
              <Box sx={{ bgcolor: alpha('#EF4444', 0.05), border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', p: 1.5 }}>
                <Typography fontSize={10} color="#EF4444" fontWeight={700} textTransform="uppercase" mb={0.5}>Impacto si no se ejecuta</Typography>
                <Typography fontSize={13} color={TEXT_PRIMARY}>{ventSel.impactoSinPM}</Typography>
              </Box>
              <Box sx={{ bgcolor: alpha(AI_COLOR, 0.05), border: `1px solid ${alpha(AI_COLOR, 0.2)}`, borderRadius: '12px', p: 1.5 }}>
                <Typography fontSize={10} color={AI_COLOR} fontWeight={700} textTransform="uppercase" mb={0.5}>Por qué esta ventana</Typography>
                <Typography fontSize={13} color={TEXT_PRIMARY}>{ventSel.razon}</Typography>
              </Box>
              <Box>
                <Typography fontSize={13} fontWeight={700} color={TEXT_PRIMARY} mb={1}>Repuestos necesarios</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {ventSel.repuestosNecesarios.map((r, i) => (
                    <Chip key={i} label={r} size="small" sx={{ background: alpha(EAM_COLOR, 0.1), color: EAM_DARK, fontWeight: 600 }} />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setVentSel(null)} sx={{ color: TEXT_SECONDARY, textTransform: 'none' }}>Cerrar</Button>
            <Button variant="outlined" onClick={() => { showSnack(`Ventana de ${ventSel.activo} agendada (${ventSel.diaSugerido} ${ventSel.turno})`); setVentSel(null) }}
              sx={{ textTransform: 'none', borderColor: AI_COLOR, color: AI_COLOR, '&:hover': { background: alpha(AI_COLOR, 0.08) } }}>
              Agendar ventana
            </Button>
            <Button variant="contained" startIcon={<BuildIcon />} onClick={() => { setVentSel(null); crearOT(ventSel.activo) }}
              sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              Crear OT
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>

    {/* ── Dialog: detalle de REPUESTO CRÍTICO ── */}
    <Dialog open={!!repSel} onClose={() => setRepSel(null)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(EAM_COLOR, 0.3)}` } }}>
      {repSel && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(riesgoColor(repSel.riesgo), 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StockIcon sx={{ color: riesgoColor(repSel.riesgo) }} />
              </Box>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontSize={15} fontWeight={800} color={EAM_COLOR} fontFamily="monospace">{repSel.codigo}</Typography>
                  <Chip label={`Riesgo ${repSel.riesgo}`} size="small" sx={{ background: alpha(riesgoColor(repSel.riesgo), 0.12), color: riesgoColor(repSel.riesgo), fontWeight: 700, fontSize: 9 }} />
                </Stack>
                <Typography fontSize={12} color={TEXT_SECONDARY}>{repSel.descripcion}</Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setRepSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0 }}>
            <Stack spacing={2} mt={1}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                <KV label="Stock actual" value={repSel.cantidadActual} color={repSel.cantidadActual === 0 ? '#EF4444' : TEXT_PRIMARY} />
                <KV label="Stock sugerido" value={repSel.cantidadSugerida} color={EAM_COLOR} />
                <KV label="A comprar" value={Math.max(repSel.cantidadSugerida - repSel.cantidadActual, 0)} color={AI_COLOR} />
                <KV label="Costo unitario" value={fmt(repSel.costo)} />
                <KV label="Consumo mensual" value={`${repSel.consumoMensual} u/mes`} />
                <KV label="Lead time" value={repSel.leadTime} />
              </Box>
              <KV label="Proveedor" value={repSel.proveedor} />
              <Box>
                <Typography fontSize={13} fontWeight={700} color={TEXT_PRIMARY} mb={1}>Activos afectados</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {repSel.activosAfectados.map((a, i) => (
                    <Chip key={i} label={a} size="small" sx={{ background: alpha(AI_COLOR, 0.1), color: AI_COLOR, fontWeight: 600 }} />
                  ))}
                </Stack>
              </Box>
              <Box sx={{ bgcolor: alpha(AI_COLOR, 0.05), border: `1px solid ${alpha(AI_COLOR, 0.2)}`, borderRadius: '12px', p: 1.5 }}>
                <Typography fontSize={10} color={AI_COLOR} fontWeight={700} textTransform="uppercase" mb={0.5}>Justificación de la IA</Typography>
                <Typography fontSize={13} color={TEXT_PRIMARY}>{repSel.motivo}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: '12px', p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontSize={12} color={TEXT_SECONDARY}>Inversión total de reposición</Typography>
                  <Typography fontSize={18} fontWeight={900} color={EAM_COLOR}>
                    {fmt(Math.max(repSel.cantidadSugerida - repSel.cantidadActual, 0) * repSel.costo)}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRepSel(null)} sx={{ color: TEXT_SECONDARY, textTransform: 'none' }}>Cerrar</Button>
            <Button variant="contained" startIcon={<CartIcon />}
              onClick={() => { showSnack(`Solicitud de compra generada para ${repSel.codigo} (${Math.max(repSel.cantidadSugerida - repSel.cantidadActual, 0)} u)`); setRepSel(null) }}
              sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              Solicitar compra
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>

    {/* ── Snackbar global ── */}
    <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}
        sx={{ ...(snack.sev === 'success' ? { bgcolor: EAM_COLOR } : {}) }}>
        {snack.msg}
      </Alert>
    </Snackbar>
    </>
  )
}
