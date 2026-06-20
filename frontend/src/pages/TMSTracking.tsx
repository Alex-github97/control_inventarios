import React, { useState, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  LinearProgress,
  Divider,
  Paper,
  Avatar,
  alpha,
  Grid,
} from '@mui/material'
import {
  Search,
  LocalShipping,
  PersonPin,
  GpsFixed,
  Schedule,
  ArrowForward,
  FiberManualRecord,
  DirectionsBus,
  PlayArrow,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  RadioButtonUnchecked,
  LocationOn,
  Speed,
  MyLocation,
  Route,
  Map as MapIcon,
  TripOrigin,
  Flag,
  NavigateNext,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

const TMS_COLOR = '#0369A1'

// ─── Types ───────────────────────────────────────────────────────────────────

type EstadoViaje = 'NORMAL' | 'DEMORADO' | 'CRITICO'
type TipoEvento = 'SALIDA' | 'LLEGADA' | 'INCIDENTE' | 'GPS'
type EstadoParada = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'

interface Parada {
  secuencia: number
  ciudad: string
  estado: EstadoParada
  horaEstimada: string
  horaReal: string | null
}

interface EventoTracking {
  id: number
  timestamp: string
  tipo: TipoEvento
  descripcion: string
  lat: number
  lng: number
}

interface ViajeTracking {
  codigo: string
  conductor: string
  placa: string
  origen: string
  destino: string
  estado: EstadoViaje
  porcentaje: number
  etaEstimada: string
  ultimaActualizacion: string
  velocidadActual: number
  ciudadActual: string
  latActual: number
  lngActual: number
  paradas: Parada[]
  eventos: EventoTracking[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_VIAJES: ViajeTracking[] = [
  {
    codigo: 'VJ-2025-0841',
    conductor: 'Carlos Andrés Herrera',
    placa: 'SDT-492',
    origen: 'Bogotá',
    destino: 'Barranquilla',
    estado: 'NORMAL',
    porcentaje: 62,
    etaEstimada: '18:30',
    ultimaActualizacion: 'hace 3 min',
    velocidadActual: 78,
    ciudadActual: 'Bucaramanga',
    latActual: 7.1198,
    lngActual: -73.1227,
    paradas: [
      { secuencia: 1, ciudad: 'Bogotá', estado: 'COMPLETADA', horaEstimada: '06:00', horaReal: '06:05' },
      { secuencia: 2, ciudad: 'Tunja', estado: 'COMPLETADA', horaEstimada: '08:00', horaReal: '07:58' },
      { secuencia: 3, ciudad: 'Bucaramanga', estado: 'EN_CURSO', horaEstimada: '12:00', horaReal: null },
      { secuencia: 4, ciudad: 'Barranquilla', estado: 'PENDIENTE', horaEstimada: '18:30', horaReal: null },
    ],
    eventos: [
      { id: 1, timestamp: '06:05', tipo: 'SALIDA', descripcion: 'Vehículo salió del centro de distribución Bogotá', lat: 4.7110, lng: -74.0721 },
      { id: 2, timestamp: '07:15', tipo: 'GPS', descripcion: 'Actualización de posición automática — ruta normal', lat: 5.0710, lng: -73.9500 },
      { id: 3, timestamp: '07:58', tipo: 'LLEGADA', descripcion: 'Llegada a punto de control Tunja', lat: 5.5353, lng: -73.3578 },
      { id: 4, timestamp: '08:12', tipo: 'SALIDA', descripcion: 'Salida de Tunja con dirección a Bucaramanga', lat: 5.5353, lng: -73.3578 },
      { id: 5, timestamp: '10:45', tipo: 'GPS', descripcion: 'Parada en estación de combustible — 18 min', lat: 6.2442, lng: -75.5812 },
      { id: 6, timestamp: '12:10', tipo: 'LLEGADA', descripcion: 'Ingreso a Bucaramanga, cargando mercancía adicional', lat: 7.1198, lng: -73.1227 },
    ],
  },
  {
    codigo: 'VJ-2025-0842',
    conductor: 'María Fernanda López',
    placa: 'TXB-117',
    origen: 'Medellín',
    destino: 'Cali',
    estado: 'DEMORADO',
    porcentaje: 45,
    etaEstimada: '20:15',
    ultimaActualizacion: 'hace 8 min',
    velocidadActual: 52,
    ciudadActual: 'Manizales',
    latActual: 5.0703,
    lngActual: -75.5138,
    paradas: [
      { secuencia: 1, ciudad: 'Medellín', estado: 'COMPLETADA', horaEstimada: '07:00', horaReal: '07:22' },
      { secuencia: 2, ciudad: 'Manizales', estado: 'EN_CURSO', horaEstimada: '10:30', horaReal: '11:05' },
      { secuencia: 3, ciudad: 'Armenia', estado: 'PENDIENTE', horaEstimada: '13:00', horaReal: null },
      { secuencia: 4, ciudad: 'Cali', estado: 'PENDIENTE', horaEstimada: '16:00', horaReal: null },
    ],
    eventos: [
      { id: 1, timestamp: '07:22', tipo: 'SALIDA', descripcion: 'Salida tardía de Medellín por congestión vehicular', lat: 6.2442, lng: -75.5812 },
      { id: 2, timestamp: '08:30', tipo: 'INCIDENTE', descripcion: 'Cierre vial temporal en autopista Medellín–Bogotá, desvío activado', lat: 5.8500, lng: -75.0000 },
      { id: 3, timestamp: '09:15', tipo: 'GPS', descripcion: 'Actualización de posición — velocidad reducida por pendiente', lat: 5.4000, lng: -75.3000 },
      { id: 4, timestamp: '11:05', tipo: 'LLEGADA', descripcion: 'Llegada a Manizales con 35 min de retraso acumulado', lat: 5.0703, lng: -75.5138 },
      { id: 5, timestamp: '11:40', tipo: 'GPS', descripcion: 'Conductor reporta condiciones de neblina — velocidad reducida', lat: 5.0703, lng: -75.5138 },
    ],
  },
  {
    codigo: 'VJ-2025-0843',
    conductor: 'Jhon Stiven Ríos',
    placa: 'VGH-853',
    origen: 'Cali',
    destino: 'Bogotá',
    estado: 'CRITICO',
    porcentaje: 28,
    etaEstimada: '22:00',
    ultimaActualizacion: 'hace 22 min',
    velocidadActual: 0,
    ciudadActual: 'Ibagué',
    latActual: 4.4389,
    lngActual: -75.2322,
    paradas: [
      { secuencia: 1, ciudad: 'Cali', estado: 'COMPLETADA', horaEstimada: '05:00', horaReal: '05:10' },
      { secuencia: 2, ciudad: 'Ibagué', estado: 'EN_CURSO', horaEstimada: '09:30', horaReal: '11:15' },
      { secuencia: 3, ciudad: 'Bogotá', estado: 'PENDIENTE', horaEstimada: '14:00', horaReal: null },
    ],
    eventos: [
      { id: 1, timestamp: '05:10', tipo: 'SALIDA', descripcion: 'Salida de Cali con carga completa', lat: 3.4516, lng: -76.5320 },
      { id: 2, timestamp: '07:20', tipo: 'GPS', descripcion: 'Actualización de posición — ruta normal', lat: 4.0000, lng: -75.8000 },
      { id: 3, timestamp: '09:05', tipo: 'INCIDENTE', descripcion: 'ALERTA: Pinchazo de llanta trasera derecha — vehículo detenido', lat: 4.2500, lng: -75.4000 },
      { id: 4, timestamp: '09:40', tipo: 'INCIDENTE', descripcion: 'Conductor solicita apoyo mecánico — ETA grúa 60 min', lat: 4.2500, lng: -75.4000 },
      { id: 5, timestamp: '11:15', tipo: 'LLEGADA', descripcion: 'Ingreso a Ibagué para reparación en taller autorizado', lat: 4.4389, lng: -75.2322 },
      { id: 6, timestamp: '11:38', tipo: 'GPS', descripcion: 'Sin movimiento detectado — vehículo en taller', lat: 4.4389, lng: -75.2322 },
    ],
  },
  {
    codigo: 'VJ-2025-0844',
    conductor: 'Luz Adriana Moreno',
    placa: 'PLM-201',
    origen: 'Bogotá',
    destino: 'Cartagena',
    estado: 'NORMAL',
    porcentaje: 15,
    etaEstimada: '07:00 (mañana)',
    ultimaActualizacion: 'hace 1 min',
    velocidadActual: 90,
    ciudadActual: 'Tunja',
    latActual: 5.5353,
    lngActual: -73.3578,
    paradas: [
      { secuencia: 1, ciudad: 'Bogotá', estado: 'COMPLETADA', horaEstimada: '04:00', horaReal: '04:00' },
      { secuencia: 2, ciudad: 'Tunja', estado: 'EN_CURSO', horaEstimada: '06:00', horaReal: '05:58' },
      { secuencia: 3, ciudad: 'Bucaramanga', estado: 'PENDIENTE', horaEstimada: '12:00', horaReal: null },
      { secuencia: 4, ciudad: 'Valledupar', estado: 'PENDIENTE', horaEstimada: '18:00', horaReal: null },
      { secuencia: 5, ciudad: 'Cartagena', estado: 'PENDIENTE', horaEstimada: '07:00', horaReal: null },
    ],
    eventos: [
      { id: 1, timestamp: '04:00', tipo: 'SALIDA', descripcion: 'Salida puntual de Bogotá — carga consolidada', lat: 4.7110, lng: -74.0721 },
      { id: 2, timestamp: '05:00', tipo: 'GPS', descripcion: 'Actualización de posición automática — velocidad óptima', lat: 5.2000, lng: -73.7000 },
      { id: 3, timestamp: '05:58', tipo: 'LLEGADA', descripcion: 'Llegada anticipada a Tunja — adelantado 2 min', lat: 5.5353, lng: -73.3578 },
    ],
  },
  {
    codigo: 'VJ-2025-0845',
    conductor: 'Andrés Felipe Castro',
    placa: 'RTQ-664',
    origen: 'Barranquilla',
    destino: 'Medellín',
    estado: 'NORMAL',
    porcentaje: 78,
    etaEstimada: '16:45',
    ultimaActualizacion: 'hace 5 min',
    velocidadActual: 85,
    ciudadActual: 'Caucasia',
    latActual: 7.9874,
    lngActual: -75.1948,
    paradas: [
      { secuencia: 1, ciudad: 'Barranquilla', estado: 'COMPLETADA', horaEstimada: '06:00', horaReal: '06:00' },
      { secuencia: 2, ciudad: 'Montería', estado: 'COMPLETADA', horaEstimada: '09:00', horaReal: '09:10' },
      { secuencia: 3, ciudad: 'Caucasia', estado: 'EN_CURSO', horaEstimada: '12:00', horaReal: '11:55' },
      { secuencia: 4, ciudad: 'Medellín', estado: 'PENDIENTE', horaEstimada: '16:45', horaReal: null },
    ],
    eventos: [
      { id: 1, timestamp: '06:00', tipo: 'SALIDA', descripcion: 'Salida de terminal Barranquilla — carga refrigerada', lat: 10.9685, lng: -74.7813 },
      { id: 2, timestamp: '08:00', tipo: 'GPS', descripcion: 'Actualización automática — sin novedades', lat: 9.5000, lng: -75.0000 },
      { id: 3, timestamp: '09:10', tipo: 'LLEGADA', descripcion: 'Llegada a Montería para verificación de temperatura', lat: 8.7479, lng: -75.8814 },
      { id: 4, timestamp: '09:35', tipo: 'SALIDA', descripcion: 'Salida de Montería — temperatura de carga correcta 4°C', lat: 8.7479, lng: -75.8814 },
      { id: 5, timestamp: '11:55', tipo: 'LLEGADA', descripcion: 'Llegada a Caucasia — parada de combustible programada', lat: 7.9874, lng: -75.1948 },
    ],
  },
  {
    codigo: 'VJ-2025-0846',
    conductor: 'Ricardo León Suárez',
    placa: 'GKP-385',
    origen: 'Bucaramanga',
    destino: 'Cali',
    estado: 'DEMORADO',
    porcentaje: 55,
    etaEstimada: '19:30',
    ultimaActualizacion: 'hace 11 min',
    velocidadActual: 61,
    ciudadActual: 'Honda',
    latActual: 5.2047,
    lngActual: -74.7418,
    paradas: [
      { secuencia: 1, ciudad: 'Bucaramanga', estado: 'COMPLETADA', horaEstimada: '05:00', horaReal: '05:15' },
      { secuencia: 2, ciudad: 'Bogotá', estado: 'COMPLETADA', horaEstimada: '09:30', horaReal: '10:20' },
      { secuencia: 3, ciudad: 'Honda', estado: 'EN_CURSO', horaEstimada: '12:00', horaReal: '13:10' },
      { secuencia: 4, ciudad: 'Ibagué', estado: 'PENDIENTE', horaEstimada: '14:30', horaReal: null },
      { secuencia: 5, ciudad: 'Cali', estado: 'PENDIENTE', horaEstimada: '18:00', horaReal: null },
    ],
    eventos: [
      { id: 1, timestamp: '05:15', tipo: 'SALIDA', descripcion: 'Salida de Bucaramanga con 15 min de retraso', lat: 7.1198, lng: -73.1227 },
      { id: 2, timestamp: '08:30', tipo: 'INCIDENTE', descripcion: 'Congestión en entrada a Bogotá — desvío por variante', lat: 6.0000, lng: -74.0000 },
      { id: 3, timestamp: '10:20', tipo: 'LLEGADA', descripcion: 'Llegada a Bogotá con 50 min de retraso acumulado', lat: 4.7110, lng: -74.0721 },
      { id: 4, timestamp: '10:55', tipo: 'SALIDA', descripcion: 'Salida de Bogotá con nueva ruta estimada', lat: 4.7110, lng: -74.0721 },
      { id: 5, timestamp: '13:10', tipo: 'LLEGADA', descripcion: 'Llegada a Honda — pausa obligatoria del conductor', lat: 5.2047, lng: -74.7418 },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoConfig(estado: EstadoViaje) {
  switch (estado) {
    case 'NORMAL':
      return { label: 'NORMAL', color: '#16a34a', bg: alpha('#16a34a', 0.12) }
    case 'DEMORADO':
      return { label: 'DEMORADO', color: '#d97706', bg: alpha('#d97706', 0.12) }
    case 'CRITICO':
      return { label: 'CRÍTICO', color: '#dc2626', bg: alpha('#dc2626', 0.12) }
  }
}

function eventoConfig(tipo: TipoEvento) {
  switch (tipo) {
    case 'SALIDA':
      return { color: TMS_COLOR, bg: alpha(TMS_COLOR, 0.14), icon: <PlayArrow sx={{ fontSize: 14 }} /> }
    case 'LLEGADA':
      return { color: '#16a34a', bg: alpha('#16a34a', 0.14), icon: <CheckCircle sx={{ fontSize: 14 }} /> }
    case 'INCIDENTE':
      return { color: '#dc2626', bg: alpha('#dc2626', 0.14), icon: <ErrorIcon sx={{ fontSize: 14 }} /> }
    case 'GPS':
      return { color: '#6b7280', bg: alpha('#6b7280', 0.14), icon: <GpsFixed sx={{ fontSize: 14 }} /> }
  }
}

function paradaConfig(estado: EstadoParada) {
  switch (estado) {
    case 'PENDIENTE':
      return { color: '#6b7280', icon: <RadioButtonUnchecked sx={{ fontSize: 18 }} /> }
    case 'EN_CURSO':
      return { color: '#d97706', icon: <FiberManualRecord sx={{ fontSize: 18, color: '#d97706' }} /> }
    case 'COMPLETADA':
      return { color: '#16a34a', icon: <CheckCircle sx={{ fontSize: 18, color: '#16a34a' }} /> }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BlinkingDot({ color }: { color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: color,
        mr: 0.7,
        flexShrink: 0,
        animation: 'blink 1.4s ease-in-out infinite',
        '@keyframes blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.2 },
        },
      }}
    />
  )
}

function TripCard({ viaje, selected, onClick }: { viaje: ViajeTracking; selected: boolean; onClick: () => void }) {
  const est = estadoConfig(viaje.estado)
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 2,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: selected ? TMS_COLOR : alpha('#fff', 0.06),
        bgcolor: selected ? alpha(TMS_COLOR, 0.10) : alpha('#fff', 0.03),
        transition: 'all 0.18s',
        '&:hover': { borderColor: alpha(TMS_COLOR, 0.5), bgcolor: alpha(TMS_COLOR, 0.06) },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.8}>
        <Chip
          label={viaje.codigo}
          size="small"
          sx={{ bgcolor: alpha(TMS_COLOR, 0.18), color: '#60a5fa', fontWeight: 700, fontSize: 11, height: 22 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BlinkingDot color={est.color} />
          <Typography variant="caption" sx={{ color: est.color, fontWeight: 600, fontSize: 10 }}>
            {est.label}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.4}>
        <PersonPin sx={{ fontSize: 13, color: '#9ca3af' }} />
        <Typography variant="caption" sx={{ color: '#d1d5db', fontSize: 11 }}>
          {viaje.conductor}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.8}>
        <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12 }}>
          {viaje.origen}
        </Typography>
        <ArrowForward sx={{ fontSize: 12, color: '#6b7280' }} />
        <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12 }}>
          {viaje.destino}
        </Typography>
      </Stack>

      <Box mb={0.6}>
        <Stack direction="row" justifyContent="space-between" mb={0.3}>
          <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: 10 }}>
            Progreso estimado
          </Typography>
          <Typography variant="caption" sx={{ color: '#d1d5db', fontWeight: 700, fontSize: 10 }}>
            {viaje.porcentaje}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={viaje.porcentaje}
          sx={{
            height: 5,
            borderRadius: 3,
            bgcolor: alpha('#fff', 0.08),
            '& .MuiLinearProgress-bar': { bgcolor: est.color, borderRadius: 3 },
          }}
        />
      </Box>

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Schedule sx={{ fontSize: 12, color: '#9ca3af' }} />
        <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: 10 }}>
          ETA: <strong style={{ color: '#e2e8f0' }}>{viaje.etaEstimada}</strong>
        </Typography>
      </Stack>
    </Box>
  )
}

function EmptyDetail() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2,
        color: '#6b7280',
      }}
    >
      <MapIcon sx={{ fontSize: 72, color: alpha(TMS_COLOR, 0.25) }} />
      <Typography variant="h6" sx={{ color: '#4b5563', fontWeight: 500 }}>
        Selecciona un viaje para ver el tracking
      </Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', maxWidth: 300 }}>
        Haz clic en cualquier viaje de la lista para visualizar su posición actual, eventos y paradas programadas.
      </Typography>
    </Box>
  )
}

function MapSimulation({ viaje }: { viaje: ViajeTracking }) {
  const pct = viaje.porcentaje
  return (
    <Box
      sx={{
        bgcolor: '#1a2744',
        borderRadius: 2,
        p: 2.5,
        height: 300,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: alpha('#60a5fa', 0.2),
      }}
    >
      {/* Grid lines background */}
      <Box
        sx={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'linear-gradient(#60a5fa 1px, transparent 1px), linear-gradient(90deg, #60a5fa 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Info cards */}
      <Stack direction="row" spacing={1.5} mb={2} sx={{ position: 'relative', zIndex: 1 }}>
        {[
          { icon: <MyLocation sx={{ fontSize: 14 }} />, label: 'Posición', value: `${viaje.latActual.toFixed(4)}, ${viaje.lngActual.toFixed(4)}` },
          { icon: <Speed sx={{ fontSize: 14 }} />, label: 'Velocidad', value: viaje.velocidadActual === 0 ? 'Detenido' : `${viaje.velocidadActual} km/h` },
          { icon: <LocationOn sx={{ fontSize: 14 }} />, label: 'Ciudad actual', value: viaje.ciudadActual },
        ].map((item, i) => (
          <Box
            key={i}
            sx={{
              flex: 1, bgcolor: alpha('#0f1e3c', 0.85), borderRadius: 1.5, px: 1.5, py: 1,
              border: '1px solid', borderColor: alpha('#60a5fa', 0.18),
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5} mb={0.3} sx={{ color: '#60a5fa' }}>
              {item.icon}
              <Typography variant="caption" sx={{ fontSize: 10, color: '#60a5fa' }}>{item.label}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: 11 }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Route line */}
      <Box sx={{ position: 'relative', zIndex: 1, px: 1, mt: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="caption" sx={{ color: '#93c5fd', fontSize: 11, fontWeight: 600 }}>
            {viaje.origen}
          </Typography>
          <Typography variant="caption" sx={{ color: '#93c5fd', fontSize: 11, fontWeight: 600 }}>
            {viaje.destino}
          </Typography>
        </Stack>

        <Box sx={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
          {/* Background track */}
          <Box sx={{ position: 'absolute', left: 0, right: 0, height: 3, bgcolor: alpha('#fff', 0.12), borderRadius: 2 }} />
          {/* Completed segment */}
          <Box
            sx={{
              position: 'absolute', left: 0, height: 3, borderRadius: 2,
              width: `${pct}%`, bgcolor: alpha(TMS_COLOR, 0.8),
              transition: 'width 0.5s ease',
            }}
          />
          {/* Origin dot */}
          <Box
            sx={{
              position: 'absolute', left: 0, width: 12, height: 12, borderRadius: '50%',
              bgcolor: '#16a34a', border: '2px solid #fff', transform: 'translateX(-50%)',
            }}
          />
          {/* Vehicle icon */}
          <Box
            sx={{
              position: 'absolute', left: `${pct}%`, transform: 'translate(-50%, -50%)',
              top: '50%', zIndex: 2,
            }}
          >
            <Box
              sx={{
                bgcolor: TMS_COLOR, borderRadius: 1, p: 0.4, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff', boxShadow: `0 0 8px ${alpha(TMS_COLOR, 0.8)}`,
              }}
            >
              <LocalShipping sx={{ fontSize: 12, color: '#fff' }} />
            </Box>
          </Box>
          {/* Destination dot */}
          <Box
            sx={{
              position: 'absolute', right: 0, width: 12, height: 12, borderRadius: '50%',
              bgcolor: '#6b7280', border: '2px solid #fff', transform: 'translateX(50%)',
            }}
          />
        </Box>

        <Stack direction="row" justifyContent="space-between" mt={0.5}>
          <Typography variant="caption" sx={{ color: '#4b5563', fontSize: 10 }}>Inicio</Typography>
          <Typography variant="caption" sx={{ color: '#60a5fa', fontSize: 10, fontWeight: 600 }}>
            {pct}% completado
          </Typography>
          <Typography variant="caption" sx={{ color: '#4b5563', fontSize: 10 }}>Destino</Typography>
        </Stack>
      </Box>

      {/* Disclaimer */}
      <Box
        sx={{
          position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center',
          px: 2, zIndex: 1,
        }}
      >
        <Typography variant="caption" sx={{ color: alpha('#9ca3af', 0.6), fontSize: 9, fontStyle: 'italic' }}>
          Mapa en tiempo real disponible con integración GPS · Última actualización: {viaje.ultimaActualizacion}
        </Typography>
      </Box>
    </Box>
  )
}

function EventTimeline({ eventos }: { eventos: EventoTracking[] }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 700, mb: 1.5, fontSize: 13 }}>
        Línea de Eventos
      </Typography>
      <Stack spacing={0}>
        {eventos.map((ev, idx) => {
          const cfg = eventoConfig(ev.tipo)
          const isLast = idx === eventos.length - 1
          return (
            <Box key={ev.id} sx={{ display: 'flex', gap: 1.5 }}>
              {/* Connector */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <Avatar
                  sx={{
                    width: 28, height: 28, bgcolor: cfg.bg,
                    color: cfg.color, border: `1.5px solid ${alpha(cfg.color, 0.4)}`,
                  }}
                >
                  {cfg.icon}
                </Avatar>
                {!isLast && (
                  <Box sx={{ width: 1.5, flexGrow: 1, bgcolor: alpha('#fff', 0.07), my: 0.3 }} />
                )}
              </Box>
              {/* Content */}
              <Box sx={{ pb: isLast ? 0 : 1.5, pt: 0.2, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Chip
                    label={ev.tipo}
                    size="small"
                    sx={{
                      bgcolor: cfg.bg, color: cfg.color, fontWeight: 700,
                      fontSize: 9, height: 18, border: `1px solid ${alpha(cfg.color, 0.3)}`,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: 10 }}>
                    {ev.timestamp}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#d1d5db', fontSize: 12, mt: 0.3, lineHeight: 1.4 }}>
                  {ev.descripcion}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: 10 }}>
                  {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

function TripStops({ paradas }: { paradas: Parada[] }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 700, mb: 1.5, fontSize: 13 }}>
        Paradas del Viaje
      </Typography>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {paradas.map((p) => {
          const cfg = paradaConfig(p.estado)
          return (
            <Box
              key={p.secuencia}
              sx={{
                flex: '1 1 140px',
                minWidth: 130,
                bgcolor: alpha('#fff', 0.04),
                border: '1px solid',
                borderColor: alpha(cfg.color, 0.3),
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.8} mb={0.5}>
                <Box sx={{ color: cfg.color, lineHeight: 1 }}>{cfg.icon}</Box>
                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>
                  {p.ciudad}
                </Typography>
              </Stack>
              <Chip
                label={p.estado.replace('_', ' ')}
                size="small"
                sx={{
                  bgcolor: alpha(cfg.color, 0.12), color: cfg.color,
                  fontWeight: 600, fontSize: 9, height: 18, mb: 0.8,
                }}
              />
              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: 10, display: 'block' }}>
                Est.: {p.horaEstimada}
              </Typography>
              {p.horaReal && (
                <Typography variant="caption" sx={{ color: p.estado === 'COMPLETADA' ? '#16a34a' : '#d97706', fontSize: 10, display: 'block' }}>
                  Real: {p.horaReal}
                </Typography>
              )}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

function TripDetail({ viaje }: { viaje: ViajeTracking }) {
  const est = estadoConfig(viaje.estado)
  return (
    <Stack spacing={2.5} sx={{ height: '100%', overflowY: 'auto', pr: 0.5 }}>
      {/* Header */}
      <Box>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Chip
                label={viaje.codigo}
                sx={{ bgcolor: alpha(TMS_COLOR, 0.2), color: '#60a5fa', fontWeight: 700, fontSize: 13, height: 28 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1.2, py: 0.4, borderRadius: 5, bgcolor: est.bg }}>
                <BlinkingDot color={est.color} />
                <Typography variant="caption" sx={{ color: est.color, fontWeight: 700, fontSize: 11 }}>
                  {est.label}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
                {viaje.origen}
              </Typography>
              <ArrowForward sx={{ color: '#60a5fa' }} />
              <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
                {viaje.destino}
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: 10 }}>Última actualización</Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: 12 }}>{viaje.ultimaActualizacion}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {[
            { icon: <PersonPin sx={{ fontSize: 14 }} />, label: 'Conductor', value: viaje.conductor },
            { icon: <DirectionsBus sx={{ fontSize: 14 }} />, label: 'Placa', value: viaje.placa },
            { icon: <Schedule sx={{ fontSize: 14 }} />, label: 'ETA', value: viaje.etaEstimada },
          ].map((item, i) => (
            <Stack key={i} direction="row" alignItems="center" spacing={0.5}
              sx={{ bgcolor: alpha('#fff', 0.04), borderRadius: 1.5, px: 1.5, py: 0.8 }}>
              <Box sx={{ color: '#6b7280' }}>{item.icon}</Box>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: 11 }}>{item.label}:</Typography>
              <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: 11 }}>{item.value}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <MapSimulation viaje={viaje} />
      <EventTimeline eventos={viaje.eventos} />
      <Divider sx={{ borderColor: alpha('#fff', 0.06) }} />
      <TripStops paradas={viaje.paradas} />
    </Stack>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TMSTracking() {
  const [search, setSearch] = useState('')
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return MOCK_VIAJES
    return MOCK_VIAJES.filter(
      (v) =>
        v.codigo.toLowerCase().includes(q) ||
        v.conductor.toLowerCase().includes(q) ||
        v.origen.toLowerCase().includes(q) ||
        v.destino.toLowerCase().includes(q)
    )
  }, [search])

  const selectedViaje = useMemo(
    () => MOCK_VIAJES.find((v) => v.codigo === selectedCodigo) ?? null,
    [selectedCodigo]
  )

  return (
    <Layout>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0b1120', p: 0 }}>
        {/* Page Header */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: alpha('#fff', 0.06) }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.3}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2, bgcolor: alpha(TMS_COLOR, 0.2),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Route sx={{ color: TMS_COLOR, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700, lineHeight: 1.2 }}>
                Tracking en Tiempo Real
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: 11 }}>
                {MOCK_VIAJES.length} viajes en tránsito · TMS — Módulo de Seguimiento
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel */}
          <Box
            sx={{
              width: '35%',
              minWidth: 280,
              maxWidth: 400,
              borderRight: '1px solid',
              borderColor: alpha('#fff', 0.06),
              display: 'flex',
              flexDirection: 'column',
              bgcolor: alpha('#fff', 0.01),
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: alpha('#fff', 0.06) }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por código o conductor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 16, color: '#6b7280' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: alpha('#fff', 0.04),
                    color: '#e2e8f0',
                    fontSize: 13,
                    '& fieldset': { borderColor: alpha('#fff', 0.1) },
                    '&:hover fieldset': { borderColor: alpha(TMS_COLOR, 0.4) },
                    '&.Mui-focused fieldset': { borderColor: TMS_COLOR },
                  },
                }}
                inputProps={{ style: { color: '#e2e8f0' } }}
              />
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
              <Stack spacing={1}>
                {filtered.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', mt: 4 }}>
                    No se encontraron viajes
                  </Typography>
                ) : (
                  filtered.map((v) => (
                    <TripCard
                      key={v.codigo}
                      viaje={v}
                      selected={selectedCodigo === v.codigo}
                      onClick={() => setSelectedCodigo(v.codigo)}
                    />
                  ))
                )}
              </Stack>
            </Box>
          </Box>

          {/* Right Panel */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 3,
              bgcolor: '#0b1120',
            }}
          >
            {selectedViaje ? <TripDetail viaje={selectedViaje} /> : <EmptyDetail />}
          </Box>
        </Box>
      </Box>
    </Layout>
  )
}
