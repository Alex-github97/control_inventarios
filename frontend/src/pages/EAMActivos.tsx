import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Chip, Button, Tab, Tabs,
  MenuItem, TextField, alpha, InputAdornment, Divider,
  IconButton, Menu, ListItemIcon, ListItemText, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'
import {
  DirectionsCar as VehiculoIcon,
  PrecisionManufacturing as MontacargasIcon,
  Business as InfraIcon,
  Memory as EquipoIcon,
  ExpandMore as ExpandIcon,
  ChevronRight as CollapseIcon,
  Handyman as OTIcon,
  Build as ComponenteIcon,
  Search as SearchIcon,
  ArrowBack as BackIcon,
  Speed as MetricIcon,
  Place as PlaceIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  DeleteForever as DeleteIcon,
  TireRepair as LlantaIcon,
  Visibility as VerIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import {
  SelectorCatalogoVehiculo, SELECCION_VEHICULO_VACIA,
} from '@/components/SelectorCatalogoVehiculo'
import type {
  SeleccionVehiculo, CombustibleActivo,
} from '@/components/SelectorCatalogoVehiculo'
import { SelectorCatalogoGeneral } from '@/components/SelectorCatalogoGeneral'
import { VehiculosCombinados } from '@/components/VehiculosCombinados'

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoActivo = 'Vehículo' | 'Montacargas' | 'Infraestructura' | 'Equipo'

// Activo tal como lo devuelve el backend (/eam/activos)
export interface ActivoAPI {
  id: number
  codigo: string
  nombre: string
  tipo_activo?: string | null
  estado?: string | null
  criticidad?: string | null
  marca?: string | null
  linea?: string | null
  modelo?: string | null
  anio?: number | null
  numero_serie?: string | null
  numero_motor?: string | null
  numero_chasis?: string | null
  numero_carroceria?: string | null
  observaciones?: string | null
  observaciones_adicionales?: string | null
  cuenta_contable?: string | null
  centro_costo?: string | null
  placa?: string | null
  ubicacion?: string | null
  sede?: string | null
  area?: string | null
  responsable?: string | null
  odometro_actual?: number | null
  horometro_actual?: number | null
  fecha_adquisicion?: string | null
  costo_adquisicion?: number | null
  vida_util_anios?: number | null
  tipo_combustible?: string | null
  numero_ejes?: number | null
  origen?: string | null
  activo?: boolean
}

interface TreeNode {
  id: string
  label: string
  codigo?: string
  children?: TreeNode[]
}

interface TipoActivoCat { id: number; codigo: string; nombre: string; usa_llantas: boolean }
interface ComponenteAPI { id: number; nombre: string; estado?: string | null; marca?: string | null; numero_parte?: string | null }
interface OTAPI { id: number; numero?: string | null; tipo_ot?: string | null; descripcion?: string | null; estado?: string | null; fecha_creacion?: string | null; costo_total?: number | null }

// Familia visual (iconos y agrupación) a partir del código de tipo del catálogo.
const FAMILIA_POR_TIPO: Record<string, TipoActivo> = {
  VEHICULO: 'Vehículo', REMOLQUE: 'Vehículo', MOTOCICLETA: 'Vehículo',
  MONTACARGAS: 'Montacargas', EQUIPO_PATIO: 'Montacargas',
  INFRAESTRUCTURA: 'Infraestructura', BODEGA: 'Infraestructura', EDIFICACION: 'Infraestructura',
}
const familiaDe = (codigo?: string | null): TipoActivo => FAMILIA_POR_TIPO[codigo ?? ''] ?? 'Equipo'

const ESTADOS_ACTIVO = ['OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO', 'DADO_DE_BAJA', 'STANDBY', 'EN_GARANTIA']
const CRITICIDADES = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']

const EMPTY_ACTIVO = {
  codigo: '', nombre: '', tipo_activo: 'VEHICULO', estado: 'OPERATIVO', criticidad: 'MEDIA',
  anio: '', placa: '',
  numero_motor: '', numero_chasis: '', numero_carroceria: '',
  ubicacion: '', sede: '', area: '', responsable: '',
  cuenta_contable: '', centro_costo: '',
  odometro_actual: '', horometro_actual: '', fecha_adquisicion: '', costo_adquisicion: '',
  vida_util_anios: '', tipo_combustible: '',
  observaciones: '', observaciones_adicionales: '',
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
  DADO_DE_BAJA:      '#6B7280',
  STANDBY:           '#F59E0B',
  EN_GARANTIA:       '#3B82F6',
}
const colorEstado = (e?: string | null) => ESTADO_COLOR[e ?? ''] ?? '#6B7280'

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

function Vista360({ activo, onBack, onVerOTs, onEditar, nombreTipo }: {
  activo: ActivoAPI | null
  onBack: () => void
  onVerOTs: (a: ActivoAPI) => void
  onEditar: (a: ActivoAPI) => void
  nombreTipo: (c?: string | null) => string
}) {
  // Datos reales del activo: componentes registrados y órdenes de trabajo.
  const { data: componentes = [] } = useQuery<ComponenteAPI[]>({
    queryKey: ['eam-activo-componentes', activo?.id],
    queryFn: () => apiClient.get(`/eam/activos/${activo!.id}/componentes`).then(r => r.data),
    enabled: !!activo,
  })
  const { data: ots = [] } = useQuery<OTAPI[]>({
    queryKey: ['eam-activo-ots', activo?.id],
    queryFn: () => apiClient.get('/eam/ots', { params: { activo_id: activo!.id } }).then(r => r.data),
    enabled: !!activo,
  })

  if (!activo) {
    return (
      <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 4, textAlign: 'center' }}>
        <Typography fontSize={13} color="#94A3B8" mb={2}>Selecciona un activo en el Portafolio para ver su hoja de vida.</Typography>
        <Button onClick={onBack} startIcon={<BackIcon />} sx={{ textTransform: 'none', color: EAM_COLOR }}>Ir al Portafolio</Button>
      </Paper>
    )
  }

  const costoOTs = ots.reduce((s, o) => s + (o.costo_total ?? 0), 0)
  const otsAbiertas = ots.filter(o => !['CERRADA', 'CANCELADA'].includes(o.estado ?? '')).length
  const medidor = activo.odometro_actual
    ? { label: 'Odómetro', value: `${activo.odometro_actual.toLocaleString('es-CO')} km` }
    : activo.horometro_actual
      ? { label: 'Horómetro', value: `${activo.horometro_actual.toLocaleString('es-CO')} hrs` }
      : { label: 'Medidor', value: '—' }

  const kpis = [
    { label: medidor.label,      value: medidor.value, color: '#3B82F6' },
    { label: 'Antigüedad',       value: activo.anio ? `${new Date().getFullYear() - activo.anio} años` : '—', color: '#F59E0B' },
    { label: 'OTs registradas',  value: String(ots.length), color: '#8B5CF6' },
    { label: 'OTs abiertas',     value: String(otsAbiertas), color: otsAbiertas ? '#DC2626' : '#16A34A' },
    { label: 'Costo en OTs',     value: costoOTs ? formatCOP(costoOTs) : '—', color: EAM_DARK },
    { label: 'Componentes',      value: String(componentes.length), color: '#06B6D4' },
    { label: 'Valor de compra',  value: activo.costo_adquisicion ? formatCOP(activo.costo_adquisicion) : '—', color: '#0EA5E9' },
    { label: 'Vida útil',        value: activo.vida_util_anios ? `${activo.vida_util_anios} años` : '—', color: '#64748B' },
  ]

  const ficha = [
    { label: 'Marca',            value: activo.marca ?? '—' },
    { label: 'Línea',            value: activo.linea ?? '—' },
    { label: 'Modelo',           value: activo.modelo ?? '—' },
    { label: 'Año',              value: activo.anio ? String(activo.anio) : '—' },
    { label: 'Placa',            value: activo.placa ?? '—' },
    { label: 'N.º de motor',     value: activo.numero_motor ?? activo.numero_serie ?? '—' },
    { label: 'N.º de chasis',    value: activo.numero_chasis ?? '—' },
    { label: 'N.º de carrocería', value: activo.numero_carroceria ?? '—' },
    { label: 'Ubicación',        value: activo.ubicacion ?? '—' },
    { label: 'Sede / Área',      value: [activo.sede, activo.area].filter(Boolean).join(' · ') || '—' },
    { label: 'Responsable',      value: activo.responsable ?? '—' },
    { label: 'Cuenta contable',  value: activo.cuenta_contable ?? '—' },
    { label: 'Centro de costo',  value: activo.centro_costo ?? '—' },
    { label: 'Fecha adquisición', value: activo.fecha_adquisicion ?? '—' },
    { label: 'Combustible',      value: activo.tipo_combustible ?? '—' },
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
            <Box sx={{ color: EAM_COLOR }}>{TIPO_ICON[familiaDe(activo.tipo_activo)]}</Box>
            <Box>
              <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px">
                {activo.codigo} · {nombreTipo(activo.tipo_activo)}
              </Typography>
              <Typography variant="h6" fontWeight={800} color="text.primary">
                {activo.nombre}
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip
                  label={(activo.estado ?? '—').replace(/_/g, ' ')}
                  size="small"
                  sx={{ bgcolor: alpha(colorEstado(activo.estado), 0.15), color: colorEstado(activo.estado), fontWeight: 700, fontSize: 10 }}
                />
                <Chip
                  label={activo.criticidad ?? '—'}
                  size="small"
                  sx={{ bgcolor: alpha(CRITICIDAD_COLOR[activo.criticidad ?? ''] ?? '#6B7280', 0.15), color: CRITICIDAD_COLOR[activo.criticidad ?? ''] ?? '#6B7280', fontWeight: 700, fontSize: 10 }}
                />
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined" startIcon={<EditIcon />} size="small"
              onClick={() => onEditar(activo)}
              sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
            >
              Editar
            </Button>
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
                Historial de OTs ({ots.length})
              </Typography>
              {costoOTs > 0 && (
                <Typography fontSize={12} fontWeight={700} color="#16A34A">{formatCOP(costoOTs)}</Typography>
              )}
            </Stack>
            <Stack spacing={1}>
              {ots.map((ot) => (
                <Box
                  key={ot.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB' }}
                >
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                      <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>{ot.numero ?? `OT-${ot.id}`}</Typography>
                      {ot.tipo_ot && (
                        <Chip
                          label={ot.tipo_ot}
                          size="small"
                          sx={{ bgcolor: alpha(OT_TIPO_COLOR[ot.tipo_ot] ?? '#6B7280', 0.15), color: OT_TIPO_COLOR[ot.tipo_ot] ?? '#6B7280', fontWeight: 700, fontSize: 9, height: 18 }}
                        />
                      )}
                      {ot.estado && (
                        <Chip label={ot.estado} size="small" sx={{ bgcolor: '#E2E8F0', color: '#475569', fontWeight: 700, fontSize: 9, height: 18 }} />
                      )}
                    </Stack>
                    <Typography fontSize={12} color="#64748B" noWrap>{ot.descripcion ?? '—'}</Typography>
                  </Box>
                  <Box textAlign="right" flexShrink={0}>
                    {ot.costo_total != null && <Typography fontSize={11} fontWeight={700} color="#16A34A">{formatCOP(ot.costo_total)}</Typography>}
                    <Typography fontSize={10} color="#64748B">{ot.fecha_creacion ? new Date(ot.fecha_creacion).toLocaleDateString('es-CO') : '—'}</Typography>
                  </Box>
                </Box>
              ))}
              {ots.length === 0 && (
                <Typography fontSize={12.5} color="#94A3B8" textAlign="center" py={3}>
                  Este activo aún no tiene órdenes de trabajo registradas.
                </Typography>
              )}
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
                  <Stack key={c.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Box minWidth={0}>
                      <Typography fontSize={12} color="#64748B" noWrap>{c.nombre}</Typography>
                      {(c.marca || c.numero_parte) && (
                        <Typography fontSize={10} color="#94A3B8" noWrap>{[c.marca, c.numero_parte].filter(Boolean).join(' · ')}</Typography>
                      )}
                    </Box>
                    <Chip
                      label={c.estado ?? '—'}
                      size="small"
                      sx={{ bgcolor: alpha(COMP_COLOR[c.estado ?? ''] ?? '#6B7280', 0.15), color: COMP_COLOR[c.estado ?? ''] ?? '#6B7280', fontWeight: 700, fontSize: 9, height: 20 }}
                    />
                  </Stack>
                ))}
                {componentes.length === 0 && (
                  <Typography fontSize={12} color="#94A3B8" textAlign="center" py={2}>
                    Sin componentes registrados para este activo.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── Diálogo crear / editar activo ────────────────────────────────────────────
// Componente propio con estado local: escribir aquí no re-renderiza la tabla.
function ActivoDialog({
  open, onClose, editando, tipos, onSubmit, isPending,
}: {
  open: boolean
  onClose: () => void
  editando: ActivoAPI | null
  tipos: TipoActivoCat[]
  onSubmit: (payload: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_ACTIVO })
  // Marca, línea y modelo viven en el selector de catálogo, no en el formulario:
  // son una jerarquía encadenada y elegir un nivel invalida los de abajo.
  const [cat, setCat] = useState<SeleccionVehiculo>({ ...SELECCION_VEHICULO_VACIA })
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    // Al editar solo se conservan los nombres: los ids se resuelven cuando el
    // usuario vuelve a tocar la cascada, y mientras tanto se muestran tal cual.
    setCat({
      ...SELECCION_VEHICULO_VACIA,
      marca: editando?.marca ?? '', linea: editando?.linea ?? '',
      modelo: editando?.modelo ?? '',
    })
    setForm(editando ? {
      codigo: editando.codigo ?? '', nombre: editando.nombre ?? '',
      tipo_activo: editando.tipo_activo ?? 'VEHICULO', estado: editando.estado ?? 'OPERATIVO',
      criticidad: editando.criticidad ?? 'MEDIA',
      anio: editando.anio != null ? String(editando.anio) : '',
      numero_motor: editando.numero_motor ?? '',
      numero_chasis: editando.numero_chasis ?? '',
      numero_carroceria: editando.numero_carroceria ?? '',
      placa: editando.placa ?? '', ubicacion: editando.ubicacion ?? '', sede: editando.sede ?? '',
      area: editando.area ?? '', responsable: editando.responsable ?? '',
      cuenta_contable: editando.cuenta_contable ?? '',
      centro_costo: editando.centro_costo ?? '',
      observaciones: editando.observaciones ?? '',
      observaciones_adicionales: editando.observaciones_adicionales ?? '',
      odometro_actual: editando.odometro_actual != null ? String(editando.odometro_actual) : '',
      horometro_actual: editando.horometro_actual != null ? String(editando.horometro_actual) : '',
      fecha_adquisicion: editando.fecha_adquisicion ?? '',
      costo_adquisicion: editando.costo_adquisicion != null ? String(editando.costo_adquisicion) : '',
      vida_util_anios: editando.vida_util_anios != null ? String(editando.vida_util_anios) : '',
      tipo_combustible: editando.tipo_combustible ?? '',
    } : { ...EMPTY_ACTIVO })
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const set = (k: keyof typeof EMPTY_ACTIVO) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
  const txt = (v: string) => (v.trim() === '' ? undefined : v.trim())
  const usaLlantas = tipos.find(t => t.codigo === form.tipo_activo)?.usa_llantas ?? false

  // El combustible también sale de catálogo: escribirlo a mano dejaba "Diesel",
  // "DIESEL" y "Diésel" como tres valores distintos en los reportes.
  const { data: combustibles = [] } = useQuery<CombustibleActivo[]>({
    queryKey: ['eam-cat-veh-combustibles'],
    queryFn: () => apiClient.get('/eam/catalogo-vehiculos/combustibles',
      { params: { solo_activos: true } }).then(r => r.data),
    enabled: open,
  })

  /** El modelo del catálogo manda sobre lo que el usuario no haya tocado. */
  const combustibleEfectivo = form.tipo_combustible || cat.tipo_combustible || ''
  const vidaUtilEfectiva = form.vida_util_anios
    || (cat.vida_util_anios != null ? String(cat.vida_util_anios) : '')

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
        {editando ? `Editar activo · ${editando.codigo}` : 'Crear activo'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 0.5 }}>
          <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em">IDENTIFICACIÓN</Typography></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Código *" size="small" fullWidth value={form.codigo} onChange={set('codigo')} disabled={!!editando} helperText={editando ? 'El código no se cambia' : undefined} /></Grid>
          <Grid size={{ xs: 12, sm: 8 }}><TextField label="Nombre / descripción *" size="small" fullWidth value={form.nombre} onChange={set('nombre')} /></Grid>
          <Grid size={{ xs: 12, sm: editando ? 4 : 6 }}>
            <TextField select label="Tipo de activo *" size="small" fullWidth value={form.tipo_activo} onChange={set('tipo_activo')}>
              {(tipos.length ? tipos : [{ codigo: 'VEHICULO', nombre: 'Vehículo' } as TipoActivoCat]).map(t => (
                <MenuItem key={t.codigo} value={t.codigo}>{t.nombre}</MenuItem>
              ))}
            </TextField>
          </Grid>
          {/* Estado y criticidad solo al editar: un activo que se registra entra
              nuevo y operativo, así que preguntarlo al crear es una decisión que
              nadie tiene que tomar todavía. Se cambian después, cuando el activo
              sale de servicio o se reclasifica. */}
          {editando && (
            <>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Estado" size="small" fullWidth value={form.estado} onChange={set('estado')}>
                  {ESTADOS_ACTIVO.map(e => <MenuItem key={e} value={e}>{e.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Criticidad" size="small" fullWidth value={form.criticidad} onChange={set('criticidad')}>
                  {CRITICIDADES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
            </>
          )}

          <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={1}>FICHA TÉCNICA</Typography></Grid>
          {/* Jerarquía del catálogo: marca → línea → modelo. El modelo trae la
              ficha técnica, así que motor, combustible y ejes no se digitan. */}
          <Grid size={{ xs: 12 }}>
            <SelectorCatalogoVehiculo
              tipoActivo={form.tipo_activo}
              valor={cat}
              onChange={setCat}
              color={EAM_COLOR}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Año" type="number" size="small" fullWidth value={form.anio} onChange={set('anio')} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Placa" size="small" fullWidth value={form.placa} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} /></Grid>
          {/* Un vehiculo se identifica por tres numeros distintos, no por uno
              solo: el motor, el chasis y la carroceria se cambian por separado
              y cada uno aparece en documentos diferentes. */}
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Número de motor" size="small" fullWidth value={form.numero_motor} onChange={set('numero_motor')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Número de chasis" size="small" fullWidth value={form.numero_chasis} onChange={set('numero_chasis')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Número de carrocería" size="small" fullWidth value={form.numero_carroceria} onChange={set('numero_carroceria')} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select label="Tipo de combustible" size="small" fullWidth
              value={combustibleEfectivo}
              onChange={e => setForm(f => ({ ...f, tipo_combustible: e.target.value }))}
              helperText={!form.tipo_combustible && cat.tipo_combustible
                ? 'Viene del modelo elegido' : undefined}
            >
              <MenuItem value="">Sin especificar</MenuItem>
              {combustibles.map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Vida útil (años)" type="number" size="small" fullWidth
              value={vidaUtilEfectiva}
              onChange={e => setForm(f => ({ ...f, vida_util_anios: e.target.value }))}
              helperText={!form.vida_util_anios && cat.vida_util_anios != null
                ? 'Viene del modelo elegido' : undefined}
            />
          </Grid>

          <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={1}>UBICACIÓN Y RESPONSABLE</Typography></Grid>
          {/* De catálogo y no texto libre: escritos a mano, "Bodega Norte",
              "bodega norte" y "Bod. Norte" cuentan como tres ubicaciones y
              ningún reporte por sede o área cuadra. */}
          <Grid size={{ xs: 12, sm: 3 }}>
            <SelectorCatalogoGeneral tipo="SEDE" label="Sede"
              valor={form.sede} onChange={v => setForm(f => ({ ...f, sede: v }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <SelectorCatalogoGeneral tipo="AREA" label="Área"
              valor={form.area} onChange={v => setForm(f => ({ ...f, area: v }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <SelectorCatalogoGeneral tipo="UBICACION" label="Ubicación"
              valor={form.ubicacion} onChange={v => setForm(f => ({ ...f, ubicacion: v }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <SelectorCatalogoGeneral tipo="RESPONSABLE" label="Responsable"
              valor={form.responsable} onChange={v => setForm(f => ({ ...f, responsable: v }))} />
          </Grid>

          <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={1}>MEDIDORES Y COMPRA</Typography></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Odómetro (km)" type="number" size="small" fullWidth value={form.odometro_actual} onChange={set('odometro_actual')} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Horómetro (hrs)" type="number" size="small" fullWidth value={form.horometro_actual} onChange={set('horometro_actual')} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Fecha de adquisición" type="date" size="small" fullWidth value={form.fecha_adquisicion} onChange={set('fecha_adquisicion')} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Costo de adquisición" type="number" size="small" fullWidth value={form.costo_adquisicion} onChange={set('costo_adquisicion')} /></Grid>

          <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={1}>CONTABILIDAD</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectorCatalogoGeneral tipo="CUENTA_CONTABLE" label="Cuenta contable"
              valor={form.cuenta_contable} onChange={v => setForm(f => ({ ...f, cuenta_contable: v }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectorCatalogoGeneral tipo="CENTRO_COSTO" label="Centro de costo"
              valor={form.centro_costo} onChange={v => setForm(f => ({ ...f, centro_costo: v }))} />
          </Grid>

          <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={1}>OBSERVACIONES</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Observaciones" size="small" fullWidth multiline rows={3}
              value={form.observaciones} onChange={set('observaciones')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Observaciones adicionales" size="small" fullWidth multiline rows={3}
              value={form.observaciones_adicionales} onChange={set('observaciones_adicionales')} />
          </Grid>

          {usaLlantas && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                Este tipo de activo usa llantas. La configuración de ejes se asigna después con una
                categoría ya creada, desde la acción <b>“Ejes y llantas”</b> de la fila o desde el módulo de Neumáticos.
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!form.codigo.trim() || !form.nombre.trim() || isPending}
          onClick={() => onSubmit({
            codigo: form.codigo.trim(), nombre: form.nombre.trim(),
            tipo_activo: form.tipo_activo, estado: form.estado, criticidad: form.criticidad,
            // La jerarquía sale del selector de catálogo; el backend la valida
            // y devuelve error si la combinación no existe.
            marca: txt(cat.marca), linea: txt(cat.linea), modelo: txt(cat.modelo),
            anio: num(form.anio),
            placa: txt(form.placa),
            numero_motor: txt(form.numero_motor),
            numero_chasis: txt(form.numero_chasis),
            numero_carroceria: txt(form.numero_carroceria),
            ubicacion: txt(form.ubicacion), sede: txt(form.sede), area: txt(form.area),
            responsable: txt(form.responsable),
            cuenta_contable: txt(form.cuenta_contable), centro_costo: txt(form.centro_costo),
            observaciones: txt(form.observaciones),
            observaciones_adicionales: txt(form.observaciones_adicionales),
            odometro_actual: num(form.odometro_actual), horometro_actual: num(form.horometro_actual),
            fecha_adquisicion: txt(form.fecha_adquisicion), costo_adquisicion: num(form.costo_adquisicion),
            vida_util_anios: num(vidaUtilEfectiva), tipo_combustible: txt(combustibleEfectivo),
            // Ficha técnica heredada del modelo del catálogo
            motor_marca: cat.motor_marca ?? undefined,
            motor_linea: cat.motor_linea ?? undefined,
            numero_ejes: cat.numero_ejes ?? undefined,
            capacidad_combustible: cat.capacidad_combustible ?? undefined,
            vida_util_km: cat.vida_util_km ?? undefined,
          })}
          sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700, borderRadius: '8px' }}
        >
          {isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear activo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMActivos() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  // Portafolio filters
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterCriticidad, setFilterCriticidad] = useState('Todos')
  const [search, setSearch] = useState('')

  // Activo seleccionado para Vista 360°
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // CRUD de activos
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<ActivoAPI | null>(null)
  const [menuFila, setMenuFila] = useState<null | { anchor: HTMLElement; activo: ActivoAPI }>(null)
  const [aEliminar, setAEliminar] = useState<ActivoAPI | null>(null)

  // Jerarquía expanded state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'node-cd-bta': true,
    'node-flota': true,
  })

  const handleToggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  // ── Datos reales ──
  const { data: activos = [], isLoading } = useQuery<ActivoAPI[]>({
    queryKey: ['eam-activos'],
    queryFn: () => apiClient.get('/eam/activos').then(r => r.data),
  })
  const { data: tiposActivo = [] } = useQuery<TipoActivoCat[]>({
    queryKey: ['eam-tipos-activo'],
    queryFn: () => apiClient.get('/eam/tipos-activo').then(r => r.data),
  })
  const nombreTipo = (codigo?: string | null) => tiposActivo.find(t => t.codigo === codigo)?.nombre ?? codigo ?? '—'
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['eam-activos'] })
    qc.invalidateQueries({ queryKey: ['vehiculos-combinados'] })
  }

  const mutGuardar = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editando
        ? apiClient.put(`/eam/activos/${editando.id}`, payload).then(r => r.data)
        : apiClient.post('/eam/activos', payload).then(r => r.data),
    onSuccess: () => {
      toast.success(editando ? 'Activo actualizado' : 'Activo creado')
      invalidar(); setDialogOpen(false); setEditando(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar el activo'),
  })

  const mutEliminar = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/eam/activos/${id}`),
    onSuccess: () => { toast.success('Activo dado de baja'); invalidar(); setAEliminar(null) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo dar de baja el activo'),
  })

  const mutEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => apiClient.put(`/eam/activos/${id}`, { estado }),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo cambiar el estado'),
  })

  const abrirCrear = () => { setEditando(null); setDialogOpen(true) }
  const abrirEditar = (a: ActivoAPI) => { setEditando(a); setDialogOpen(true); setMenuFila(null) }

  const selectedActivo = activos.find((a) => a.id === selectedId) ?? null
  const openActivo = (a: ActivoAPI) => { setSelectedId(a.id); setTab(1) }
  const openActivoByCodigo = (codigo: string) => {
    const a = activos.find((x) => x.codigo === codigo)
    if (a) { setSelectedId(a.id); setTab(1) }
  }
  const verOTs = (a: ActivoAPI) => navigate(`/eam/ordenes-trabajo?activo=${encodeURIComponent(a.codigo)}`)

  const filtered = activos.filter((a) => {
    if (filterTipo !== 'Todos' && a.tipo_activo !== filterTipo) return false
    if (filterEstado !== 'Todos' && a.estado !== filterEstado) return false
    if (filterCriticidad !== 'Todos' && a.criticidad !== filterCriticidad) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const campos = [a.codigo, a.nombre, a.ubicacion, a.placa, a.marca]
      if (!campos.some(c => (c ?? '').toLowerCase().includes(q))) return false
    }
    return true
  })

  const medidorDe = (a: ActivoAPI) => {
    if (a.odometro_actual) return `${a.odometro_actual.toLocaleString('es-CO')} km`
    if (a.horometro_actual) return `${a.horometro_actual.toLocaleString('es-CO')} hrs`
    return '—'
  }

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
                <MenuItem value="Todos">Todos</MenuItem>
                {tiposActivo.map((t) => (
                  <MenuItem key={t.codigo} value={t.codigo}>{t.nombre}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Estado" value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                sx={{ minWidth: 190 }}
              >
                {['Todos', ...ESTADOS_ACTIVO].map((o) => (
                  <MenuItem key={o} value={o}>{o === 'Todos' ? 'Todos' : o.replace(/_/g, ' ')}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Criticidad" value={filterCriticidad}
                onChange={(e) => setFilterCriticidad(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                {['Todos', ...CRITICIDADES].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}
                sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', whiteSpace: 'nowrap' }}
              >
                Crear Activo
              </Button>
            </Stack>

            <Typography fontSize={12} color="#94A3B8" mb={1}>
              {filtered.length} activo{filtered.length !== 1 ? 's' : ''} · haz clic en una fila para ver su hoja de vida · usa el menú ⋮ para editar, dar de baja y más
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
                  gridTemplateColumns: '100px 1fr 130px 150px 100px 1fr 120px 90px 48px',
                  gap: 1, px: 2, py: 1.25,
                  borderBottom: '1px solid #E5E7EB',
                  bgcolor: alpha(EAM_COLOR, 0.06),
                }}
              >
                {['Código', 'Nombre', 'Tipo', 'Estado', 'Criticidad', 'Ubicación', 'Odóm./Horám.', 'Placa', ''].map((h, i) => (
                  <Typography key={`${h}-${i}`} fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px">
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
                    gridTemplateColumns: '100px 1fr 130px 150px 100px 1fr 120px 90px 48px',
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
                    <Box sx={{ color: 'text.secondary' }}>{TIPO_ICON[familiaDe(activo.tipo_activo)]}</Box>
                    <Typography fontSize={11} color="#64748B" noWrap>{nombreTipo(activo.tipo_activo)}</Typography>
                  </Stack>
                  <Chip
                    label={(activo.estado ?? '—').replace(/_/g, ' ')}
                    size="small"
                    sx={{ bgcolor: alpha(colorEstado(activo.estado), 0.15), color: colorEstado(activo.estado), fontWeight: 700, fontSize: 9, height: 20 }}
                  />
                  <Chip
                    label={activo.criticidad ?? '—'}
                    size="small"
                    sx={{ bgcolor: alpha(CRITICIDAD_COLOR[activo.criticidad ?? ''] ?? '#6B7280', 0.15), color: CRITICIDAD_COLOR[activo.criticidad ?? ''] ?? '#6B7280', fontWeight: 700, fontSize: 9, height: 20 }}
                  />
                  <Typography fontSize={12} color="#64748B" noWrap>{activo.ubicacion ?? '—'}</Typography>
                  <Typography fontSize={12} color="#64748B">{medidorDe(activo)}</Typography>
                  <Typography fontSize={12} color="#64748B" noWrap>{activo.placa ?? '—'}</Typography>
                  <Tooltip title="Acciones del activo">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setMenuFila({ anchor: e.currentTarget, activo }) }}
                      sx={{ color: '#94A3B8', '&:hover': { color: EAM_COLOR } }}
                    >
                      <MoreIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}

              {filtered.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography fontSize={13} color="#94A3B8">
                    {isLoading ? 'Cargando activos…'
                      : activos.length === 0 ? 'Aún no hay activos registrados. Usa “Crear Activo” para registrar el primero.'
                      : 'No se encontraron activos con los filtros aplicados.'}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* ── Tab 1: Hoja de vida 360° ── */}
        {tab === 1 && (
          <Vista360
            activo={selectedActivo}
            onBack={() => setTab(0)}
            onVerOTs={verOTs}
            onEditar={abrirEditar}
            nombreTipo={nombreTipo}
          />
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

        {/* ── Menú de acciones por activo ── */}
        <Menu
          anchorEl={menuFila?.anchor}
          open={!!menuFila}
          onClose={() => setMenuFila(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { borderRadius: '12px', minWidth: 230 } }}
        >
          {menuFila && [
            <Box key="head" sx={{ px: 2, py: 1 }}>
              <Typography fontSize={12.5} fontWeight={800} color={EAM_DARK}>{menuFila.activo.codigo}</Typography>
              <Typography fontSize={11} color="#64748B" noWrap>{menuFila.activo.nombre}</Typography>
            </Box>,
            <Divider key="d1" />,
            <MenuItem key="ver" onClick={() => { openActivo(menuFila.activo); setMenuFila(null) }}>
              <ListItemIcon><VerIcon sx={{ fontSize: 18, color: '#3B82F6' }} /></ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Ver hoja de vida 360°</ListItemText>
            </MenuItem>,
            <MenuItem key="edit" onClick={() => abrirEditar(menuFila.activo)}>
              <ListItemIcon><EditIcon sx={{ fontSize: 18, color: EAM_COLOR }} /></ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Editar activo</ListItemText>
            </MenuItem>,
            <MenuItem key="ots" onClick={() => { verOTs(menuFila.activo); setMenuFila(null) }}>
              <ListItemIcon><OTIcon sx={{ fontSize: 18, color: '#8B5CF6' }} /></ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Ver órdenes de trabajo</ListItemText>
            </MenuItem>,
            ...(tiposActivo.find(t => t.codigo === menuFila.activo.tipo_activo)?.usa_llantas ? [
              <MenuItem key="llantas" onClick={() => { navigate(`/eam/neumaticos?activo=${menuFila.activo.id}`); setMenuFila(null) }}>
                <ListItemIcon><LlantaIcon sx={{ fontSize: 18, color: EAM_DARK }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}
                  secondary={menuFila.activo.numero_ejes ? `${menuFila.activo.numero_ejes} eje(s) configurados` : 'Sin ejes configurados'}
                  secondaryTypographyProps={{ fontSize: 10.5 }}>
                  Ejes y llantas
                </ListItemText>
              </MenuItem>,
            ] : []),
            <Divider key="d2" />,
            <Box key="estados" sx={{ px: 2, py: 0.5 }}>
              <Typography fontSize={10} fontWeight={700} color="#94A3B8" letterSpacing="0.06em">CAMBIAR ESTADO</Typography>
            </Box>,
            ...ESTADOS_ACTIVO.filter(e => e !== menuFila.activo.estado).map(e => (
              <MenuItem key={`estado-${e}`} onClick={() => { mutEstado.mutate({ id: menuFila.activo.id, estado: e }); setMenuFila(null) }}>
                <ListItemIcon><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colorEstado(e), ml: 0.5 }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 12.5 }}>{e.replace(/_/g, ' ')}</ListItemText>
              </MenuItem>
            )),
            <Divider key="d3" />,
            <MenuItem key="del" onClick={() => { setAEliminar(menuFila.activo); setMenuFila(null) }} sx={{ color: '#DC2626' }}>
              <ListItemIcon><DeleteIcon sx={{ fontSize: 18, color: '#DC2626' }} /></ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Eliminar activo</ListItemText>
            </MenuItem>,
          ]}
        </Menu>

        {/* ── Crear / editar activo ── */}
        <ActivoDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditando(null) }}
          editando={editando}
          tipos={tiposActivo}
          isPending={mutGuardar.isPending}
          onSubmit={(payload) => mutGuardar.mutate(payload)}
        />

        {/* ── Confirmar baja del activo ── */}
        <Dialog open={!!aEliminar} onClose={() => setAEliminar(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Eliminar activo
            <Typography variant="caption" color="text.secondary" display="block">{aEliminar?.codigo} — {aEliminar?.nombre}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Alert severity="warning" sx={{ py: 0.5 }}>
              El activo se da de baja y deja de aparecer en los listados, pero <b>se conserva su histórico</b>
              (órdenes de trabajo, movimientos de llantas y demás registros asociados).
            </Alert>
            <Typography fontSize={12.5} color="#64748B" mt={1.5}>
              No se podrá dar de baja si todavía tiene llantas montadas u órdenes de trabajo abiertas.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setAEliminar(null)} sx={{ color: '#64748B' }}>Cancelar</Button>
            <Button
              variant="contained" color="error" disabled={mutEliminar.isPending}
              onClick={() => aEliminar && mutEliminar.mutate(aEliminar.id)}
            >
              {mutEliminar.isPending ? 'Eliminando…' : 'Eliminar activo'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
