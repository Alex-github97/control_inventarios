import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Grid, Chip, Button, Tab, Tabs,
  MenuItem, TextField, alpha,
} from '@mui/material'
import {
  Add as AddIcon,
  Handyman as OTIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#EA580C'
const EAM_DARK  = '#C2410C'
const DARK_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'

// ─── Types ───────────────────────────────────────────────────────────────────

type OTEstado = 'PENDIENTE' | 'ASIGNADA' | 'EN_EJECUCION' | 'EN_ESPERA_REPUESTOS' | 'COMPLETADA'
type OTPrioridad = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA'
type OTTipo = 'PREVENTIVA' | 'CORRECTIVA' | 'PREDICTIVA' | 'EMERGENCIA'

interface OT {
  id: number
  numero: string
  activo: string
  tipo: OTTipo
  prioridad: OTPrioridad
  estado: OTEstado
  tecnico: string
  fechaReq: string
  costo: string
  diasTranscurridos: number
}

interface KanbanColumn {
  estado: OTEstado
  label: string
  color: string
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const PRIORIDAD_COLOR: Record<OTPrioridad, string> = {
  URGENTE: '#DC2626',
  ALTA:    EAM_COLOR,
  MEDIA:   '#F59E0B',
  BAJA:    '#6B7280',
}

const TIPO_COLOR: Record<OTTipo, string> = {
  PREVENTIVA: '#16A34A',
  CORRECTIVA: '#DC2626',
  PREDICTIVA: '#3B82F6',
  EMERGENCIA: '#7F1D1D',
}

const ESTADO_COLOR: Record<OTEstado, string> = {
  PENDIENTE:             EAM_COLOR,
  ASIGNADA:              '#3B82F6',
  EN_EJECUCION:          '#16A34A',
  EN_ESPERA_REPUESTOS:   '#F59E0B',
  COMPLETADA:            '#6B7280',
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { estado: 'PENDIENTE',           label: 'PENDIENTE',         color: EAM_COLOR  },
  { estado: 'ASIGNADA',            label: 'ASIGNADA',          color: '#3B82F6'  },
  { estado: 'EN_EJECUCION',        label: 'EN EJECUCIÓN',      color: '#16A34A'  },
  { estado: 'EN_ESPERA_REPUESTOS', label: 'ESP. REPUESTOS',    color: '#F59E0B'  },
  { estado: 'COMPLETADA',          label: 'COMPLETADA',        color: '#6B7280'  },
]

// ─── Mock data ────────────────────────────────────────────────────────────────

const OTS_MOCK: OT[] = [
  // PENDIENTE
  { id:  1, numero: 'OT-2025-0101', activo: 'VH-001 Kenworth T800',      tipo: 'PREVENTIVA', prioridad: 'ALTA',    estado: 'PENDIENTE',           tecnico: 'Jorge Méndez',   fechaReq: '2025-06-25', costo: '$850,000',   diasTranscurridos: 2  },
  { id:  2, numero: 'OT-2025-0102', activo: 'MC-003 Toyota 8FGCU25',     tipo: 'CORRECTIVA', prioridad: 'URGENTE', estado: 'PENDIENTE',           tecnico: 'Sin asignar',    fechaReq: '2025-06-20', costo: '$1,200,000', diasTranscurridos: 0  },
  { id:  3, numero: 'OT-2025-0103', activo: 'CMP-07 Atlas Copco',        tipo: 'PREDICTIVA', prioridad: 'MEDIA',   estado: 'PENDIENTE',           tecnico: 'Sin asignar',    fechaReq: '2025-06-28', costo: '$320,000',   diasTranscurridos: 1  },
  // ASIGNADA
  { id:  4, numero: 'OT-2025-0094', activo: 'CF-001 Compresor Frío',     tipo: 'PREVENTIVA', prioridad: 'ALTA',    estado: 'ASIGNADA',            tecnico: 'Luis Vargas',    fechaReq: '2025-06-22', costo: '$650,000',   diasTranscurridos: 3  },
  { id:  5, numero: 'OT-2025-0095', activo: 'SRV-01 Dell PowerEdge',     tipo: 'CORRECTIVA', prioridad: 'URGENTE', estado: 'ASIGNADA',            tecnico: 'Ana Rojas',      fechaReq: '2025-06-19', costo: '$2,100,000', diasTranscurridos: 1  },
  { id:  6, numero: 'OT-2025-0096', activo: 'VH-002 Freightliner M2',    tipo: 'PREVENTIVA', prioridad: 'MEDIA',   estado: 'ASIGNADA',            tecnico: 'Carlos Díaz',    fechaReq: '2025-06-30', costo: '$480,000',   diasTranscurridos: 4  },
  // EN_EJECUCION
  { id:  7, numero: 'OT-2025-0088', activo: 'MC-001 Yale GLP050',        tipo: 'CORRECTIVA', prioridad: 'ALTA',    estado: 'EN_EJECUCION',        tecnico: 'Jorge Méndez',   fechaReq: '2025-06-18', costo: '$1,800,000', diasTranscurridos: 5  },
  { id:  8, numero: 'OT-2025-0089', activo: 'BD-01 Bodega Principal',    tipo: 'PREVENTIVA', prioridad: 'BAJA',    estado: 'EN_EJECUCION',        tecnico: 'Pedro Torres',   fechaReq: '2025-06-21', costo: '$250,000',   diasTranscurridos: 3  },
  { id:  9, numero: 'OT-2025-0090', activo: 'ELV-02 Still EXU',         tipo: 'EMERGENCIA', prioridad: 'URGENTE', estado: 'EN_EJECUCION',        tecnico: 'Luis Vargas',    fechaReq: '2025-06-19', costo: '$3,400,000', diasTranscurridos: 1  },
  // EN_ESPERA_REPUESTOS
  { id: 10, numero: 'OT-2025-0081', activo: 'VH-003 Ford Ranger',        tipo: 'CORRECTIVA', prioridad: 'ALTA',    estado: 'EN_ESPERA_REPUESTOS', tecnico: 'Carlos Díaz',    fechaReq: '2025-06-15', costo: '$950,000',   diasTranscurridos: 8  },
  { id: 11, numero: 'OT-2025-0082', activo: 'MC-004 Crown RR5200',       tipo: 'CORRECTIVA', prioridad: 'MEDIA',   estado: 'EN_ESPERA_REPUESTOS', tecnico: 'Ana Rojas',      fechaReq: '2025-06-12', costo: '$1,650,000', diasTranscurridos: 11 },
  { id: 12, numero: 'OT-2025-0083', activo: 'CF-001 Evaporador EV-001',  tipo: 'PREDICTIVA', prioridad: 'ALTA',    estado: 'EN_ESPERA_REPUESTOS', tecnico: 'Jorge Méndez',   fechaReq: '2025-06-16', costo: '$780,000',   diasTranscurridos: 7  },
  // COMPLETADA
  { id: 13, numero: 'OT-2025-0074', activo: 'VH-001 Kenworth T800',      tipo: 'PREVENTIVA', prioridad: 'MEDIA',   estado: 'COMPLETADA',          tecnico: 'Luis Vargas',    fechaReq: '2025-06-10', costo: '$850,000',   diasTranscurridos: 10 },
  { id: 14, numero: 'OT-2025-0075', activo: 'MC-003 Toyota 8FGCU25',     tipo: 'PREDICTIVA', prioridad: 'BAJA',    estado: 'COMPLETADA',          tecnico: 'Pedro Torres',   fechaReq: '2025-06-08', costo: '$310,000',   diasTranscurridos: 12 },
  { id: 15, numero: 'OT-2025-0076', activo: 'SRV-01 Dell PowerEdge',     tipo: 'PREVENTIVA', prioridad: 'ALTA',    estado: 'COMPLETADA',          tecnico: 'Ana Rojas',      fechaReq: '2025-06-05', costo: '$500,000',   diasTranscurridos: 15 },
]

const FALLAS_CATALOGO = [
  'Falla eléctrica',
  'Falla mecánica',
  'Fuga de fluidos',
  'Desgaste prematuro',
  'Sobrecalentamiento',
  'Vibración excesiva',
  'Ruido anormal',
  'Pérdida de presión',
  'Corrosión',
  'PM programado',
]

const ACTIVOS_SELECT = [
  'VH-001 — Tractocamión Kenworth T800',
  'VH-002 — Camión Freightliner M2-106',
  'VH-003 — Camioneta Ford Ranger',
  'MC-001 — Montacargas Yale GLP050',
  'MC-003 — Montacargas Toyota 8FGCU25',
  'MC-004 — Reach Truck Crown RR5200',
  'CF-001 — Compresor Cuarto Frío',
  'CMP-07 — Compresor Atlas Copco GA22',
  'SRV-01 — Servidor Dell PowerEdge R740',
  'ELV-02 — Estibador Eléctrico Still EXU',
  'BD-01  — Bodega Principal Bogotá',
]

const TECNICOS_SELECT = [
  'Jorge Méndez',
  'Luis Vargas',
  'Ana Rojas',
  'Carlos Díaz',
  'Pedro Torres',
]

// ─── OT Card (Kanban) ─────────────────────────────────────────────────────────

function OTCard({ ot }: { ot: OT }) {
  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: alpha('#0F1E35', 0.9),
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: '10px',
        p: 1.5,
        mb: 1,
        '&:hover': { border: `1px solid rgba(234,88,12,0.3)`, bgcolor: alpha(EAM_COLOR, 0.04) },
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
        <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>
          {ot.numero}
        </Typography>
        <Chip
          label={ot.prioridad}
          size="small"
          sx={{
            bgcolor: alpha(PRIORIDAD_COLOR[ot.prioridad], 0.15),
            color: PRIORIDAD_COLOR[ot.prioridad],
            fontWeight: 700,
            fontSize: 9,
            height: 18,
          }}
        />
      </Stack>
      <Typography fontSize={12} color="rgba(255,255,255,0.8)" fontWeight={600} mb={0.5} noWrap>
        {ot.activo}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
        <Chip
          label={ot.tipo}
          size="small"
          sx={{
            bgcolor: alpha(TIPO_COLOR[ot.tipo], 0.15),
            color: TIPO_COLOR[ot.tipo],
            fontWeight: 700,
            fontSize: 9,
            height: 18,
          }}
        />
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontSize={11} color="rgba(255,255,255,0.45)">
          👤 {ot.tecnico}
        </Typography>
        <Typography fontSize={10} color="rgba(255,255,255,0.3)">
          {ot.diasTranscurridos}d
        </Typography>
      </Stack>
    </Paper>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMOrdenesTrabajo() {
  const [tab, setTab] = useState(0)

  // Tabla filters
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterTipo,   setFilterTipo]   = useState('Todos')
  const [filterPrioridad, setFilterPrioridad] = useState('Todos')

  // Crear OT form
  const [form, setForm] = useState({
    numero:     'OT-2025-0116',
    activo:     '',
    tipo:       'PREVENTIVA',
    prioridad:  'MEDIA',
    descripcion:'',
    tecnico:    '',
    fechaReq:   '',
    falla:      '',
    observaciones: '',
  })

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const filteredOTs = OTS_MOCK.filter((ot) => {
    if (filterEstado !== 'Todos' && ot.estado !== filterEstado) return false
    if (filterTipo   !== 'Todos' && ot.tipo   !== filterTipo)   return false
    if (filterPrioridad !== 'Todos' && ot.prioridad !== filterPrioridad) return false
    return true
  })

  const inputSx = {
    '& .MuiOutlinedInput-root': { bgcolor: CARD_BG, color: '#fff' },
    '& label': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(234,88,12,0.25)' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(234,88,12,0.5)' },
    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
  }

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: DARK_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <OTIcon sx={{ fontSize: 28, color: EAM_COLOR }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color="#fff" letterSpacing="-0.5px">
                Órdenes de Trabajo
              </Typography>
              <Typography fontSize={13} color="rgba(255,255,255,0.45)">
                Gestión integral de OTs — Kanban, tabla y creación
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTab(2)}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700 }}
          >
            Nueva OT
          </Button>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13 },
            '& .Mui-selected': { color: EAM_COLOR },
            '& .MuiTabs-indicator': { bgcolor: EAM_COLOR },
          }}
        >
          <Tab label="Kanban" />
          <Tab label="Tabla" />
          <Tab label="Crear OT" />
        </Tabs>

        {/* ── Tab 0: Kanban ── */}
        {tab === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Stack direction="row" spacing={2} sx={{ minWidth: 1100, pb: 2 }}>
              {KANBAN_COLUMNS.map((col) => {
                const colOTs = OTS_MOCK.filter((o) => o.estado === col.estado)
                return (
                  <Box
                    key={col.estado}
                    sx={{
                      flex: '1 1 200px',
                      minWidth: 200,
                      bgcolor: alpha(col.color, 0.05),
                      border: `1px solid ${alpha(col.color, 0.2)}`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Column header */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        px: 1.5, py: 1,
                        borderBottom: `1px solid ${alpha(col.color, 0.2)}`,
                        bgcolor: alpha(col.color, 0.1),
                      }}
                    >
                      <Typography fontSize={11} fontWeight={800} color={col.color} letterSpacing="0.5px">
                        {col.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 22, height: 22, borderRadius: '50%',
                          bgcolor: alpha(col.color, 0.2),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Typography fontSize={11} fontWeight={900} color={col.color}>
                          {colOTs.length}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Cards */}
                    <Box sx={{ p: 1.25 }}>
                      {colOTs.map((ot) => (
                        <OTCard key={ot.id} ot={ot} />
                      ))}
                      {colOTs.length === 0 && (
                        <Typography fontSize={12} color="rgba(255,255,255,0.25)" textAlign="center" py={2}>
                          Sin OTs
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </Box>
        )}

        {/* ── Tab 1: Tabla ── */}
        {tab === 1 && (
          <Box>
            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                select size="small" label="Estado" value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                sx={{ minWidth: 190, ...inputSx }}
              >
                {['Todos', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_ESPERA_REPUESTOS', 'COMPLETADA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Tipo OT" value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                sx={{ minWidth: 160, ...inputSx }}
              >
                {['Todos', 'PREVENTIVA', 'CORRECTIVA', 'PREDICTIVA', 'EMERGENCIA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Prioridad" value={filterPrioridad}
                onChange={(e) => setFilterPrioridad(e.target.value)}
                sx={{ minWidth: 150, ...inputSx }}
              >
                {['Todos', 'URGENTE', 'ALTA', 'MEDIA', 'BAJA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                bgcolor: CARD_BG,
                border: `1px solid rgba(234,88,12,0.25)`,
                borderRadius: '14px',
                overflow: 'auto',
              }}
            >
              {/* Table header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 120px 100px 160px 130px 110px 100px 90px',
                  gap: 1,
                  px: 2, py: 1.25,
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  bgcolor: alpha(EAM_COLOR, 0.06),
                  minWidth: 1000,
                }}
              >
                {['# OT', 'Activo', 'Tipo', 'Prioridad', 'Estado', 'Técnico', 'Fecha Req.', 'Costo', 'Acciones'].map((h) => (
                  <Typography key={h} fontSize={11} fontWeight={700} color="rgba(255,255,255,0.4)" letterSpacing="0.5px">
                    {h.toUpperCase()}
                  </Typography>
                ))}
              </Box>

              <Box sx={{ minWidth: 1000 }}>
                {filteredOTs.map((ot, idx) => (
                  <Box
                    key={ot.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 120px 100px 160px 130px 110px 100px 90px',
                      gap: 1,
                      px: 2, py: 1.25,
                      borderBottom: idx < filteredOTs.length - 1
                        ? '1px solid rgba(255,255,255,0.04)'
                        : 'none',
                      alignItems: 'center',
                      '&:hover': { bgcolor: alpha(EAM_COLOR, 0.04) },
                    }}
                  >
                    <Typography fontSize={11} fontWeight={700} color={EAM_COLOR} noWrap>
                      {ot.numero}
                    </Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.8)" noWrap>
                      {ot.activo}
                    </Typography>
                    <Chip
                      label={ot.tipo}
                      size="small"
                      sx={{
                        bgcolor: alpha(TIPO_COLOR[ot.tipo], 0.15),
                        color: TIPO_COLOR[ot.tipo],
                        fontWeight: 700,
                        fontSize: 9,
                        height: 20,
                      }}
                    />
                    <Chip
                      label={ot.prioridad}
                      size="small"
                      sx={{
                        bgcolor: alpha(PRIORIDAD_COLOR[ot.prioridad], 0.15),
                        color: PRIORIDAD_COLOR[ot.prioridad],
                        fontWeight: 700,
                        fontSize: 9,
                        height: 20,
                      }}
                    />
                    <Chip
                      label={ot.estado.replace(/_/g, ' ')}
                      size="small"
                      sx={{
                        bgcolor: alpha(ESTADO_COLOR[ot.estado], 0.15),
                        color: ESTADO_COLOR[ot.estado],
                        fontWeight: 700,
                        fontSize: 9,
                        height: 20,
                      }}
                    />
                    <Typography fontSize={12} color="rgba(255,255,255,0.65)" noWrap>
                      {ot.tecnico}
                    </Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.55)">
                      {ot.fechaReq}
                    </Typography>
                    <Typography fontSize={12} fontWeight={600} color="#16A34A">
                      {ot.costo}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: 10, fontWeight: 700,
                        borderColor: 'rgba(234,88,12,0.35)',
                        color: EAM_COLOR,
                        '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.07) },
                        borderRadius: '8px',
                        py: 0.25,
                      }}
                    >
                      Ver
                    </Button>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        {/* ── Tab 2: Crear OT ── */}
        {tab === 2 && (
          <Paper
            elevation={0}
            sx={{
              bgcolor: CARD_BG,
              border: `1px solid rgba(234,88,12,0.25)`,
              borderRadius: '14px',
              p: 3,
              maxWidth: 860,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
              <OTIcon sx={{ fontSize: 22, color: EAM_COLOR }} />
              <Typography fontWeight={700} fontSize={16} color="#fff">
                Nueva Orden de Trabajo
              </Typography>
            </Stack>

            <Grid container spacing={2.5}>
              {/* Número OT */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Número OT (auto)"
                  value={form.numero}
                  InputProps={{ readOnly: true }}
                  sx={{ ...inputSx, '& .MuiOutlinedInput-root': { bgcolor: alpha('#0F1E35', 0.6), color: 'rgba(255,255,255,0.5)' } }}
                />
              </Grid>

              {/* Activo */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select fullWidth size="small" label="Activo"
                  value={form.activo}
                  onChange={(e) => setField('activo', e.target.value)}
                  sx={inputSx}
                >
                  <MenuItem value=""><em>Seleccionar activo...</em></MenuItem>
                  {ACTIVOS_SELECT.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Tipo OT */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select fullWidth size="small" label="Tipo OT"
                  value={form.tipo}
                  onChange={(e) => setField('tipo', e.target.value)}
                  sx={inputSx}
                >
                  {['PREVENTIVA', 'CORRECTIVA', 'PREDICTIVA', 'EMERGENCIA'].map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Prioridad */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select fullWidth size="small" label="Prioridad"
                  value={form.prioridad}
                  onChange={(e) => setField('prioridad', e.target.value)}
                  sx={inputSx}
                >
                  {['URGENTE', 'ALTA', 'MEDIA', 'BAJA'].map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Fecha requerida */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Fecha requerida" type="date"
                  value={form.fechaReq}
                  onChange={(e) => setField('fechaReq', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={inputSx}
                />
              </Grid>

              {/* Descripción */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Descripción del trabajo" multiline rows={3}
                  value={form.descripcion}
                  onChange={(e) => setField('descripcion', e.target.value)}
                  placeholder="Describa el trabajo a realizar..."
                  sx={inputSx}
                />
              </Grid>

              {/* Técnico asignado */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select fullWidth size="small" label="Técnico asignado"
                  value={form.tecnico}
                  onChange={(e) => setField('tecnico', e.target.value)}
                  sx={inputSx}
                >
                  <MenuItem value=""><em>Seleccionar técnico...</em></MenuItem>
                  {TECNICOS_SELECT.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Falla */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select fullWidth size="small" label="Tipo de falla (catálogo)"
                  value={form.falla}
                  onChange={(e) => setField('falla', e.target.value)}
                  sx={inputSx}
                >
                  <MenuItem value=""><em>Seleccionar falla...</em></MenuItem>
                  {FALLAS_CATALOGO.map((f) => (
                    <MenuItem key={f} value={f}>{f}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Observaciones */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Observaciones adicionales" multiline rows={2}
                  value={form.observaciones}
                  onChange={(e) => setField('observaciones', e.target.value)}
                  placeholder="Notas, recursos especiales, permisos requeridos..."
                  sx={inputSx}
                />
              </Grid>

              {/* Submit */}
              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    sx={{
                      bgcolor: EAM_COLOR,
                      '&:hover': { bgcolor: EAM_DARK },
                      borderRadius: '12px',
                      fontWeight: 700,
                      px: 4,
                    }}
                  >
                    Crear Orden de Trabajo
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => setTab(1)}
                    sx={{
                      borderColor: 'rgba(234,88,12,0.35)',
                      color: 'rgba(255,255,255,0.6)',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Cancelar
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
    </Layout>
  )
}
