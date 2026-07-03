import React, { useState, useMemo } from 'react'
import {
  Box, Paper, Typography, Stack, Chip, alpha,
  TextField, Drawer, IconButton, LinearProgress, Divider,
} from '@mui/material'
import {
  DirectionsCar as VehiculoIcon,
  PrecisionManufacturing as MontacargasIcon,
  Business as InfraIcon,
  Memory as EquipoIcon,
  Warning as AlertaIcon,
  CheckCircle as OkIcon,
  Error as CriticaIcon,
  Speed as DispIcon,
  Build as OTIcon,
  AttachMoney as CostoIcon,
  Timer as MTBFIcon,
  LocalFireDepartment as UrgIcon,
  Close as CloseIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  ChevronRight as ChevronIcon,
  CalendarToday as CalIcon,
  Route as RouteIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'
const PANEL_BG  = '#F8FAFC'

const TIPOS_ACTIVO = ['Todos', 'Vehículos', 'Montacargas', 'Infraestructura', 'Equipos TI']

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPICard {
  key: string
  label: string
  value: string
  color: string
  icon: React.ReactNode
  sub?: string
}

interface AlertaCritica {
  id: number
  activo: string
  tipo: string
  descripcion: string
  criticidad: 'CRITICA' | 'ALTA' | 'MEDIA'
}

interface ConfiabilidadRow {
  categoria: string
  tipo: string
  mtbf: string
  mttr: string
  disponibilidad: string
  estado: 'BUENO' | 'REGULAR' | 'CRITICO'
}

interface OTEstado { key: string; label: string; count: number; color: string }

// ─── KPI base values por tipo (1 mes) ────────────────────────────────────────

const KPI_BASE: Record<string, {
  disponibilidad: string; activos: number; otsAbiertas: number
  pm: string; mtbf: string; mttr: string; costo: number; criticos: number
  dmef: string; dmefSub: string
}> = {
  'Todos':          { disponibilidad: '94.2%', activos: 127, otsAbiertas: 34, pm: '87%', mtbf: '312 hrs', mttr: '4.2 hrs', costo: 48.2, criticos: 18, dmef: '14,300 km', dmefSub: 'Flota móvil' },
  'Vehículos':      { disponibilidad: '96.1%', activos:  52, otsAbiertas: 18, pm: '90%', mtbf: '412 hrs', mttr: '3.8 hrs', costo: 24.8, criticos:  6, dmef: '18,200 km', dmefSub: '≥ 15,000 km objetivo' },
  'Montacargas':    { disponibilidad: '98.2%', activos:  18, otsAbiertas:  7, pm: '85%', mtbf: '280 hrs', mttr: '5.2 hrs', costo:  8.4, criticos:  3, dmef:  '3,800 km', dmefSub: '≥ 3,000 km objetivo' },
  'Infraestructura':{ disponibilidad: '91.8%', activos:  24, otsAbiertas:  5, pm: '88%', mtbf: '520 hrs', mttr: '6.0 hrs', costo: 12.6, criticos:  6, dmef:     'N/A',   dmefSub: 'No aplica' },
  'Equipos TI':     { disponibilidad: '91.0%', activos:  33, otsAbiertas:  4, pm: '82%', mtbf: '180 hrs', mttr: '2.1 hrs', costo:  2.4, criticos:  3, dmef:     'N/A',   dmefSub: 'No aplica' },
}

// Proporción de OTs por tipo (suma = 1)
const TIPO_OT_FACTOR: Record<string, number> = {
  'Todos': 1, 'Vehículos': 0.52, 'Montacargas': 0.20, 'Infraestructura': 0.15, 'Equipos TI': 0.13,
}

// ─── Static data ──────────────────────────────────────────────────────────────

interface BarAsset { label: string; tipo: string; count: number; color: string; icon: React.ReactNode }
const ASSET_BARS: BarAsset[] = [
  { label: 'Vehículos',       tipo: 'Vehículos',      count: 52, color: '#3B82F6', icon: <VehiculoIcon sx={{ fontSize: 16 }} /> },
  { label: 'Montacargas',     tipo: 'Montacargas',    count: 18, color: '#F59E0B', icon: <MontacargasIcon sx={{ fontSize: 16 }} /> },
  { label: 'Infraestructura', tipo: 'Infraestructura',count: 24, color: '#8B5CF6', icon: <InfraIcon sx={{ fontSize: 16 }} /> },
  { label: 'Equipos TI',      tipo: 'Equipos TI',     count: 33, color: '#06B6D4', icon: <EquipoIcon sx={{ fontSize: 16 }} /> },
]
const TOTAL_ASSETS = 127

const ALERTAS: AlertaCritica[] = [
  { id: 1, activo: 'Motor VH-001',       tipo: 'Vehículos',      descripcion: 'Temperatura alta detectada por IA',   criticidad: 'CRITICA' },
  { id: 2, activo: 'Montacargas MC-003', tipo: 'Montacargas',    descripcion: 'PM vencido hace 15 días',             criticidad: 'ALTA'   },
  { id: 3, activo: 'Edificio BD-01',     tipo: 'Infraestructura',descripcion: 'Inspección de cubierta pendiente',    criticidad: 'ALTA'   },
  { id: 4, activo: 'Neumático NEU-124',  tipo: 'Vehículos',      descripcion: 'Profundidad mínima alcanzada',        criticidad: 'MEDIA'  },
  { id: 5, activo: 'Compresor CMP-07',   tipo: 'Infraestructura',descripcion: 'Nivel de aceite bajo',               criticidad: 'MEDIA'  },
  { id: 6, activo: 'Servidor SRV-01',    tipo: 'Equipos TI',     descripcion: 'Batería UPS en 18%',                  criticidad: 'ALTA'   },
]

const CONFIABILIDAD: ConfiabilidadRow[] = [
  { categoria: 'Vehículos pesados', tipo: 'Vehículos',      mtbf: '412 hrs', mttr: '3.8 hrs', disponibilidad: '99.1%', estado: 'BUENO'   },
  { categoria: 'Montacargas',       tipo: 'Montacargas',    mtbf: '280 hrs', mttr: '5.2 hrs', disponibilidad: '98.2%', estado: 'BUENO'   },
  { categoria: 'Infraestructura',   tipo: 'Infraestructura',mtbf: '520 hrs', mttr: '6.0 hrs', disponibilidad: '99.6%', estado: 'BUENO'   },
  { categoria: 'Equipos electrón.', tipo: 'Equipos TI',     mtbf: '180 hrs', mttr: '2.1 hrs', disponibilidad: '91.0%', estado: 'REGULAR' },
  { categoria: 'Sistemas HVAC',     tipo: 'Infraestructura',mtbf:  '95 hrs', mttr: '8.4 hrs', disponibilidad: '84.2%', estado: 'CRITICO' },
]

// ─── Panel detail data ────────────────────────────────────────────────────────

const PANEL_DISP_FLOTA = [
  { nombre: 'VH-001 — Tractocamión Kenworth T800', disp: 99.4, horasND: 4.5  },
  { nombre: 'VH-002 — Camión Freightliner M2-106', disp: 99.4, horasND: 4.0  },
  { nombre: 'VH-003 — Camioneta Ford Ranger',      disp: 100,  horasND: 0    },
  { nombre: 'TXC-987 — Tractocamión Volvo FH',     disp: 80.0, horasND: 144  },
  { nombre: 'CMN-321 — Camión International 4300', disp: 88.0, horasND: 86.4 },
  { nombre: 'BUS-654 — Bus Mercedes Sprinter',     disp: 97.5, horasND: 18   },
  { nombre: 'PLT-222 — Plataforma Carrocerías',    disp: 98.5, horasND: 10.8 },
  { nombre: 'FRG-789 — Furgón Renault Master',     disp: 92.0, horasND: 57.6 },
]

const PANEL_ACTIVOS_DETALLE = [
  { categoria: 'Vehículos',       total: 52, operativos: 48, mantenimiento: 3, inactivos: 1 },
  { categoria: 'Montacargas',     total: 18, operativos: 16, mantenimiento: 2, inactivos: 0 },
  { categoria: 'Infraestructura', total: 24, operativos: 22, mantenimiento: 1, inactivos: 1 },
  { categoria: 'Equipos TI',      total: 33, operativos: 31, mantenimiento: 2, inactivos: 0 },
]

const PANEL_OTS_ABIERTAS = [
  { numero: 'OT-2026-0101', activo: 'VH-001 Kenworth T800',   tipo: 'PREVENTIVA', prioridad: 'ALTA',   estado: 'PENDIENTE'    },
  { numero: 'OT-2026-0102', activo: 'MC-003 Toyota Forklift', tipo: 'CORRECTIVA', prioridad: 'URGENTE',estado: 'EN EJECUCIÓN' },
  { numero: 'OT-2026-0103', activo: 'CF-001 Compresor Frío',  tipo: 'CORRECTIVA', prioridad: 'MEDIA',  estado: 'ESP. REPUESTOS'},
  { numero: 'OT-2026-0104', activo: 'VH-002 Freightliner',    tipo: 'PREVENTIVA', prioridad: 'BAJA',   estado: 'PENDIENTE'    },
  { numero: 'OT-2026-0105', activo: 'SRV-01 Servidor Dell',   tipo: 'PREDICTIVA', prioridad: 'ALTA',   estado: 'EN EJECUCIÓN' },
  { numero: 'OT-2026-0106', activo: 'ELV-02 Estibador Still', tipo: 'CORRECTIVA', prioridad: 'MEDIA',  estado: 'PENDIENTE'    },
  { numero: 'OT-2026-0107', activo: 'CMP-07 Compresor Atlas', tipo: 'PREVENTIVA', prioridad: 'ALTA',   estado: 'ESP. REPUESTOS'},
]

const PANEL_PM = [
  { categoria: 'Vehículos',       realizados: 45, programados: 50, pct: 90 },
  { categoria: 'Montacargas',     realizados: 17, programados: 20, pct: 85 },
  { categoria: 'Infraestructura', realizados: 22, programados: 25, pct: 88 },
  { categoria: 'Equipos TI',      realizados: 18, programados: 22, pct: 82 },
]

const PANEL_MTBF = [
  { categoria: 'Vehículos pesados', horas: 412, tendencia: 'up'   },
  { categoria: 'Montacargas',       horas: 280, tendencia: 'flat' },
  { categoria: 'Infraestructura',   horas: 520, tendencia: 'up'   },
  { categoria: 'Equipos TI',        horas: 180, tendencia: 'down' },
  { categoria: 'Sistemas HVAC',     horas:  95, tendencia: 'down' },
]

const PANEL_MTTR = [
  { tipo: 'Mantenimiento Preventivo', horas: 2.1, benchmark: '2.5 hrs' },
  { tipo: 'Mantenimiento Correctivo', horas: 6.8, benchmark: '5.0 hrs' },
  { tipo: 'Atención de Emergencia',   horas: 1.5, benchmark: '2.0 hrs' },
  { tipo: 'Mantenimiento Predictivo', horas: 3.2, benchmark: '3.0 hrs' },
]

const PANEL_COSTO = [
  { concepto: 'Repuestos y materiales', valor: 28.4, pct: 58.9, color: '#F59E0B' },
  { concepto: 'Mano de obra interna',   valor: 12.3, pct: 25.5, color: '#3B82F6' },
  { concepto: 'Servicios externos',     valor:  7.5, pct: 15.6, color: '#8B5CF6' },
]

const PANEL_DMEF = [
  { nombre: 'VH-001 — Tractocamión Kenworth T800',   tipo: 'Vehículos',   km: 18500, objetivo: 15000 },
  { nombre: 'VH-002 — Camión Freightliner M2-106',   tipo: 'Vehículos',   km: 22300, objetivo: 15000 },
  { nombre: 'VH-003 — Camioneta Ford Ranger',         tipo: 'Vehículos',   km: 35200, objetivo: 15000 },
  { nombre: 'TXC-987 — Tractocamión Volvo FH',        tipo: 'Vehículos',   km:  8900, objetivo: 15000 },
  { nombre: 'CMN-321 — Camión International 4300',    tipo: 'Vehículos',   km: 11400, objetivo: 15000 },
  { nombre: 'BUS-654 — Bus Mercedes Sprinter',        tipo: 'Vehículos',   km: 19800, objetivo: 15000 },
  { nombre: 'PLT-222 — Plataforma Carrocerías',       tipo: 'Vehículos',   km: 15600, objetivo: 15000 },
  { nombre: 'FRG-789 — Furgón Renault Master',        tipo: 'Vehículos',   km: 13200, objetivo: 15000 },
  { nombre: 'MC-001 — Montacargas Yale GLP050',       tipo: 'Montacargas', km:  4200, objetivo:  3000 },
  { nombre: 'MC-002 — Montacargas Toyota 8FGU25',     tipo: 'Montacargas', km:  3800, objetivo:  3000 },
  { nombre: 'MC-003 — Montacargas Hyster H80FT',      tipo: 'Montacargas', km:  2900, objetivo:  3000 },
  { nombre: 'ELV-01 — Estibador Still EXV16',         tipo: 'Montacargas', km:  3600, objetivo:  3000 },
]

const PANEL_CRITICOS = [
  { activo: 'TXC-987 — Tractocamión Volvo FH',     motivo: 'Disponibilidad 80% — 144h parado en el período',   nivel: 'CRITICO' },
  { activo: 'CMN-321 — Camión International 4300',  motivo: 'PM vencido + falla recurrente en transmisión',     nivel: 'CRITICO' },
  { activo: 'Sistemas HVAC — Sede Bucaramanga',     motivo: 'MTBF 95h — muy por debajo del umbral 200h',        nivel: 'CRITICO' },
  { activo: 'MC-001 — Montacargas Yale GLP050',     motivo: 'Reparación mayor en curso — 32h no disponible',    nivel: 'ALTO'    },
  { activo: 'FRG-789 — Furgón Renault Master',      motivo: 'Disponibilidad 92% — tendencia descendente',       nivel: 'ALTO'    },
  { activo: 'Compresor CMP-07 — Atlas Copco GA22',  motivo: 'Nivel de aceite bajo, inspección pendiente',       nivel: 'ALTO'    },
]

// ─── Color helpers ────────────────────────────────────────────────────────────

const CRITICIDAD_COLOR: Record<string, string> = {
  CRITICA: '#DC2626',
  ALTA:    EAM_COLOR,
  MEDIA:   '#F59E0B',
}
const ESTADO_CONF_COLOR: Record<string, string> = {
  BUENO:   '#16A34A',
  REGULAR: '#F59E0B',
  CRITICO: '#DC2626',
}
const PRIORIDAD_COLOR: Record<string, string> = {
  URGENTE: '#DC2626',
  ALTA:    '#F97316',
  MEDIA:   '#F59E0B',
  BAJA:    '#6B7280',
}
const ESTADO_OT_COLOR: Record<string, string> = {
  'PENDIENTE':     EAM_COLOR,
  'EN EJECUCIÓN':  '#3B82F6',
  'ESP. REPUESTOS':'#F59E0B',
}

const dispColor = (d: number) => d >= 97 ? '#10B981' : d >= 92 ? '#F59E0B' : '#EF4444'
const tendIcon  = (t: string) =>
  t === 'up'   ? <TrendUpIcon   sx={{ fontSize: 16, color: '#10B981' }} /> :
  t === 'down' ? <TrendDownIcon sx={{ fontSize: 16, color: '#EF4444' }} /> :
                 <TrendFlatIcon sx={{ fontSize: 16, color: '#F59E0B' }} />

const labelSx = { fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: 'text.disabled' }

// ─── Panel content ────────────────────────────────────────────────────────────

function PanelContent({
  panelKey, filterTipo, periodLabel, monthsInRange,
}: {
  panelKey: string
  filterTipo: string
  periodLabel: string
  monthsInRange: number
}) {
  const b = KPI_BASE[filterTipo] ?? KPI_BASE['Todos']
  const costoTotal = (b.costo * monthsInRange).toFixed(1)

  const panelData: { title: string; subtitle?: string; body: React.ReactNode } = useMemo(() => {
    switch (panelKey) {

      case 'disponibilidad': return {
        title: 'Disponibilidad por equipo',
        subtitle: `Flota — ${periodLabel}`,
        body: (
          <Stack spacing={1.25}>
            {PANEL_DISP_FLOTA.map((r) => (
              <Box key={r.nombre} sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #E5E7EB' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                  <Box flex={1} minWidth={0}>
                    <Typography fontSize={12} fontWeight={600} color="#1E293B" noWrap>{r.nombre.split('—')[0].trim()}</Typography>
                    <Typography fontSize={10} color="#64748B" noWrap>{r.nombre.split('—')[1]?.trim()}</Typography>
                  </Box>
                  <Stack alignItems="flex-end" ml={1.5}>
                    <Typography fontSize={16} fontWeight={900} color={dispColor(r.disp)}>{r.disp.toFixed(1)}%</Typography>
                    <Typography fontSize={9} color="#64748B">{r.horasND}h no disp.</Typography>
                  </Stack>
                </Stack>
                <Box sx={{ height: 5, borderRadius: 3, bgcolor: '#E5E7EB', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${Math.min(r.disp, 100)}%`, bgcolor: dispColor(r.disp), borderRadius: 3 }} />
                </Box>
              </Box>
            ))}
            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.06), border: `1px solid ${alpha(EAM_COLOR, 0.2)}`, textAlign: 'center' }}>
              <Typography fontSize={11} color="#64748B">Disponibilidad promedio flota</Typography>
              <Typography fontSize={24} fontWeight={900} color="#F59E0B">{b.disponibilidad}</Typography>
              <Typography fontSize={10} color="#64748B">Objetivo ≥ 90%</Typography>
            </Box>
          </Stack>
        ),
      }

      case 'total-activos': return {
        title: 'Inventario de activos',
        subtitle: `${b.activos} activos${filterTipo !== 'Todos' ? ` — ${filterTipo}` : ''}`,
        body: (
          <Stack spacing={1.5}>
            {PANEL_ACTIVOS_DETALLE
              .filter((r) => filterTipo === 'Todos' || r.categoria === filterTipo)
              .map((r) => (
                <Box key={r.categoria} sx={{ p: 1.75, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #E5E7EB' }}>
                  <Stack direction="row" justifyContent="space-between" mb={1.25}>
                    <Typography fontSize={13} fontWeight={700} color="#1E293B">{r.categoria}</Typography>
                    <Typography fontSize={18} fontWeight={900} color={EAM_COLOR}>{r.total}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    {[
                      { label: 'Operativos', val: r.operativos, color: '#10B981' },
                      { label: 'En mantenimiento', val: r.mantenimiento, color: '#F59E0B' },
                      { label: 'Inactivos', val: r.inactivos, color: '#6B7280' },
                    ].map((s) => (
                      <Box key={s.label} textAlign="center">
                        <Typography fontSize={14} fontWeight={800} color={s.color}>{s.val}</Typography>
                        <Typography fontSize={9} color="#64748B">{s.label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 1.25, height: 6, borderRadius: 3, bgcolor: '#E5E7EB', overflow: 'hidden', display: 'flex' }}>
                    <Box sx={{ width: `${(r.operativos/r.total)*100}%`, bgcolor: '#10B981', height: '100%' }} />
                    <Box sx={{ width: `${(r.mantenimiento/r.total)*100}%`, bgcolor: '#F59E0B', height: '100%' }} />
                    <Box sx={{ width: `${(r.inactivos/r.total)*100}%`, bgcolor: '#6B7280', height: '100%' }} />
                  </Box>
                </Box>
              ))}
          </Stack>
        ),
      }

      case 'ots-abiertas': return {
        title: 'Órdenes de trabajo abiertas',
        subtitle: `${periodLabel}${filterTipo !== 'Todos' ? ` — ${filterTipo}` : ''}`,
        body: (
          <Stack spacing={1}>
            {PANEL_OTS_ABIERTAS
              .filter((ot) => {
                if (filterTipo === 'Todos') return true
                const tipoMap: Record<string, string[]> = {
                  'Vehículos': ['VH-', 'TXC-', 'CMN-', 'BUS-', 'PLT-', 'FRG-'],
                  'Montacargas': ['MC-', 'ELV-'],
                  'Infraestructura': ['CF-', 'CMP-'],
                  'Equipos TI': ['SRV-'],
                }
                const prefixes = tipoMap[filterTipo] ?? []
                return prefixes.some((p) => ot.activo.includes(p))
              })
              .map((ot) => (
              <Box key={ot.numero} sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #E5E7EB' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>{ot.numero}</Typography>
                  <Chip label={ot.prioridad} size="small" sx={{ bgcolor: alpha(PRIORIDAD_COLOR[ot.prioridad], 0.15), color: PRIORIDAD_COLOR[ot.prioridad], fontWeight: 700, fontSize: 9, height: 18 }} />
                </Stack>
                <Typography fontSize={12} fontWeight={600} color="#1E293B" mb={0.5}>{ot.activo}</Typography>
                <Stack direction="row" spacing={0.75}>
                  <Chip label={ot.tipo} size="small" sx={{ bgcolor: alpha('#6B7280', 0.15), color: '#9CA3AF', fontSize: 9, height: 18 }} />
                  <Chip label={ot.estado} size="small" sx={{ bgcolor: alpha(ESTADO_OT_COLOR[ot.estado] ?? '#6B7280', 0.15), color: ESTADO_OT_COLOR[ot.estado] ?? '#9CA3AF', fontSize: 9, height: 18 }} />
                </Stack>
              </Box>
            ))}
          </Stack>
        ),
      }

      case 'cumplimiento-pm': return {
        title: 'Cumplimiento de PM',
        subtitle: `Mantenimientos preventivos — ${periodLabel}`,
        body: (
          <Stack spacing={3.5}>
            {PANEL_PM
              .filter((r) => filterTipo === 'Todos' || r.categoria === filterTipo)
              .map((r) => {
                const realizadosScaled = Math.round(r.realizados * monthsInRange)
                const programadosScaled = Math.round(r.programados * monthsInRange)
                return (
                  <Box key={r.categoria}>
                    <Stack direction="row" justifyContent="space-between" mb={0.75}>
                      <Typography fontSize={13} fontWeight={600} color="#1E293B">{r.categoria}</Typography>
                      <Typography fontSize={13} fontWeight={800} color={r.pct >= 90 ? '#10B981' : r.pct >= 80 ? '#F59E0B' : '#EF4444'}>{r.pct}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={r.pct}
                      sx={{ height: 10, borderRadius: 5, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: r.pct >= 90 ? '#10B981' : r.pct >= 80 ? '#F59E0B' : '#EF4444', borderRadius: 5 } }}
                    />
                    <Typography fontSize={10} color="#64748B" mt={0.5}>{realizadosScaled} de {programadosScaled} PM realizados</Typography>
                  </Box>
                )
              })}
            <Divider sx={{ borderColor: '#E5E7EB' }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography fontSize={12} color="#64748B">Total acumulado</Typography>
              <Typography fontSize={14} fontWeight={800} color="#F59E0B">{b.pm}</Typography>
            </Stack>
          </Stack>
        ),
      }

      case 'mtbf': return {
        title: 'MTBF por categoría',
        subtitle: 'Mean Time Between Failures',
        body: (
          <Stack spacing={1.25}>
            {PANEL_MTBF
              .filter((r) => filterTipo === 'Todos' || r.categoria.toLowerCase().includes(filterTipo.toLowerCase().split(' ')[0].toLowerCase()))
              .map((r) => {
                const pct = Math.round((r.horas / 520) * 100)
                const col = r.horas >= 300 ? '#10B981' : r.horas >= 150 ? '#F59E0B' : '#EF4444'
                return (
                  <Box key={r.categoria} sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #E5E7EB' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                      <Typography fontSize={12} fontWeight={600} color="#1E293B">{r.categoria}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography fontSize={15} fontWeight={800} color={col}>{r.horas}h</Typography>
                        {tendIcon(r.tendencia)}
                      </Stack>
                    </Stack>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#E5E7EB', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: col, borderRadius: 3 }} />
                    </Box>
                  </Box>
                )
              })}
            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha('#8B5CF6', 0.07), border: '1px solid rgba(139,92,246,0.2)', textAlign: 'center' }}>
              <Typography fontSize={11} color="#64748B">MTBF Promedio{filterTipo !== 'Todos' ? ` — ${filterTipo}` : ''}</Typography>
              <Typography fontSize={24} fontWeight={900} color="#8B5CF6">{b.mtbf}</Typography>
              <Typography fontSize={10} color="#64748B">Benchmark industria: 280 hrs</Typography>
            </Box>
          </Stack>
        ),
      }

      case 'mttr': return {
        title: 'MTTR por tipo de trabajo',
        subtitle: 'Mean Time To Repair',
        body: (
          <Stack spacing={1.5}>
            {PANEL_MTTR.map((r) => {
              const vsRef = r.horas <= parseFloat(r.benchmark) ? 'bajo' : 'alto'
              const col = vsRef === 'bajo' ? '#10B981' : '#EF4444'
              return (
                <Box key={r.tipo} sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #E5E7EB' }}>
                  <Typography fontSize={12} fontWeight={600} color="#1E293B" mb={0.5}>{r.tipo}</Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2}>
                      <Box>
                        <Typography fontSize={18} fontWeight={900} color={col}>{r.horas}h</Typography>
                        <Typography fontSize={9} color="#64748B">Actual</Typography>
                      </Box>
                      <Box>
                        <Typography fontSize={14} fontWeight={600} color="#334155">{r.benchmark}</Typography>
                        <Typography fontSize={9} color="#64748B">Benchmark</Typography>
                      </Box>
                    </Stack>
                    <Chip label={vsRef === 'bajo' ? '↓ Bajo objetivo' : '↑ Sobre objetivo'} size="small"
                      sx={{ bgcolor: alpha(col, 0.15), color: col, fontWeight: 700, fontSize: 9 }} />
                  </Stack>
                </Box>
              )
            })}
            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha('#06B6D4', 0.07), border: '1px solid rgba(6,182,212,0.2)', textAlign: 'center' }}>
              <Typography fontSize={11} color="#64748B">MTTR Promedio{filterTipo !== 'Todos' ? ` — ${filterTipo}` : ''}</Typography>
              <Typography fontSize={24} fontWeight={900} color="#06B6D4">{b.mttr}</Typography>
            </Box>
          </Stack>
        ),
      }

      case 'costo-mes': return {
        title: 'Costo de mantenimiento',
        subtitle: `${periodLabel} — $${costoTotal}M COP${filterTipo !== 'Todos' ? ` — ${filterTipo}` : ''}`,
        body: (
          <Stack spacing={2}>
            <Typography sx={labelSx}>Desglose por concepto</Typography>
            {PANEL_COSTO.map((c) => {
              const valorScaled = (c.valor * monthsInRange * (b.costo / KPI_BASE['Todos'].costo)).toFixed(1)
              return (
                <Box key={c.concepto}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={12} color="#334155">{c.concepto}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontSize={12} fontWeight={700} color={c.color}>${valorScaled}M</Typography>
                      <Chip label={`${c.pct}%`} size="small" sx={{ bgcolor: alpha(c.color, 0.15), color: c.color, fontWeight: 700, fontSize: 9, height: 18 }} />
                    </Stack>
                  </Stack>
                  <LinearProgress variant="determinate" value={c.pct}
                    sx={{ height: 8, borderRadius: 4, bgcolor: alpha(c.color, 0.1), '& .MuiLinearProgress-bar': { bgcolor: c.color, borderRadius: 4 } }}
                  />
                </Box>
              )
            })}
            <Divider sx={{ borderColor: '#E5E7EB' }} />
            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha('#3B82F6', 0.07), border: '1px solid rgba(59,130,246,0.2)' }}>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography fontSize={11} color="#64748B">Presupuesto período</Typography>
                  <Typography fontSize={15} fontWeight={800} color="#1E293B">${(52 * monthsInRange).toFixed(1)}M</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography fontSize={11} color="#64748B">Ejecución</Typography>
                  <Typography fontSize={15} fontWeight={800} color="#10B981">
                    {((b.costo * monthsInRange) / (52 * monthsInRange) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        ),
      }

      case 'activos-criticos': return {
        title: 'Activos en estado crítico',
        subtitle: `${b.criticos} activos${filterTipo !== 'Todos' ? ` — ${filterTipo}` : ''} — ${periodLabel}`,
        body: (
          <Stack spacing={1.25}>
            {PANEL_CRITICOS
              .filter((_, i) => filterTipo === 'Todos' || i < b.criticos)
              .map((a, i) => {
                const col = a.nivel === 'CRITICO' ? '#EF4444' : '#F97316'
                return (
                  <Box key={i} sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha(col, 0.06), border: `1px solid ${alpha(col, 0.2)}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography fontSize={12} fontWeight={700} color="#1E293B" noWrap sx={{ flex: 1, mr: 1 }}>{a.activo.split('—')[0].trim()}</Typography>
                      <Chip label={a.nivel} size="small" sx={{ bgcolor: alpha(col, 0.18), color: col, fontWeight: 700, fontSize: 9, height: 18, flexShrink: 0 }} />
                    </Stack>
                    <Typography fontSize={10} color="#64748B" noWrap>{a.activo.split('—')[1]?.trim()}</Typography>
                    <Typography fontSize={11} color={alpha(col, 0.9)} mt={0.5}>{a.motivo}</Typography>
                  </Box>
                )
              })}
          </Stack>
        ),
      }

      case 'dmef': {
        const dmefRows = PANEL_DMEF.filter((r) =>
          filterTipo === 'Todos' || r.tipo === filterTipo
        )
        const applicable = dmefRows.length > 0
        const avg = applicable
          ? Math.round(dmefRows.reduce((s, r) => s + r.km, 0) / dmefRows.length)
          : 0
        const fmtKm = (n: number) => n.toLocaleString('es-CO') + ' km'
        const kmColor = (km: number, obj: number) =>
          km >= obj * 1.2 ? '#10B981' : km >= obj ? '#32AC5C' : km >= obj * 0.75 ? '#F59E0B' : '#EF4444'
        return {
          title: 'Distancia Media Entre Fallas',
          subtitle: applicable
            ? `${filterTipo !== 'Todos' ? filterTipo : 'Flota móvil'} — ${periodLabel}`
            : 'No aplica a este tipo de activo',
          body: applicable ? (
            <Stack spacing={1.25}>
              {dmefRows.map((r) => {
                const col = kmColor(r.km, r.objetivo)
                const pct = Math.min(Math.round((r.km / (r.objetivo * 2)) * 100), 100)
                return (
                  <Box key={r.nombre} sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #E5E7EB' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                      <Box flex={1} minWidth={0}>
                        <Typography fontSize={12} fontWeight={600} color="#1E293B" noWrap>{r.nombre.split('—')[0].trim()}</Typography>
                        <Typography fontSize={10} color="#64748B" noWrap>{r.nombre.split('—')[1]?.trim()}</Typography>
                      </Box>
                      <Stack alignItems="flex-end" ml={1.5} flexShrink={0}>
                        <Typography fontSize={15} fontWeight={900} color={col}>{fmtKm(r.km)}</Typography>
                        <Typography fontSize={9} color="#64748B">obj. {fmtKm(r.objetivo)}</Typography>
                      </Stack>
                    </Stack>
                    <Box sx={{ height: 5, borderRadius: 3, bgcolor: 'text.disabled', overflow: 'hidden', position: 'relative' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: col, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      {/* objetivo line at 50% of the bar (= objetivo/2*objetivo = 50%) */}
                      <Box sx={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: '100%', bgcolor: 'text.disabled' }} />
                    </Box>
                  </Box>
                )
              })}
              <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha('#14B8A6', 0.07), border: '1px solid rgba(20,184,166,0.25)', textAlign: 'center' }}>
                <Typography fontSize={11} color="#64748B">DMEF Promedio{filterTipo !== 'Todos' ? ` — ${filterTipo}` : ''}</Typography>
                <Typography fontSize={24} fontWeight={900} color="#14B8A6">{fmtKm(avg)}</Typography>
                <Typography fontSize={10} color="#64748B">
                  {avg >= (dmefRows[0]?.objetivo ?? 15000)
                    ? '↑ Sobre objetivo — confiabilidad favorable'
                    : '↓ Bajo objetivo — revisar mantenimiento preventivo'}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <RouteIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
              <Typography fontSize={13} color="#64748B">
                La DMEF aplica únicamente a activos móviles
              </Typography>
              <Typography fontSize={11} color="#94A3B8" mt={0.5}>
                Selecciona Vehículos o Montacargas
              </Typography>
            </Box>
          ),
        }
      }

      default: return { title: '', body: null }
    }
  }, [panelKey, filterTipo, periodLabel, monthsInRange, b, costoTotal])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, pb: 2, borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <Typography fontSize={16} fontWeight={800} color="#1E293B" lineHeight={1.2}>{panelData.title}</Typography>
        {panelData.subtitle && (
          <Typography fontSize={12} color="#64748B" mt={0.5}>{panelData.subtitle}</Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'text.disabled', borderRadius: 2 } }}>
        {panelData.body}
      </Box>
    </Box>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICardItem({ card, active, onClick }: { card: KPICard; active: boolean; onClick: () => void }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${active ? alpha(card.color, 0.7) : '#E5E7EB'}`,
        borderRadius: '14px',
        p: 2.5,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: active
          ? `0 0 0 2px ${alpha(card.color, 0.3)}, 0 6px 28px rgba(0,0,0,0.10)`
          : '0 4px 24px rgba(0,0,0,0.06)',
        '&:hover': {
          border: `1px solid ${alpha(card.color, 0.55)}`,
          bgcolor: alpha(card.color, 0.04),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.10)`,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography fontSize={26} fontWeight={800} color={card.color} lineHeight={1}>
            {card.value}
          </Typography>
          <Typography fontSize={12} color="#64748B" mt={0.5}>{card.label}</Typography>
          {card.sub && <Typography fontSize={10} color="#94A3B8" mt={0.25}>{card.sub}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(card.color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {React.cloneElement(card.icon as React.ReactElement, { sx: { fontSize: 18, color: card.color } })}
          </Box>
          <ChevronIcon sx={{ fontSize: 14, color: alpha(card.color, 0.5) }} />
        </Box>
      </Stack>
    </Paper>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMDashboard() {
  const [filterDesde,  setFilterDesde]  = useState('2026-06-01')
  const [filterHasta,  setFilterHasta]  = useState('2026-06-30')
  const [filterTipo,   setFilterTipo]   = useState('Todos')
  const [panelOpen,    setPanelOpen]    = useState(false)
  const [panelKey,     setPanelKey]     = useState('')

  const openPanel  = (key: string) => { setPanelKey(key); setPanelOpen(true) }
  const closePanel = () => setPanelOpen(false)

  // Número de meses cubiertos por el rango
  const monthsInRange = useMemo(() => {
    const from = new Date(filterDesde + 'T00:00:00')
    const to   = new Date(filterHasta + 'T00:00:00')
    const diff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1
    return Math.max(1, diff)
  }, [filterDesde, filterHasta])

  // Etiqueta legible del período
  const periodLabel = useMemo(() => {
    const fmt = (d: string) =>
      new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    return filterDesde === filterHasta ? fmt(filterDesde) : `${fmt(filterDesde)} – ${fmt(filterHasta)}`
  }, [filterDesde, filterHasta])

  // KPIs calculados según tipo y período
  const kpiData = useMemo((): KPICard[] => {
    const b = KPI_BASE[filterTipo] ?? KPI_BASE['Todos']
    const otsV    = Math.round(b.otsAbiertas * monthsInRange)
    const costoV  = (b.costo * monthsInRange).toFixed(1)
    const critV   = Math.min(Math.round(b.criticos * Math.sqrt(monthsInRange)), 45)
    const costoLbl = monthsInRange > 1 ? `Costo (${monthsInRange}m)` : 'Costo Mes'
    return [
      { key: 'disponibilidad',  label: 'Disponibilidad Flota', value: b.disponibilidad,  color: '#16A34A', icon: <DispIcon />,    sub: '≥ 90% objetivo' },
      { key: 'total-activos',   label: 'Total Activos',        value: String(b.activos),  color: EAM_COLOR, icon: <VehiculoIcon /> },
      { key: 'ots-abiertas',    label: 'OTs Abiertas',         value: String(otsV),       color: '#3B82F6', icon: <OTIcon /> },
      { key: 'cumplimiento-pm', label: 'Cumplimiento PM',      value: b.pm,               color: '#F59E0B', icon: <OkIcon /> },
      { key: 'mtbf',            label: 'MTBF',                 value: b.mtbf,             color: '#8B5CF6', icon: <MTBFIcon /> },
      { key: 'mttr',            label: 'MTTR',                 value: b.mttr,             color: '#06B6D4', icon: <MTBFIcon /> },
      { key: 'costo-mes',       label: costoLbl,               value: `$${costoV}M`,      color: EAM_DARK,  icon: <CostoIcon /> },
      { key: 'activos-criticos',label: 'Activos Críticos',     value: String(critV),      color: '#DC2626', icon: <CriticaIcon /> },
      { key: 'dmef',            label: 'Dist. Media Fallas',  value: b.dmef,             color: '#14B8A6', icon: <RouteIcon />,   sub: b.dmefSub },
    ]
  }, [filterTipo, monthsInRange])

  // OT estados calculados según tipo y período
  const otEstados = useMemo((): OTEstado[] => {
    const m = monthsInRange
    const f = TIPO_OT_FACTOR[filterTipo] ?? 1
    return [
      { key: 'pendiente',      label: 'PENDIENTE',       count: Math.max(1, Math.round(12 * m * f)), color: EAM_COLOR },
      { key: 'en-ejecucion',   label: 'EN EJECUCIÓN',    count: Math.max(0, Math.round( 8 * m * f)), color: '#3B82F6' },
      { key: 'esp-repuestos',  label: 'ESP. REPUESTOS',  count: Math.max(0, Math.round( 6 * m * f)), color: '#F59E0B' },
      { key: 'completadas',    label: 'COMPLETADAS',     count: Math.max(1, Math.round(45 * m * f)), color: '#16A34A' },
      { key: 'canceladas',     label: 'CANCELADAS',      count: Math.max(0, Math.round( 3 * m * f)), color: '#6B7280' },
    ]
  }, [filterTipo, monthsInRange])

  const alertasFiltradas = useMemo(() =>
    filterTipo === 'Todos' ? ALERTAS : ALERTAS.filter((a) => a.tipo === filterTipo),
  [filterTipo])

  const confiabilidadFiltrada = useMemo(() =>
    filterTipo === 'Todos' ? CONFIABILIDAD : CONFIABILIDAD.filter((r) => r.tipo === filterTipo),
  [filterTipo])

  const cardSx = {
    bgcolor: '#FFFFFF',
    border: '1px solid rgba(50,172,92,0.18)',
    borderRadius: '14px',
    p: 2.5,
    height: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  }

  const dateSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(EAM_COLOR, 0.5) },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: alpha(EAM_COLOR, 0.7) },
    },
    '& .MuiInputLabel-root': { fontSize: 12 },
    '& .MuiInputLabel-root.Mui-focused': { color: EAM_COLOR },
    '& input': { fontSize: 13 },
    '& input[type="date"]::-webkit-calendar-picker-indicator': {
      cursor: 'pointer',
    },
  }

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh' }}>

        {/* ── Header ── */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: alpha(EAM_COLOR, 0.15), border: '1px solid rgba(50,172,92,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UrgIcon sx={{ fontSize: 22, color: EAM_COLOR }} />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary', letterSpacing: '-0.5px' }}>
                Torre de Control EAM
              </Typography>
              <Chip label="CMMS / EAM" size="small"
                sx={{ bgcolor: alpha(EAM_COLOR, 0.18), color: EAM_COLOR, fontWeight: 700, fontSize: 10, border: '1px solid rgba(50,172,92,0.35)' }}
              />
            </Stack>
            <Typography fontSize={13} color="#64748B" mt={0.25}>
              Enterprise Asset Management — Gestión integrada de activos industriales
            </Typography>
          </Box>
        </Stack>

        {/* ── Filter bar ── */}
        <Paper elevation={0} sx={{ border: '1px solid rgba(50,172,92,0.15)', borderRadius: '14px', px: 2.5, py: 2, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={2} flexWrap="wrap" useFlexGap>

            {/* Label */}
            <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: EAM_COLOR }} />
              <Typography fontSize={12} fontWeight={700} color="#64748B" textTransform="uppercase" letterSpacing="0.05em">
                Filtros
              </Typography>
            </Stack>

            {/* Date range */}
            <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
              <CalIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <TextField
                size="small"
                label="Desde"
                type="date"
                value={filterDesde}
                onChange={(e) => {
                  const v = e.target.value
                  setFilterDesde(v)
                  if (v > filterHasta) setFilterHasta(v)
                }}
                inputProps={{ max: filterHasta }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 158, ...dateSx }}
              />
              <Typography fontSize={13} color="#94A3B8" fontWeight={300}>—</Typography>
              <TextField
                size="small"
                label="Hasta"
                type="date"
                value={filterHasta}
                onChange={(e) => {
                  const v = e.target.value
                  setFilterHasta(v)
                  if (v < filterDesde) setFilterDesde(v)
                }}
                inputProps={{ min: filterDesde }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 158, ...dateSx }}
              />
              {monthsInRange > 1 && (
                <Chip
                  label={`${monthsInRange} meses`}
                  size="small"
                  sx={{ bgcolor: alpha(EAM_COLOR, 0.12), color: EAM_COLOR, fontWeight: 700, fontSize: 10, border: `1px solid ${alpha(EAM_COLOR, 0.3)}` }}
                />
              )}
            </Stack>

            {/* Tipo de activo */}
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {TIPOS_ACTIVO.map((t) => (
                <Chip key={t} label={t} size="small" clickable onClick={() => setFilterTipo(t)}
                  sx={{
                    bgcolor: filterTipo === t ? alpha(EAM_COLOR, 0.2) : '#F1F5F9',
                    color:   filterTipo === t ? EAM_COLOR : '#64748B',
                    border:  `1px solid ${filterTipo === t ? alpha(EAM_COLOR, 0.45) : '#E5E7EB'}`,
                    fontWeight: filterTipo === t ? 700 : 400,
                    fontSize: 12, height: 28,
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </Stack>

            {/* Active filter summary */}
            {(filterTipo !== 'Todos' || monthsInRange > 1) && (
              <Typography fontSize={11} color="#64748B" sx={{ ml: 'auto' }}>
                {filterTipo !== 'Todos' && <strong style={{ color: EAM_COLOR }}>{filterTipo}</strong>}
                {filterTipo !== 'Todos' && monthsInRange > 1 && <span> · </span>}
                {monthsInRange > 1 && <span style={{ color: '#64748B' }}>{periodLabel}</span>}
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* ── KPI cards (reactivos a filtros) ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(3,1fr)' }, gap: '20px', mb: '28px' }}>
          {kpiData.map((kpi) => (
            <KPICardItem key={kpi.key} card={kpi} active={panelOpen && panelKey === kpi.key} onClick={() => openPanel(kpi.key)} />
          ))}
        </Box>

        {/* ── Middle row ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: '20px', mb: '28px' }}>

          {/* Activos por tipo */}
          <Paper elevation={0} sx={cardSx}>
            <Typography fontWeight={700} fontSize={14} color="text.primary" mb={2.5}>Activos por tipo</Typography>
            <Stack spacing={2.25}>
              {ASSET_BARS.map((item) => {
                const pct = Math.round((item.count / TOTAL_ASSETS) * 100)
                const dimmed = filterTipo !== 'Todos' && filterTipo !== item.tipo
                const active = filterTipo === item.tipo
                return (
                  <Box key={item.label}
                    onClick={() => setFilterTipo(filterTipo === item.tipo ? 'Todos' : item.tipo)}
                    sx={{ cursor: 'pointer', opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.2s', '&:hover': { opacity: dimmed ? 0.65 : 1 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
                        <Typography fontSize={13} color={active ? '#1E293B' : '#334155'} fontWeight={active ? 700 : 400}>
                          {item.label}
                        </Typography>
                      </Stack>
                      <Typography fontSize={13} fontWeight={700} color={item.color}>{item.count}</Typography>
                    </Stack>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: item.color, borderRadius: 4, transition: 'width 0.5s ease', opacity: active ? 1 : 0.7 }} />
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </Paper>

          {/* OTs por estado (reactivos a filtros) */}
          <Paper elevation={0} sx={cardSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
              <Typography fontWeight={700} fontSize={14} color="text.primary">OTs por estado</Typography>
              {monthsInRange > 1 && (
                <Typography fontSize={10} color="#64748B">{monthsInRange} meses acumulados</Typography>
              )}
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', mb: '12px' }}>
              {otEstados.slice(0, 3).map((ot) => (
                <Box key={ot.key}
                  onClick={() => openPanel(`ot-estado:${ot.key}`)}
                  sx={{
                    border: `1px solid ${panelOpen && panelKey === `ot-estado:${ot.key}` ? alpha(ot.color, 0.7) : alpha(ot.color, 0.35)}`,
                    borderRadius: '12px',
                    bgcolor: alpha(ot.color, panelOpen && panelKey === `ot-estado:${ot.key}` ? 0.14 : 0.07),
                    p: 1.75, textAlign: 'center', cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    '&:hover': { bgcolor: alpha(ot.color, 0.14), border: `1px solid ${alpha(ot.color, 0.6)}`, transform: 'translateY(-2px)' },
                  }}
                >
                  <Typography fontSize={32} fontWeight={900} color={ot.color} lineHeight={1}>{ot.count}</Typography>
                  <Typography fontSize={10} fontWeight={700} color={alpha(ot.color, 0.85)} mt={0.75} letterSpacing="0.5px">{ot.label}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
              {otEstados.slice(3).map((ot) => (
                <Box key={ot.key}
                  onClick={() => openPanel(`ot-estado:${ot.key}`)}
                  sx={{
                    border: `1px solid ${panelOpen && panelKey === `ot-estado:${ot.key}` ? alpha(ot.color, 0.7) : alpha(ot.color, 0.35)}`,
                    borderRadius: '12px',
                    bgcolor: alpha(ot.color, panelOpen && panelKey === `ot-estado:${ot.key}` ? 0.14 : 0.07),
                    p: 1.75, textAlign: 'center', cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    '&:hover': { bgcolor: alpha(ot.color, 0.14), border: `1px solid ${alpha(ot.color, 0.6)}`, transform: 'translateY(-2px)' },
                  }}
                >
                  <Typography fontSize={32} fontWeight={900} color={ot.color} lineHeight={1}>{ot.count}</Typography>
                  <Typography fontSize={10} fontWeight={700} color={alpha(ot.color, 0.85)} mt={0.75} letterSpacing="0.5px">{ot.label}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* ── Bottom row ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '20px' }}>

          {/* Alertas críticas */}
          <Paper elevation={0} sx={cardSx}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
              <AlertaIcon sx={{ fontSize: 18, color: '#DC2626' }} />
              <Typography fontWeight={700} fontSize={14} color="text.primary">Alertas críticas</Typography>
              <Chip label={`${alertasFiltradas.length} activas`} size="small"
                sx={{ bgcolor: alpha('#DC2626', 0.15), color: '#DC2626', fontSize: 10, fontWeight: 700 }} />
            </Stack>
            <Stack spacing={1.5}>
              {alertasFiltradas.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography fontSize={12} color="#64748B">Sin alertas para {filterTipo}</Typography>
                </Box>
              ) : alertasFiltradas.map((alerta) => (
                <Box key={alerta.id}
                  onClick={() => openPanel(`alerta:${alerta.id}`)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1.5, borderRadius: '10px',
                    bgcolor: alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.07),
                    border: `1px solid ${panelOpen && panelKey === `alerta:${alerta.id}` ? alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.5) : alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.2)}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                    '&:hover': { bgcolor: alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.13), transform: 'translateX(2px)' },
                  }}
                >
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CRITICIDAD_COLOR[alerta.criticidad], flexShrink: 0 }} />
                  <Box flex={1} minWidth={0}>
                    <Typography fontSize={13} fontWeight={600} color="text.primary" noWrap>{alerta.activo}</Typography>
                    <Typography fontSize={11} color="#64748B" noWrap>{alerta.descripcion}</Typography>
                  </Box>
                  <Chip label={alerta.criticidad} size="small"
                    sx={{ bgcolor: alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.18), color: CRITICIDAD_COLOR[alerta.criticidad], fontWeight: 700, fontSize: 9, height: 20, flexShrink: 0 }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* Confiabilidad por categoría */}
          <Paper elevation={0} sx={cardSx}>
            <Typography fontWeight={700} fontSize={14} color="text.primary" mb={2.5}>Confiabilidad por categoría</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 1, pb: 1, borderBottom: '1px solid #E5E7EB' }}>
              {['Categoría', 'MTBF', 'MTTR', 'Disp.', 'Estado'].map((h) => (
                <Typography key={h} sx={labelSx}>{h}</Typography>
              ))}
            </Box>
            {confiabilidadFiltrada.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography fontSize={12} color="#64748B">Sin datos para {filterTipo}</Typography>
              </Box>
            ) : (
              <Stack spacing={0}>
                {confiabilidadFiltrada.map((row, idx) => (
                  <Box key={row.categoria}
                    onClick={() => openPanel(`confiabilidad:${row.categoria}`)}
                    sx={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 1,
                      py: 1.25,
                      borderBottom: idx < confiabilidadFiltrada.length - 1 ? '1px solid #E5E7EB' : 'none',
                      alignItems: 'center', cursor: 'pointer', borderRadius: '6px', px: 0.5,
                      transition: 'background 0.15s',
                      bgcolor: panelOpen && panelKey === `confiabilidad:${row.categoria}` ? alpha(EAM_COLOR, 0.06) : 'transparent',
                      '&:hover': { bgcolor: alpha(EAM_COLOR, 0.04) },
                    }}
                  >
                    <Typography fontSize={12} color="#334155">{row.categoria}</Typography>
                    <Typography fontSize={12} color="#64748B">{row.mtbf}</Typography>
                    <Typography fontSize={12} color="#64748B">{row.mttr}</Typography>
                    <Typography fontSize={12} fontWeight={700} color={ESTADO_CONF_COLOR[row.estado]}>{row.disponibilidad}</Typography>
                    <Chip label={row.estado} size="small"
                      sx={{ bgcolor: alpha(ESTADO_CONF_COLOR[row.estado], 0.15), color: ESTADO_CONF_COLOR[row.estado], fontWeight: 700, fontSize: 9, height: 20 }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      </Box>

      {/* ── Right detail panel ── */}
      <Drawer
        anchor="right"
        open={panelOpen}
        onClose={closePanel}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            bgcolor: PANEL_BG,
            borderLeft: '1px solid #E5E7EB',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip label="Detalle" size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_COLOR, fontWeight: 700, fontSize: 10 }} />
              {filterTipo !== 'Todos' && (
                <Chip label={filterTipo} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 10 }} />
              )}
            </Stack>
            <IconButton onClick={closePanel} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: alpha('#000', 0.04) } }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {panelKey && (
              <PanelContent
                panelKey={
                  panelKey.startsWith('ot-estado:')    ? 'ots-abiertas'    :
                  panelKey.startsWith('alerta:')        ? 'activos-criticos' :
                  panelKey.startsWith('confiabilidad:') ? 'mtbf'             :
                  panelKey
                }
                filterTipo={filterTipo}
                periodLabel={periodLabel}
                monthsInRange={monthsInRange}
              />
            )}
          </Box>
        </Box>
      </Drawer>
    </Layout>
  )
}
