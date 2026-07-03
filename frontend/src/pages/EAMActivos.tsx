import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Grid, Chip, Button, Tab, Tabs,
  MenuItem, TextField, alpha,
} from '@mui/material'
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
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Activo {
  id: number
  codigo: string
  nombre: string
  tipo: 'Vehículo' | 'Montacargas' | 'Infraestructura' | 'Equipo'
  estado: 'OPERATIVO' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO'
  criticidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  ubicacion: string
  odometro: string
  ultimoPM: string
}

interface OTHistorial {
  numero: string
  tipo: string
  descripcion: string
  fecha: string
  costo: string
  estado: string
}

interface Componente {
  nombre: string
  estado: 'BUENO' | 'REGULAR' | 'CRITICO'
}

interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

// ─── Static data ─────────────────────────────────────────────────────────────

const ACTIVOS_MOCK: Activo[] = [
  { id:  1, codigo: 'VH-001', nombre: 'Tractocamión Kenworth T800',   tipo: 'Vehículo',       estado: 'OPERATIVO',         criticidad: 'CRITICA', ubicacion: 'Bogotá DC',     odometro: '124,500 km', ultimoPM: '22 días' },
  { id:  2, codigo: 'VH-002', nombre: 'Camión Freightliner M2-106',   tipo: 'Vehículo',       estado: 'EN_MANTENIMIENTO',  criticidad: 'ALTA',    ubicacion: 'Medellín',      odometro:  '98,320 km', ultimoPM:  '8 días' },
  { id:  3, codigo: 'VH-003', nombre: 'Camioneta Ford Ranger',         tipo: 'Vehículo',       estado: 'OPERATIVO',         criticidad: 'BAJA',    ubicacion: 'Cali',          odometro:  '45,100 km', ultimoPM: '15 días' },
  { id:  4, codigo: 'MC-001', nombre: 'Montacargas Yale GLP050',       tipo: 'Montacargas',    estado: 'OPERATIVO',         criticidad: 'ALTA',    ubicacion: 'Bodega Bogotá', odometro: '8,230 hrs',  ultimoPM: '30 días' },
  { id:  5, codigo: 'MC-003', nombre: 'Montacargas Toyota 8FGCU25',    tipo: 'Montacargas',    estado: 'EN_MANTENIMIENTO',  criticidad: 'ALTA',    ubicacion: 'Bodega Cali',   odometro: '6,540 hrs',  ultimoPM: '45 días' },
  { id:  6, codigo: 'MC-004', nombre: 'Reach Truck Crown RR5200',      tipo: 'Montacargas',    estado: 'FUERA_DE_SERVICIO', criticidad: 'MEDIA',   ubicacion: 'Bodega Bogotá', odometro: '4,100 hrs',  ultimoPM: '60 días' },
  { id:  7, codigo: 'BD-01',  nombre: 'Bodega Principal Bogotá',       tipo: 'Infraestructura', estado: 'OPERATIVO',        criticidad: 'ALTA',    ubicacion: 'Bogotá DC',     odometro: '—',          ultimoPM: '90 días' },
  { id:  8, codigo: 'CF-001', nombre: 'Cuarto Frío #1',                tipo: 'Infraestructura', estado: 'OPERATIVO',        criticidad: 'CRITICA', ubicacion: 'Bogotá DC',     odometro: '—',          ultimoPM: '15 días' },
  { id:  9, codigo: 'BD-02',  nombre: 'Plataforma Medellín',           tipo: 'Infraestructura', estado: 'OPERATIVO',        criticidad: 'MEDIA',   ubicacion: 'Medellín',      odometro: '—',          ultimoPM: '45 días' },
  { id: 10, codigo: 'CMP-07', nombre: 'Compresor Atlas Copco GA22',    tipo: 'Equipo',         estado: 'EN_MANTENIMIENTO',  criticidad: 'ALTA',    ubicacion: 'Bogotá DC',     odometro: '12,400 hrs', ultimoPM:  '5 días' },
  { id: 11, codigo: 'SRV-01', nombre: 'Servidor Dell PowerEdge R740',  tipo: 'Equipo',         estado: 'OPERATIVO',         criticidad: 'CRITICA', ubicacion: 'Data Center',   odometro: '—',          ultimoPM: '35 días' },
  { id: 12, codigo: 'ELV-02', nombre: 'Estibador Eléctrico Still EXU', tipo: 'Equipo',         estado: 'OPERATIVO',         criticidad: 'BAJA',    ubicacion: 'Bodega Cali',   odometro: '2,850 hrs',  ultimoPM: '12 días' },
]

const OT_HISTORIAL: OTHistorial[] = [
  { numero: 'OT-2024-0891', tipo: 'PREVENTIVA',  descripcion: 'Cambio de aceite y filtros',          fecha: '15/01/2025', costo: '$850,000',   estado: 'COMPLETADA' },
  { numero: 'OT-2024-0754', tipo: 'CORRECTIVA',  descripcion: 'Reparación sistema de frenos',         fecha: '28/11/2024', costo: '$2,400,000', estado: 'COMPLETADA' },
  { numero: 'OT-2024-0612', tipo: 'PREVENTIVA',  descripcion: 'Revisión 50,000 km',                  fecha: '10/10/2024', costo: '$1,200,000', estado: 'COMPLETADA' },
  { numero: 'OT-2024-0501', tipo: 'PREDICTIVA',  descripcion: 'Análisis de vibraciones',             fecha: '05/09/2024', costo: '$320,000',   estado: 'COMPLETADA' },
  { numero: 'OT-2024-0423', tipo: 'CORRECTIVA',  descripcion: 'Cambio de neumático posterior derecho', fecha: '12/08/2024', costo: '$780,000',  estado: 'COMPLETADA' },
]

const COMPONENTES: Componente[] = [
  { nombre: 'Motor Cummins ISX15',    estado: 'BUENO'   },
  { nombre: 'Caja de velocidades',    estado: 'REGULAR' },
  { nombre: 'Sistema de frenos ABS',  estado: 'BUENO'   },
  { nombre: 'Dirección hidráulica',   estado: 'CRITICO' },
]

const TREE_DATA: TreeNode[] = [
  {
    id: 'node-cd-bta', label: 'Centro de Distribución Bogotá',
    children: [
      {
        id: 'node-cf1', label: 'Cuarto Frío #1',
        children: [
          {
            id: 'node-refrig', label: 'Sistema de Refrigeración',
            children: [
              { id: 'node-cf001', label: 'Compresor CF-001' },
              { id: 'node-ev001', label: 'Evaporador EV-001' },
            ],
          },
        ],
      },
      { id: 'node-mc001', label: 'Montacargas MC-001' },
      { id: 'node-bodega', label: 'Bodega Principal' },
    ],
  },
  {
    id: 'node-flota', label: 'Flota Vehicular',
    children: [
      { id: 'node-vh001', label: 'Camión VH-001' },
      { id: 'node-vh002', label: 'Camión VH-002' },
      { id: 'node-vh010', label: 'Tractocamión VH-010' },
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
  'Vehículo':       <VehiculoIcon sx={{ fontSize: 14 }} />,
  'Montacargas':    <MontacargasIcon sx={{ fontSize: 14 }} />,
  'Infraestructura': <InfraIcon sx={{ fontSize: 14 }} />,
  'Equipo':         <EquipoIcon sx={{ fontSize: 14 }} />,
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

// ─── Tree node component ──────────────────────────────────────────────────────

function TreeNodeItem({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode
  depth: number
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expanded[node.id] ?? false

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        onClick={() => hasChildren && onToggle(node.id)}
        sx={{
          pl: depth * 2.5,
          py: 0.75,
          borderRadius: '8px',
          cursor: hasChildren ? 'pointer' : 'default',
          '&:hover': hasChildren ? { bgcolor: alpha(EAM_COLOR, 0.07) } : {},
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
            bgcolor: hasChildren ? EAM_COLOR : 'rgba(255,255,255,0.3)',
            flexShrink: 0,
          }}
        />
        <Typography
          fontSize={13}
          fontWeight={hasChildren ? 600 : 400}
          color={hasChildren ? '#fff' : 'rgba(255,255,255,0.7)'}
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
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMActivos() {
  const [tab, setTab] = useState(0)

  // Portafolio filters
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterCriticidad, setFilterCriticidad] = useState('Todos')

  // Jerarquía expanded state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'node-cd-bta': true,
    'node-flota': true,
  })

  const handleToggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filtered = ACTIVOS_MOCK.filter((a) => {
    if (filterTipo !== 'Todos' && a.tipo !== filterTipo) return false
    if (filterEstado !== 'Todos' && a.estado !== filterEstado) return false
    if (filterCriticidad !== 'Todos' && a.criticidad !== filterCriticidad) return false
    return true
  })

  // ── KPI tiles for Vista 360° ──
  const kpis360 = [
    { label: 'Odómetro',       value: '124,500 km', color: '#3B82F6' },
    { label: 'Horómetro',      value: '8,230 hrs',  color: '#8B5CF6' },
    { label: 'Último PM',      value: 'hace 22 días', color: '#F59E0B' },
    { label: 'Próx PM',        value: 'en 8 días',  color: EAM_COLOR },
    { label: 'Costo total',    value: '$28.4M',     color: EAM_DARK  },
    { label: 'MTBF',           value: '412 hrs',    color: '#06B6D4' },
    { label: 'MTTR',           value: '3.8 hrs',    color: '#0EA5E9' },
    { label: 'Disponibilidad', value: '96.1%',      color: '#16A34A' },
  ]

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
            <Typography fontSize={13} color="rgba(255,255,255,0.45)">
              Portafolio, Vista 360° y Jerarquía de activos
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
          <Tab label="Vista 360°" />
          <Tab label="Jerarquía" />
        </Tabs>

        {/* ── Tab 0: Portafolio ── */}
        {tab === 0 && (
          <Box>
            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                select size="small" label="Tipo de activo" value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { }, '& label': { color: 'text.secondary' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' } }}
                inputProps={{ style: { color: 'text.primary' } }}
              >
                {['Todos', 'Vehículo', 'Montacargas', 'Infraestructura', 'Equipo'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Estado" value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { }, '& label': { color: 'text.secondary' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' } }}
                inputProps={{ style: { color: 'text.primary' } }}
              >
                {['Todos', 'OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Criticidad" value={filterCriticidad}
                onChange={(e) => setFilterCriticidad(e.target.value)}
                sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { }, '& label': { color: 'text.secondary' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' } }}
                inputProps={{ style: { color: 'text.primary' } }}
              >
                {['Todos', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* Table */}
            <Paper
              elevation={0}
              sx={{
                bgcolor: '#FFFFFF',
                border: `1px solid rgba(50,172,92,0.25)`,
                borderRadius: '14px',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 120px 140px 110px 1fr 130px 110px',
                  gap: 1,
                  px: 2, py: 1.25,
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  bgcolor: alpha(EAM_COLOR, 0.06),
                }}
              >
                {['Código', 'Nombre', 'Tipo', 'Estado', 'Criticidad', 'Ubicación', 'Odóm./Horám.', 'Último PM'].map((h) => (
                  <Typography key={h} fontSize={11} fontWeight={700} color="rgba(255,255,255,0.4)" letterSpacing="0.5px">
                    {h.toUpperCase()}
                  </Typography>
                ))}
              </Box>

              {filtered.map((activo, idx) => (
                <Box
                  key={activo.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 120px 140px 110px 1fr 130px 110px',
                    gap: 1,
                    px: 2, py: 1.25,
                    borderBottom: idx < filtered.length - 1
                      ? '1px solid rgba(255,255,255,0.04)'
                      : 'none',
                    alignItems: 'center',
                    '&:hover': { bgcolor: alpha(EAM_COLOR, 0.04) },
                  }}
                >
                  <Typography fontSize={12} fontWeight={700} color={EAM_COLOR}>
                    {activo.codigo}
                  </Typography>
                  <Typography fontSize={12} color="rgba(255,255,255,0.85)" noWrap>
                    {activo.nombre}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box sx={{ color: 'text.secondary' }}>{TIPO_ICON[activo.tipo]}</Box>
                    <Typography fontSize={11} color="rgba(255,255,255,0.6)">{activo.tipo}</Typography>
                  </Stack>
                  <Chip
                    label={activo.estado.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      bgcolor: alpha(ESTADO_COLOR[activo.estado], 0.15),
                      color: ESTADO_COLOR[activo.estado],
                      fontWeight: 700,
                      fontSize: 9,
                      height: 20,
                    }}
                  />
                  <Chip
                    label={activo.criticidad}
                    size="small"
                    sx={{
                      bgcolor: alpha(CRITICIDAD_COLOR[activo.criticidad], 0.15),
                      color: CRITICIDAD_COLOR[activo.criticidad],
                      fontWeight: 700,
                      fontSize: 9,
                      height: 20,
                    }}
                  />
                  <Typography fontSize={12} color="rgba(255,255,255,0.6)" noWrap>
                    {activo.ubicacion}
                  </Typography>
                  <Typography fontSize={12} color="rgba(255,255,255,0.65)">
                    {activo.odometro}
                  </Typography>
                  <Typography fontSize={12} color="rgba(255,255,255,0.65)">
                    {activo.ultimoPM}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Box>
        )}

        {/* ── Tab 1: Vista 360° ── */}
        {tab === 1 && (
          <Box>
            {/* Asset header */}
            <Paper
              elevation={0}
              sx={{
                bgcolor: '#FFFFFF',
                border: `1px solid rgba(50,172,92,0.25)`,
                borderRadius: '14px',
                p: 2.5,
                mb: 2,
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
                <Box>
                  <Typography fontSize={11} fontWeight={700} color="rgba(255,255,255,0.4)" letterSpacing="0.5px" mb={0.5}>
                    VH-001
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="text.primary">
                    Tractocamión Kenworth T800
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Chip
                      label="OPERATIVO"
                      size="small"
                      sx={{ bgcolor: alpha('#16A34A', 0.15), color: '#16A34A', fontWeight: 700, fontSize: 10 }}
                    />
                    <Chip
                      label="CRITICA"
                      size="small"
                      sx={{ bgcolor: alpha('#DC2626', 0.15), color: '#DC2626', fontWeight: 700, fontSize: 10 }}
                    />
                  </Stack>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<OTIcon />}
                  size="small"
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700 }}
                >
                  Ver OTs
                </Button>
              </Stack>
            </Paper>

            {/* KPI grid */}
            <Grid container spacing={2} mb={2}>
              {kpis360.map((k) => (
                <Grid key={k.label} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: '#FFFFFF',
                      border: `1px solid rgba(50,172,92,0.25)`,
                      borderRadius: '12px',
                      p: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography fontSize={22} fontWeight={900} color={k.color} lineHeight={1}>
                      {k.value}
                    </Typography>
                    <Typography fontSize={11} color="rgba(255,255,255,0.45)" mt={0.5}>
                      {k.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              {/* Historial de OTs */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Paper
                  elevation={0}
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: `1px solid rgba(50,172,92,0.25)`,
                    borderRadius: '14px',
                    p: 2.5,
                  }}
                >
                  <Typography fontWeight={700} fontSize={14} color="text.primary" mb={2}>
                    Historial de OTs (últimas 5)
                  </Typography>
                  <Stack spacing={1}>
                    {OT_HISTORIAL.map((ot) => (
                      <Box
                        key={ot.numero}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.25,
                          borderRadius: '10px',
                          bgcolor: 'text.disabled',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <Box flex={1} minWidth={0}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                            <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>
                              {ot.numero}
                            </Typography>
                            <Chip
                              label={ot.tipo}
                              size="small"
                              sx={{
                                bgcolor: alpha(OT_TIPO_COLOR[ot.tipo] ?? '#6B7280', 0.15),
                                color: OT_TIPO_COLOR[ot.tipo] ?? '#6B7280',
                                fontWeight: 700,
                                fontSize: 9,
                                height: 18,
                              }}
                            />
                          </Stack>
                          <Typography fontSize={12} color="rgba(255,255,255,0.7)" noWrap>
                            {ot.descripcion}
                          </Typography>
                        </Box>
                        <Box textAlign="right" flexShrink={0}>
                          <Typography fontSize={11} fontWeight={700} color="#16A34A">
                            {ot.costo}
                          </Typography>
                          <Typography fontSize={10} color="rgba(255,255,255,0.4)">
                            {ot.fecha}
                          </Typography>
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
                    sx={{
                      bgcolor: '#FFFFFF',
                      border: `1px solid rgba(50,172,92,0.25)`,
                      borderRadius: '14px',
                      p: 2.5,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <ComponenteIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                      <Typography fontWeight={700} fontSize={14} color="text.primary">
                        Componentes críticos
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {COMPONENTES.map((c) => (
                        <Stack key={c.nombre} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontSize={12} color="rgba(255,255,255,0.75)">{c.nombre}</Typography>
                          <Chip
                            label={c.estado}
                            size="small"
                            sx={{
                              bgcolor: alpha(COMP_COLOR[c.estado], 0.15),
                              color: COMP_COLOR[c.estado],
                              fontWeight: 700,
                              fontSize: 9,
                              height: 20,
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: '#FFFFFF',
                      border: `1px solid rgba(50,172,92,0.25)`,
                      borderRadius: '14px',
                      p: 2.5,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <DocIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                      <Typography fontWeight={700} fontSize={14} color="text.primary">
                        Documentos del activo
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {[
                        { label: 'SOAT vigente',                  color: '#16A34A' },
                        { label: 'Tecno-mecánica vence 15 días',  color: '#F59E0B' },
                        { label: 'Manual disponible',             color: '#3B82F6' },
                      ].map((doc) => (
                        <Chip
                          key={doc.label}
                          label={doc.label}
                          size="small"
                          sx={{
                            bgcolor: alpha(doc.color, 0.15),
                            color: doc.color,
                            fontWeight: 600,
                            fontSize: 11,
                            border: `1px solid ${alpha(doc.color, 0.3)}`,
                          }}
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 2: Jerarquía ── */}
        {tab === 2 && (
          <Paper
            elevation={0}
            sx={{
              bgcolor: '#FFFFFF',
              border: `1px solid rgba(50,172,92,0.25)`,
              borderRadius: '14px',
              p: 2.5,
            }}
          >
            <Typography fontWeight={700} fontSize={14} color="text.primary" mb={2}>
              Jerarquía de activos
            </Typography>
            <Stack spacing={0.25}>
              {TREE_DATA.map((node) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={handleToggle}
                />
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    </Layout>
  )
}
