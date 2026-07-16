import React, { useState, useMemo } from 'react'
import {
  Box, Paper, Typography, Stack, Chip, Button, Tab, Tabs,
  MenuItem, TextField, alpha, InputAdornment, LinearProgress, Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  DirectionsCar as VehiculoIcon,
  PrecisionManufacturing as MontacargasIcon,
  Business as InfraIcon,
  Memory as EquipoIcon,
  ExpandMore as ExpandIcon,
  ChevronRight as CollapseIcon,
  Handyman as OTIcon,
  Description as DocIcon,
  Build as ComponenteIcon,
  Search as SearchIcon,
  ArrowBack as BackIcon,
  Speed as MetricIcon,
  CalendarMonth as CalendarIcon,
  Place as PlaceIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { VehiculosCombinados } from '@/components/VehiculosCombinados'

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoActivo = 'Vehículo' | 'Montacargas' | 'Infraestructura' | 'Equipo'
type EstadoActivo = 'OPERATIVO' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO'
type Criticidad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'

interface Activo {
  id: number
  codigo: string
  nombre: string
  tipo: TipoActivo
  estado: EstadoActivo
  criticidad: Criticidad
  ubicacion: string
  odometro: string          // valor de medidor a mostrar en tabla
  ultimoPM: string
  // Ficha técnica / hoja de vida
  marca: string
  modelo: string
  anio: number
  serie: string
  adquisicion: string       // fecha de adquisición
  valorCompra: number
  responsable: string
  proximoPM: string
  // Métricas de confiabilidad
  disponibilidad: number    // %
  mtbf: string
  mttr: string
  costoAcumulado: number
}

interface OTHistorial {
  numero: string
  tipo: string
  descripcion: string
  fecha: string
  costo: number
  estado: string
}

interface Componente {
  nombre: string
  estado: 'BUENO' | 'REGULAR' | 'CRITICO'
}

interface DocItem {
  label: string
  color: string
}

interface TreeNode {
  id: string
  label: string
  codigo?: string
  children?: TreeNode[]
}

// ─── Static data ─────────────────────────────────────────────────────────────

const ACTIVOS_MOCK: Activo[] = [
  { id:  1, codigo: 'VH-001', nombre: 'Tractocamión Kenworth T800',   tipo: 'Vehículo',        estado: 'OPERATIVO',         criticidad: 'CRITICA', ubicacion: 'Bogotá DC',     odometro: '124,500 km', ultimoPM: '22 días', marca: 'Kenworth',    modelo: 'T800',         anio: 2019, serie: '1XKDD40X5KJ256781', adquisicion: '2019-03-12', valorCompra: 420000000, responsable: 'Jorge Méndez',  proximoPM: 'en 8 días',  disponibilidad: 96.1, mtbf: '412 hrs', mttr: '3.8 hrs', costoAcumulado: 28400000 },
  { id:  2, codigo: 'VH-002', nombre: 'Camión Freightliner M2-106',   tipo: 'Vehículo',        estado: 'EN_MANTENIMIENTO',  criticidad: 'ALTA',    ubicacion: 'Medellín',      odometro: '98,320 km',  ultimoPM: '8 días',  marca: 'Freightliner', modelo: 'M2-106',      anio: 2020, serie: '3ALACWDT8LDLM4512', adquisicion: '2020-06-01', valorCompra: 310000000, responsable: 'Carlos Díaz',   proximoPM: 'vencido 2 días', disponibilidad: 88.4, mtbf: '298 hrs', mttr: '5.2 hrs', costoAcumulado: 19750000 },
  { id:  3, codigo: 'VH-003', nombre: 'Camioneta Ford Ranger',        tipo: 'Vehículo',        estado: 'OPERATIVO',         criticidad: 'BAJA',    ubicacion: 'Cali',          odometro: '45,100 km',  ultimoPM: '15 días', marca: 'Ford',         modelo: 'Ranger XLT',  anio: 2021, serie: '8AFAR22P9M6512340', adquisicion: '2021-09-20', valorCompra: 145000000, responsable: 'Ana Rojas',     proximoPM: 'en 20 días', disponibilidad: 98.7, mtbf: '640 hrs', mttr: '2.1 hrs', costoAcumulado: 6400000 },
  { id:  4, codigo: 'MC-001', nombre: 'Montacargas Yale GLP050',      tipo: 'Montacargas',     estado: 'OPERATIVO',         criticidad: 'ALTA',    ubicacion: 'Bodega Bogotá', odometro: '8,230 hrs',  ultimoPM: '30 días', marca: 'Yale',         modelo: 'GLP050VX',    anio: 2018, serie: 'E177V02510P',       adquisicion: '2018-02-15', valorCompra: 98000000,  responsable: 'Luis Vargas',   proximoPM: 'en 12 días', disponibilidad: 94.0, mtbf: '355 hrs', mttr: '4.0 hrs', costoAcumulado: 15200000 },
  { id:  5, codigo: 'MC-003', nombre: 'Montacargas Toyota 8FGCU25',   tipo: 'Montacargas',     estado: 'EN_MANTENIMIENTO',  criticidad: 'ALTA',    ubicacion: 'Bodega Cali',   odometro: '6,540 hrs',  ultimoPM: '45 días', marca: 'Toyota',       modelo: '8FGCU25',     anio: 2017, serie: '8FGCU25-70012',     adquisicion: '2017-11-03', valorCompra: 92000000,  responsable: 'Pedro Torres',  proximoPM: 'vencido 15 días', disponibilidad: 82.5, mtbf: '210 hrs', mttr: '6.5 hrs', costoAcumulado: 21800000 },
  { id:  6, codigo: 'MC-004', nombre: 'Reach Truck Crown RR5200',     tipo: 'Montacargas',     estado: 'FUERA_DE_SERVICIO', criticidad: 'MEDIA',   ubicacion: 'Bodega Bogotá', odometro: '4,100 hrs',  ultimoPM: '60 días', marca: 'Crown',        modelo: 'RR5220-45',   anio: 2016, serie: 'RR5220-1A234567',   adquisicion: '2016-07-19', valorCompra: 110000000, responsable: 'Luis Vargas',   proximoPM: 'suspendido', disponibilidad: 61.0, mtbf: '150 hrs', mttr: '9.0 hrs', costoAcumulado: 27300000 },
  { id:  7, codigo: 'BD-01',  nombre: 'Bodega Principal Bogotá',      tipo: 'Infraestructura', estado: 'OPERATIVO',         criticidad: 'ALTA',    ubicacion: 'Bogotá DC',     odometro: '—',          ultimoPM: '90 días', marca: 'ICOLTRANS',    modelo: 'Nave 4.200 m²', anio: 2012, serie: 'PRED-BTA-04',     adquisicion: '2012-01-10', valorCompra: 4800000000, responsable: 'Marco Vargas', proximoPM: 'en 5 días',  disponibilidad: 99.2, mtbf: '—',       mttr: '8.0 hrs', costoAcumulado: 42000000 },
  { id:  8, codigo: 'CF-001', nombre: 'Cuarto Frío #1',               tipo: 'Infraestructura', estado: 'OPERATIVO',         criticidad: 'CRITICA', ubicacion: 'Bogotá DC',     odometro: '—',          ultimoPM: '15 días', marca: 'Bohn',         modelo: 'BHT-2200',    anio: 2019, serie: 'BHT2200-CF01',      adquisicion: '2019-05-22', valorCompra: 680000000, responsable: 'Marco Vargas',  proximoPM: 'en 10 días', disponibilidad: 97.8, mtbf: '520 hrs', mttr: '4.5 hrs', costoAcumulado: 18900000 },
  { id:  9, codigo: 'BD-02',  nombre: 'Plataforma Medellín',          tipo: 'Infraestructura', estado: 'OPERATIVO',         criticidad: 'MEDIA',   ubicacion: 'Medellín',      odometro: '—',          ultimoPM: '45 días', marca: 'ICOLTRANS',    modelo: 'Cross-dock 1.800 m²', anio: 2015, serie: 'PRED-MDE-02', adquisicion: '2015-08-30', valorCompra: 2100000000, responsable: 'Diana Castro', proximoPM: 'en 30 días', disponibilidad: 98.5, mtbf: '—',       mttr: '6.0 hrs', costoAcumulado: 12400000 },
  { id: 10, codigo: 'CMP-07', nombre: 'Compresor Atlas Copco GA22',   tipo: 'Equipo',          estado: 'EN_MANTENIMIENTO',  criticidad: 'ALTA',    ubicacion: 'Bogotá DC',     odometro: '12,400 hrs', ultimoPM: '5 días',  marca: 'Atlas Copco',  modelo: 'GA22',        anio: 2018, serie: 'API-GA22-778901',   adquisicion: '2018-04-11', valorCompra: 74000000,  responsable: 'Luis Herrera',  proximoPM: 'en 3 días',  disponibilidad: 90.3, mtbf: '380 hrs', mttr: '4.2 hrs', costoAcumulado: 9800000 },
  { id: 11, codigo: 'SRV-01', nombre: 'Servidor Dell PowerEdge R740', tipo: 'Equipo',          estado: 'OPERATIVO',         criticidad: 'CRITICA', ubicacion: 'Data Center',   odometro: '—',          ultimoPM: '35 días', marca: 'Dell',         modelo: 'PowerEdge R740', anio: 2021, serie: 'DPE-R740-CN0X4', adquisicion: '2021-02-18', valorCompra: 56000000, responsable: 'Ana Rojas',     proximoPM: 'en 25 días', disponibilidad: 99.9, mtbf: '8760 hrs', mttr: '1.5 hrs', costoAcumulado: 3200000 },
  { id: 12, codigo: 'ELV-02', nombre: 'Estibador Eléctrico Still EXU', tipo: 'Equipo',         estado: 'OPERATIVO',         criticidad: 'BAJA',    ubicacion: 'Bodega Cali',   odometro: '2,850 hrs',  ultimoPM: '12 días', marca: 'Still',        modelo: 'EXU-18',      anio: 2022, serie: 'STILL-EXU18-4412', adquisicion: '2022-03-05', valorCompra: 38000000,  responsable: 'Pedro Torres',  proximoPM: 'en 18 días', disponibilidad: 97.1, mtbf: '460 hrs', mttr: '2.8 hrs', costoAcumulado: 2100000 },
]

// ─── Contenido derivado por activo (hoja de vida) ──────────────────────────────

const COMPONENTES_POR_TIPO: Record<TipoActivo, string[]> = {
  'Vehículo':        ['Motor', 'Caja de velocidades', 'Sistema de frenos', 'Dirección hidráulica', 'Suspensión', 'Sistema eléctrico'],
  'Montacargas':     ['Mástil', 'Sistema hidráulico', 'Motor / Batería', 'Horquillas', 'Transmisión'],
  'Infraestructura': ['Estructura', 'Sistema eléctrico', 'Refrigeración / Clima', 'Sistema contra incendios'],
  'Equipo':          ['Unidad principal', 'Motor eléctrico', 'Sistema de control', 'Refrigeración'],
}

const ESTADOS_COMP: Componente['estado'][] = ['BUENO', 'REGULAR', 'CRITICO']

function componentesDe(a: Activo): Componente[] {
  const nombres = COMPONENTES_POR_TIPO[a.tipo]
  const sesgo = a.estado === 'FUERA_DE_SERVICIO' ? 2 : a.estado === 'EN_MANTENIMIENTO' ? 1 : 0
  return nombres.map((nombre, i) => {
    // Estado determinístico según posición + estado global del activo
    const idx = Math.min(2, (i + sesgo + a.id) % 3 === 0 ? 2 - sesgo : (i + a.id) % 3)
    const estado = sesgo === 2 && i === 0 ? 'CRITICO' : ESTADOS_COMP[Math.max(0, Math.min(2, idx))]
    return { nombre, estado }
  })
}

const OTS_POR_TIPO: Record<TipoActivo, { tipo: string; desc: string; costo: number }[]> = {
  'Vehículo': [
    { tipo: 'PREVENTIVA', desc: 'Cambio de aceite y filtros', costo: 850000 },
    { tipo: 'CORRECTIVA', desc: 'Reparación sistema de frenos', costo: 2400000 },
    { tipo: 'PREVENTIVA', desc: 'Revisión mayor programada', costo: 1200000 },
    { tipo: 'PREDICTIVA', desc: 'Análisis de vibraciones', costo: 320000 },
    { tipo: 'CORRECTIVA', desc: 'Cambio de neumático posterior', costo: 780000 },
  ],
  'Montacargas': [
    { tipo: 'PREVENTIVA', desc: 'Inspección de mástil y cadenas', costo: 480000 },
    { tipo: 'CORRECTIVA', desc: 'Reparación de fuga hidráulica', costo: 1650000 },
    { tipo: 'PREVENTIVA', desc: 'Mantenimiento de batería', costo: 520000 },
    { tipo: 'PREDICTIVA', desc: 'Termografía de motor', costo: 280000 },
    { tipo: 'CORRECTIVA', desc: 'Cambio de horquillas', costo: 920000 },
  ],
  'Infraestructura': [
    { tipo: 'PREVENTIVA', desc: 'Mantenimiento sistema eléctrico', costo: 1400000 },
    { tipo: 'CORRECTIVA', desc: 'Reparación de compresor de frío', costo: 3200000 },
    { tipo: 'PREVENTIVA', desc: 'Inspección estructural anual', costo: 2100000 },
    { tipo: 'PREDICTIVA', desc: 'Medición de consumo energético', costo: 650000 },
    { tipo: 'PREVENTIVA', desc: 'Recarga de extintores', costo: 380000 },
  ],
  'Equipo': [
    { tipo: 'PREVENTIVA', desc: 'Cambio de filtros y sellos', costo: 620000 },
    { tipo: 'CORRECTIVA', desc: 'Reemplazo de válvulas', costo: 1240000 },
    { tipo: 'PREDICTIVA', desc: 'Análisis de aceite', costo: 290000 },
    { tipo: 'PREVENTIVA', desc: 'Calibración y ajuste', costo: 450000 },
    { tipo: 'CORRECTIVA', desc: 'Reparación de motor eléctrico', costo: 1800000 },
  ],
}

function historialDe(a: Activo): OTHistorial[] {
  const pool = OTS_POR_TIPO[a.tipo]
  const fechas = ['15/01/2025', '28/11/2024', '10/10/2024', '05/09/2024', '12/08/2024']
  return pool.map((p, i) => ({
    numero: `OT-2024-${String(900 - a.id * 7 - i).padStart(4, '0')}`,
    tipo: p.tipo,
    descripcion: p.desc,
    fecha: fechas[i],
    costo: p.costo,
    estado: 'COMPLETADA',
  }))
}

function documentosDe(a: Activo): DocItem[] {
  if (a.tipo === 'Vehículo') {
    return [
      { label: 'SOAT vigente', color: '#16A34A' },
      { label: a.criticidad === 'CRITICA' ? 'Tecno-mecánica vence 15 días' : 'Tecno-mecánica vigente', color: a.criticidad === 'CRITICA' ? '#F59E0B' : '#16A34A' },
      { label: 'Tarjeta de propiedad', color: '#3B82F6' },
      { label: 'Póliza todo riesgo', color: '#7C3AED' },
    ]
  }
  if (a.tipo === 'Montacargas') {
    return [
      { label: 'Certificado de operación', color: '#16A34A' },
      { label: 'Póliza de responsabilidad', color: '#7C3AED' },
      { label: 'Manual del fabricante', color: '#3B82F6' },
    ]
  }
  if (a.tipo === 'Infraestructura') {
    return [
      { label: 'Certificado RETIE', color: '#16A34A' },
      { label: 'Póliza de inmueble', color: '#7C3AED' },
      { label: 'Plan de mantenimiento', color: '#3B82F6' },
    ]
  }
  return [
    { label: 'Garantía de fabricante', color: '#16A34A' },
    { label: 'Manual técnico', color: '#3B82F6' },
    { label: 'Póliza de equipo', color: '#7C3AED' },
  ]
}

const TREE_DATA: TreeNode[] = [
  {
    id: 'node-cd-bta', label: 'Centro de Distribución Bogotá',
    children: [
      {
        id: 'node-cf1', label: 'Cuarto Frío #1', codigo: 'CF-001',
        children: [
          { id: 'node-cf001', label: 'Compresor CMP-07', codigo: 'CMP-07' },
        ],
      },
      { id: 'node-mc001', label: 'Montacargas MC-001', codigo: 'MC-001' },
      { id: 'node-bodega', label: 'Bodega Principal', codigo: 'BD-01' },
      { id: 'node-srv', label: 'Servidor SRV-01', codigo: 'SRV-01' },
    ],
  },
  {
    id: 'node-flota', label: 'Flota Vehicular',
    children: [
      { id: 'node-vh001', label: 'Tractocamión VH-001', codigo: 'VH-001' },
      { id: 'node-vh002', label: 'Camión VH-002', codigo: 'VH-002' },
      { id: 'node-vh003', label: 'Camioneta VH-003', codigo: 'VH-003' },
    ],
  },
]

// ─── Color helpers ────────────────────────────────────────────────────────────

const ESTADO_COLOR: Record<string, string> = {
  OPERATIVO:         '#16A34A',
  EN_MANTENIMIENTO:  EAM_COLOR,
  FUERA_DE_SERVICIO: '#DC2626',
}

const CRITICIDAD_COLOR: Record<string, string> = {
  CRITICA: '#DC2626',
  ALTA:    EAM_COLOR,
  MEDIA:   '#F59E0B',
  BAJA:    '#6B7280',
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  'Vehículo':        <VehiculoIcon sx={{ fontSize: 14 }} />,
  'Montacargas':     <MontacargasIcon sx={{ fontSize: 14 }} />,
  'Infraestructura': <InfraIcon sx={{ fontSize: 14 }} />,
  'Equipo':          <EquipoIcon sx={{ fontSize: 14 }} />,
}

const COMP_COLOR: Record<string, string> = {
  BUENO:   '#16A34A',
  REGULAR: '#F59E0B',
  CRITICO: '#DC2626',
}

const OT_TIPO_COLOR: Record<string, string> = {
  PREVENTIVA: '#16A34A',
  CORRECTIVA: '#DC2626',
  PREDICTIVA: '#3B82F6',
  EMERGENCIA: '#7F1D1D',
}

const formatCOP = (v: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

// ─── Tree node component ──────────────────────────────────────────────────────

function TreeNodeItem({
  node, depth, expanded, onToggle, onSelectAsset,
}: {
  node: TreeNode
  depth: number
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
  onSelectAsset: (codigo: string) => void
}) {
  const hasChildren = !!node.children && node.children.length > 0
  const isExpanded = expanded[node.id] ?? false
  const isLeafAsset = !hasChildren && !!node.codigo

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        onClick={() => {
          if (hasChildren) onToggle(node.id)
          else if (node.codigo) onSelectAsset(node.codigo)
        }}
        sx={{
          pl: depth * 2.5,
          py: 0.75,
          borderRadius: '8px',
          cursor: hasChildren || isLeafAsset ? 'pointer' : 'default',
          '&:hover': (hasChildren || isLeafAsset) ? { bgcolor: alpha(EAM_COLOR, 0.07) } : {},
        }}
      >
        {hasChildren ? (
          isExpanded
            ? <ExpandIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
            : <CollapseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        ) : (
          <Box sx={{ width: 16 }} />
        )}
        <Box
          sx={{
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: hasChildren ? EAM_COLOR : '#CBD5E1',
            flexShrink: 0,
          }}
        />
        <Typography
          fontSize={13}
          fontWeight={hasChildren ? 600 : 400}
          color={hasChildren ? '#1E293B' : isLeafAsset ? EAM_DARK : '#64748B'}
          sx={isLeafAsset ? { textDecoration: 'underline', textDecorationColor: alpha(EAM_COLOR, 0.4) } : undefined}
        >
          {node.label}
        </Typography>
      </Stack>

      {hasChildren && isExpanded && (
        <Box sx={{ borderLeft: `1px dashed rgba(50,172,92,0.25)`, ml: depth * 2.5 + 1.5 }}>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelectAsset={onSelectAsset}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

// ─── Vista 360° (hoja de vida del activo seleccionado) ─────────────────────────

function Vista360({ activo, onBack, onVerOTs }: { activo: Activo; onBack: () => void; onVerOTs: (a: Activo) => void }) {
  const componentes = useMemo(() => componentesDe(activo), [activo])
  const historial   = useMemo(() => historialDe(activo), [activo])
  const documentos  = useMemo(() => documentosDe(activo), [activo])
  const medidorEsHoras = activo.odometro.includes('hrs')

  const kpis = [
    { label: medidorEsHoras ? 'Horómetro' : activo.odometro === '—' ? 'Antigüedad' : 'Odómetro', value: activo.odometro === '—' ? `${new Date().getFullYear() - activo.anio} años` : activo.odometro, color: '#3B82F6' },
    { label: 'Último PM',      value: `hace ${activo.ultimoPM}`,        color: '#F59E0B' },
    { label: 'Próximo PM',     value: activo.proximoPM,                 color: activo.proximoPM.includes('vencido') || activo.proximoPM.includes('suspendido') ? '#DC2626' : EAM_COLOR },
    { label: 'Disponibilidad', value: `${activo.disponibilidad}%`,      color: activo.disponibilidad >= 95 ? '#16A34A' : activo.disponibilidad >= 85 ? '#F59E0B' : '#DC2626' },
    { label: 'MTBF',           value: activo.mtbf,                      color: '#06B6D4' },
    { label: 'MTTR',           value: activo.mttr,                      color: '#0EA5E9' },
    { label: 'Costo acumulado', value: formatCOP(activo.costoAcumulado), color: EAM_DARK },
    { label: 'OTs históricas', value: String(historial.length),        color: '#8B5CF6' },
  ]

  const ficha = [
    { label: 'Marca',            value: activo.marca },
    { label: 'Modelo',           value: activo.modelo },
    { label: 'Año',              value: String(activo.anio) },
    { label: 'Serie / VIN',      value: activo.serie },
    { label: 'Ubicación',        value: activo.ubicacion },
    { label: 'Responsable',      value: activo.responsable },
    { label: 'Fecha adquisición', value: activo.adquisicion },
    { label: 'Valor de compra',  value: formatCOP(activo.valorCompra) },
  ]

  return (
    <Box>
      {/* Asset header */}
      <Paper
        elevation={0}
        sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 2.5, mb: 2 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Button
              onClick={onBack}
              startIcon={<BackIcon />}
              size="small"
              sx={{ color: '#64748B', textTransform: 'none', minWidth: 0 }}
            >
              Portafolio
            </Button>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#E5E7EB' }} />
            <Box sx={{ color: EAM_COLOR }}>{TIPO_ICON[activo.tipo]}</Box>
            <Box>
              <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px">
                {activo.codigo} · {activo.tipo}
              </Typography>
              <Typography variant="h6" fontWeight={800} color="text.primary">
                {activo.nombre}
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip
                  label={activo.estado.replace(/_/g, ' ')}
                  size="small"
                  sx={{ bgcolor: alpha(ESTADO_COLOR[activo.estado], 0.15), color: ESTADO_COLOR[activo.estado], fontWeight: 700, fontSize: 10 }}
                />
                <Chip
                  label={activo.criticidad}
                  size="small"
                  sx={{ bgcolor: alpha(CRITICIDAD_COLOR[activo.criticidad], 0.15), color: CRITICIDAD_COLOR[activo.criticidad], fontWeight: 700, fontSize: 10 }}
                />
              </Stack>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<OTIcon />}
            size="small"
            onClick={() => onVerOTs(activo)}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700 }}
          >
            Ver Órdenes de Trabajo
          </Button>
        </Stack>
      </Paper>

      {/* KPI grid */}
      <Grid container spacing={2} mb={2}>
        {kpis.map((k) => (
          <Grid key={k.label} size={{ xs: 6, sm: 4, md: 3 }}>
            <Paper
              elevation={0}
              sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '12px', p: 2, textAlign: 'center' }}
            >
              <Typography fontSize={20} fontWeight={900} color={k.color} lineHeight={1.1} noWrap>
                {k.value}
              </Typography>
              <Typography fontSize={11} color="#64748B" mt={0.5}>
                {k.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Ficha técnica */}
      <Paper
        elevation={0}
        sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 2.5, mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <MetricIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
          <Typography fontWeight={700} fontSize={14} color="text.primary">Ficha técnica</Typography>
        </Stack>
        <Grid container spacing={2}>
          {ficha.map((f) => (
            <Grid key={f.label} size={{ xs: 6, sm: 4, md: 3 }}>
              <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">
                {f.label}
              </Typography>
              <Typography fontSize={13} fontWeight={600} color="#1E293B" sx={{ wordBreak: 'break-word' }}>
                {f.value}
              </Typography>
            </Grid>
          ))}
        </Grid>
        {/* Salud del activo */}
        <Box mt={2.5}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography fontSize={11} color="#64748B">Disponibilidad operativa</Typography>
            <Typography fontSize={11} fontWeight={700} color={activo.disponibilidad >= 95 ? '#16A34A' : activo.disponibilidad >= 85 ? '#F59E0B' : '#DC2626'}>
              {activo.disponibilidad}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={activo.disponibilidad}
            sx={{
              height: 8, borderRadius: 5, bgcolor: '#F1F5F9',
              '& .MuiLinearProgress-bar': { bgcolor: activo.disponibilidad >= 95 ? '#16A34A' : activo.disponibilidad >= 85 ? '#F59E0B' : '#DC2626', borderRadius: 5 },
            }}
          />
        </Box>
      </Paper>

      <Grid container spacing={2}>
        {/* Historial de OTs */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 2.5 }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography fontWeight={700} fontSize={14} color="text.primary">
                Historial de OTs (últimas {historial.length})
              </Typography>
              <Typography fontSize={12} fontWeight={700} color="#16A34A">
                {formatCOP(historial.reduce((s, o) => s + o.costo, 0))}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {historial.map((ot) => (
                <Box
                  key={ot.numero}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB' }}
                >
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                      <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>{ot.numero}</Typography>
                      <Chip
                        label={ot.tipo}
                        size="small"
                        sx={{ bgcolor: alpha(OT_TIPO_COLOR[ot.tipo] ?? '#6B7280', 0.15), color: OT_TIPO_COLOR[ot.tipo] ?? '#6B7280', fontWeight: 700, fontSize: 9, height: 18 }}
                      />
                    </Stack>
                    <Typography fontSize={12} color="#64748B" noWrap>{ot.descripcion}</Typography>
                  </Box>
                  <Box textAlign="right" flexShrink={0}>
                    <Typography fontSize={11} fontWeight={700} color="#16A34A">{formatCOP(ot.costo)}</Typography>
                    <Typography fontSize={10} color="#64748B">{ot.fecha}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Componentes + Documentos */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 2.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <ComponenteIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                <Typography fontWeight={700} fontSize={14} color="text.primary">Estado de componentes</Typography>
              </Stack>
              <Stack spacing={1}>
                {componentes.map((c) => (
                  <Stack key={c.nombre} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontSize={12} color="#64748B">{c.nombre}</Typography>
                    <Chip
                      label={c.estado}
                      size="small"
                      sx={{ bgcolor: alpha(COMP_COLOR[c.estado], 0.15), color: COMP_COLOR[c.estado], fontWeight: 700, fontSize: 9, height: 20 }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 2.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <DocIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                <Typography fontWeight={700} fontSize={14} color="text.primary">Documentos del activo</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {documentos.map((doc) => (
                  <Chip
                    key={doc.label}
                    label={doc.label}
                    size="small"
                    sx={{ bgcolor: alpha(doc.color, 0.15), color: doc.color, fontWeight: 600, fontSize: 11, border: `1px solid ${alpha(doc.color, 0.3)}` }}
                  />
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMActivos() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)

  // Portafolio filters
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterCriticidad, setFilterCriticidad] = useState('Todos')
  const [search, setSearch] = useState('')

  // Activo seleccionado para Vista 360°
  const [selectedId, setSelectedId] = useState<number>(1)

  // Jerarquía expanded state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'node-cd-bta': true,
    'node-flota': true,
  })

  const handleToggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const selectedActivo = ACTIVOS_MOCK.find((a) => a.id === selectedId) ?? ACTIVOS_MOCK[0]

  const openActivo = (a: Activo) => { setSelectedId(a.id); setTab(1) }
  const openActivoByCodigo = (codigo: string) => {
    const a = ACTIVOS_MOCK.find((x) => x.codigo === codigo)
    if (a) { setSelectedId(a.id); setTab(1) }
  }
  const verOTs = (a: Activo) => navigate(`/eam/ordenes-trabajo?activo=${encodeURIComponent(a.codigo)}`)

  const filtered = ACTIVOS_MOCK.filter((a) => {
    if (filterTipo !== 'Todos' && a.tipo !== filterTipo) return false
    if (filterEstado !== 'Todos' && a.estado !== filterEstado) return false
    if (filterCriticidad !== 'Todos' && a.criticidad !== filterCriticidad) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!a.codigo.toLowerCase().includes(q) && !a.nombre.toLowerCase().includes(q) && !a.ubicacion.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh' }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <VehiculoIcon sx={{ fontSize: 28, color: EAM_COLOR }} />
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary" letterSpacing="-0.5px">
              Gestión de Activos
            </Typography>
            <Typography fontSize={13} color="#64748B">
              Portafolio, hoja de vida (Vista 360°) y jerarquía · vehículos, equipos, maquinaria e infraestructura
            </Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', fontWeight: 600, fontSize: 13 },
            '& .Mui-selected': { color: EAM_COLOR },
            '& .MuiTabs-indicator': { bgcolor: EAM_COLOR },
          }}
        >
          <Tab label="Portafolio" />
          <Tab label="Hoja de vida 360°" />
          <Tab label="Jerarquía" />
          <Tab label="Flota combinada" />
        </Tabs>

        {/* ── Tab 0: Portafolio ── */}
        {tab === 0 && (
          <Box>
            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small" placeholder="Buscar código, nombre o ubicación…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 260, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField
                select size="small" label="Tipo de activo" value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                sx={{ minWidth: 170 }}
              >
                {['Todos', 'Vehículo', 'Montacargas', 'Infraestructura', 'Equipo'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Estado" value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                sx={{ minWidth: 190 }}
              >
                {['Todos', 'OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'].map((o) => (
                  <MenuItem key={o} value={o}>{o === 'Todos' ? 'Todos' : o.replace(/_/g, ' ')}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Criticidad" value={filterCriticidad}
                onChange={(e) => setFilterCriticidad(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                {['Todos', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Typography fontSize={12} color="#94A3B8" mb={1}>
              {filtered.length} activo{filtered.length !== 1 ? 's' : ''} · haz clic en una fila para ver su hoja de vida
            </Typography>

            {/* Table */}
            <Paper
              elevation={0}
              sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', overflow: 'hidden' }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 120px 140px 110px 1fr 130px 110px',
                  gap: 1, px: 2, py: 1.25,
                  borderBottom: '1px solid #E5E7EB',
                  bgcolor: alpha(EAM_COLOR, 0.06),
                }}
              >
                {['Código', 'Nombre', 'Tipo', 'Estado', 'Criticidad', 'Ubicación', 'Odóm./Horám.', 'Último PM'].map((h) => (
                  <Typography key={h} fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px">
                    {h.toUpperCase()}
                  </Typography>
                ))}
              </Box>

              {filtered.map((activo, idx) => (
                <Box
                  key={activo.id}
                  onClick={() => openActivo(activo)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 120px 140px 110px 1fr 130px 110px',
                    gap: 1, px: 2, py: 1.25,
                    borderBottom: idx < filtered.length - 1 ? '1px solid #E5E7EB' : 'none',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                    '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) },
                  }}
                >
                  <Typography fontSize={12} fontWeight={700} color={EAM_COLOR}>{activo.codigo}</Typography>
                  <Typography fontSize={12} color="#1E293B" noWrap>{activo.nombre}</Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box sx={{ color: 'text.secondary' }}>{TIPO_ICON[activo.tipo]}</Box>
                    <Typography fontSize={11} color="#64748B">{activo.tipo}</Typography>
                  </Stack>
                  <Chip
                    label={activo.estado.replace(/_/g, ' ')}
                    size="small"
                    sx={{ bgcolor: alpha(ESTADO_COLOR[activo.estado], 0.15), color: ESTADO_COLOR[activo.estado], fontWeight: 700, fontSize: 9, height: 20 }}
                  />
                  <Chip
                    label={activo.criticidad}
                    size="small"
                    sx={{ bgcolor: alpha(CRITICIDAD_COLOR[activo.criticidad], 0.15), color: CRITICIDAD_COLOR[activo.criticidad], fontWeight: 700, fontSize: 9, height: 20 }}
                  />
                  <Typography fontSize={12} color="#64748B" noWrap>{activo.ubicacion}</Typography>
                  <Typography fontSize={12} color="#64748B">{activo.odometro}</Typography>
                  <Typography fontSize={12} color="#64748B">hace {activo.ultimoPM}</Typography>
                </Box>
              ))}

              {filtered.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography fontSize={13} color="#94A3B8">No se encontraron activos con los filtros aplicados.</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* ── Tab 1: Hoja de vida 360° ── */}
        {tab === 1 && (
          <Vista360 activo={selectedActivo} onBack={() => setTab(0)} onVerOTs={verOTs} />
        )}

        {/* ── Tab 2: Jerarquía ── */}
        {tab === 2 && (
          <Paper
            elevation={0}
            sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 2.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <PlaceIcon sx={{ fontSize: 18, color: EAM_COLOR }} />
              <Typography fontWeight={700} fontSize={14} color="text.primary">Jerarquía de activos</Typography>
              <Typography fontSize={11} color="#94A3B8">· clic en un activo para abrir su hoja de vida</Typography>
            </Stack>
            <Stack spacing={0.25}>
              {TREE_DATA.map((node) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={handleToggle}
                  onSelectAsset={openActivoByCodigo}
                />
              ))}
            </Stack>
          </Paper>
        )}

        {/* ── Tab 3: Flota combinada (propia CMMS + externa TMS) ── */}
        {tab === 3 && (
          <VehiculosCombinados color={EAM_COLOR} colorDark={EAM_DARK} permitirCrear />
        )}
      </Box>
    </Layout>
  )
}
