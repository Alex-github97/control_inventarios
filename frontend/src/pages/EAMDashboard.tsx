import React from 'react'
import {
  Box, Paper, Typography, Stack, Grid, Chip, alpha, Divider,
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
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'
const DARK_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KPICard {
  label: string
  value: string
  color: string
  icon: React.ReactNode
  sub?: string
}

interface AlertaCritica {
  id: number
  activo: string
  descripcion: string
  criticidad: 'CRITICA' | 'ALTA' | 'MEDIA'
}

interface ConfiabilidadRow {
  categoria: string
  mtbf: string
  mttr: string
  disponibilidad: string
  estado: 'BUENO' | 'REGULAR' | 'CRITICO'
}

// ─── Static data ─────────────────────────────────────────────────────────────

const KPI_DATA: KPICard[] = [
  { label: 'Disponibilidad Flota', value: '94.2%', color: '#16A34A', icon: <DispIcon />, sub: '≥ 90% objetivo' },
  { label: 'Total Activos',        value: '127',   color: EAM_COLOR,  icon: <VehiculoIcon /> },
  { label: 'OTs Abiertas',         value: '34',    color: '#3B82F6',  icon: <OTIcon /> },
  { label: 'Cumplimiento PM',      value: '87%',   color: '#F59E0B',  icon: <OkIcon /> },
  { label: 'MTBF',                 value: '312 hrs', color: '#8B5CF6', icon: <MTBFIcon /> },
  { label: 'MTTR',                 value: '4.2 hrs', color: '#06B6D4', icon: <MTBFIcon /> },
  { label: 'Costo Mes',            value: '$48.2M', color: EAM_DARK,  icon: <CostoIcon /> },
  { label: 'Activos Críticos',     value: '18',    color: '#DC2626',  icon: <CriticaIcon /> },
]

interface BarAsset { label: string; count: number; color: string; icon: React.ReactNode }
const ASSET_BARS: BarAsset[] = [
  { label: 'Vehículos',       count: 52, color: '#3B82F6', icon: <VehiculoIcon sx={{ fontSize: 16 }} /> },
  { label: 'Montacargas',     count: 18, color: '#F59E0B', icon: <MontacargasIcon sx={{ fontSize: 16 }} /> },
  { label: 'Infraestructura', count: 24, color: '#8B5CF6', icon: <InfraIcon sx={{ fontSize: 16 }} /> },
  { label: 'Equipos',         count: 33, color: '#06B6D4', icon: <EquipoIcon sx={{ fontSize: 16 }} /> },
]
const TOTAL_ASSETS = 127

interface OTEstado { label: string; count: number; color: string }
const OT_ESTADOS: OTEstado[] = [
  { label: 'PENDIENTE',            count: 12, color: EAM_COLOR },
  { label: 'EN EJECUCIÓN',         count:  8, color: '#3B82F6' },
  { label: 'ESP. REPUESTOS',       count:  6, color: '#F59E0B' },
  { label: 'COMPLETADAS',          count: 45, color: '#16A34A' },
  { label: 'CANCELADAS',           count:  3, color: '#6B7280' },
]

const ALERTAS: AlertaCritica[] = [
  { id: 1, activo: 'Motor VH-001',     descripcion: 'Temperatura alta detectada por IA',   criticidad: 'CRITICA' },
  { id: 2, activo: 'Montacargas MC-003', descripcion: 'PM vencido hace 15 días',           criticidad: 'ALTA'   },
  { id: 3, activo: 'Edificio BD-01',   descripcion: 'Inspección de cubierta pendiente',     criticidad: 'ALTA'   },
  { id: 4, activo: 'Neumático NEU-124', descripcion: 'Profundidad mínima alcanzada',        criticidad: 'MEDIA'  },
  { id: 5, activo: 'Compresor CMP-07', descripcion: 'Nivel de aceite bajo',                criticidad: 'MEDIA'  },
  { id: 6, activo: 'Servidor SRV-01',  descripcion: 'Batería UPS en 18%',                  criticidad: 'ALTA'   },
]

const CONFIABILIDAD: ConfiabilidadRow[] = [
  { categoria: 'Vehículos pesados', mtbf: '412 hrs', mttr: '3.8 hrs', disponibilidad: '99.1%', estado: 'BUENO'   },
  { categoria: 'Montacargas',       mtbf: '280 hrs', mttr: '5.2 hrs', disponibilidad: '98.2%', estado: 'BUENO'   },
  { categoria: 'Infraestructura',   mtbf: '520 hrs', mttr: '6.0 hrs', disponibilidad: '99.6%', estado: 'BUENO'   },
  { categoria: 'Equipos electrón.', mtbf: '180 hrs', mttr: '2.1 hrs', disponibilidad: '91.0%', estado: 'REGULAR' },
  { categoria: 'Sistemas HVAC',     mtbf:  '95 hrs', mttr: '8.4 hrs', disponibilidad: '84.2%', estado: 'CRITICO' },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICardItem({ card }: { card: KPICard }) {
  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: CARD_BG,
        border: `1px solid rgba(50,172,92,0.25)`,
        borderRadius: '14px',
        p: 2,
        height: '100%',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography fontSize={26} fontWeight={800} color={card.color} lineHeight={1}>
            {card.value}
          </Typography>
          <Typography fontSize={12} color="rgba(255,255,255,0.55)" mt={0.5}>
            {card.label}
          </Typography>
          {card.sub && (
            <Typography fontSize={10} color="rgba(255,255,255,0.35)" mt={0.25}>
              {card.sub}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: '10px',
            bgcolor: alpha(card.color, 0.15),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {React.cloneElement(card.icon as React.ReactElement, {
            sx: { fontSize: 18, color: card.color },
          })}
        </Box>
      </Stack>
    </Paper>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMDashboard() {
  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: DARK_BG, minHeight: '100vh' }}>

        {/* ── Header ── */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: '12px',
              bgcolor: alpha(EAM_COLOR, 0.15),
              border: `1px solid rgba(50,172,92,0.35)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <UrgIcon sx={{ fontSize: 22, color: EAM_COLOR }} />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ color: '#fff', letterSpacing: '-0.5px' }}
              >
                Torre de Control EAM
              </Typography>
              <Chip
                label="CMMS / EAM"
                size="small"
                sx={{
                  bgcolor: alpha(EAM_COLOR, 0.18),
                  color: EAM_COLOR,
                  fontWeight: 700,
                  fontSize: 10,
                  border: `1px solid rgba(50,172,92,0.35)`,
                }}
              />
            </Stack>
            <Typography fontSize={13} color="rgba(255,255,255,0.45)" mt={0.25}>
              Enterprise Asset Management — Gestión integrada de activos industriales
            </Typography>
          </Box>
        </Stack>

        {/* ── KPI Row ── */}
        <Grid container spacing={2} mb={3}>
          {KPI_DATA.map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 6, sm: 4, md: 3 }}>
              <KPICardItem card={kpi} />
            </Grid>
          ))}
        </Grid>

        {/* ── Middle row: bars + OT estados ── */}
        <Grid container spacing={2} mb={3}>

          {/* Activos por tipo */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: CARD_BG,
                border: `1px solid rgba(50,172,92,0.25)`,
                borderRadius: '14px',
                p: 2.5,
              }}
            >
              <Typography fontWeight={700} fontSize={14} color="#fff" mb={2}>
                Activos por tipo
              </Typography>
              <Stack spacing={1.75}>
                {ASSET_BARS.map((item) => {
                  const pct = Math.round((item.count / TOTAL_ASSETS) * 100)
                  return (
                    <Box key={item.label}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
                          <Typography fontSize={13} color="rgba(255,255,255,0.8)">
                            {item.label}
                          </Typography>
                        </Stack>
                        <Typography fontSize={13} fontWeight={700} color={item.color}>
                          {item.count}
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 8, borderRadius: 4,
                          bgcolor: 'rgba(255,255,255,0.07)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${pct}%`,
                            bgcolor: item.color,
                            borderRadius: 4,
                          }}
                        />
                      </Box>
                    </Box>
                  )
                })}
              </Stack>
            </Paper>
          </Grid>

          {/* OTs por estado */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: CARD_BG,
                border: `1px solid rgba(50,172,92,0.25)`,
                borderRadius: '14px',
                p: 2.5,
              }}
            >
              <Typography fontWeight={700} fontSize={14} color="#fff" mb={2}>
                OTs por estado
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {OT_ESTADOS.map((ot) => (
                  <Box
                    key={ot.label}
                    sx={{
                      flex: '1 1 120px',
                      border: `1px solid ${alpha(ot.color, 0.4)}`,
                      borderRadius: '12px',
                      bgcolor: alpha(ot.color, 0.08),
                      p: 1.5,
                      textAlign: 'center',
                    }}
                  >
                    <Typography fontSize={32} fontWeight={900} color={ot.color} lineHeight={1}>
                      {ot.count}
                    </Typography>
                    <Typography
                      fontSize={10}
                      fontWeight={700}
                      color={alpha(ot.color, 0.85)}
                      mt={0.5}
                      letterSpacing="0.5px"
                    >
                      {ot.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* ── Bottom row: alertas + confiabilidad ── */}
        <Grid container spacing={2}>

          {/* Alertas críticas */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: CARD_BG,
                border: `1px solid rgba(50,172,92,0.25)`,
                borderRadius: '14px',
                p: 2.5,
                height: '100%',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <AlertaIcon sx={{ fontSize: 18, color: '#DC2626' }} />
                <Typography fontWeight={700} fontSize={14} color="#fff">
                  Alertas críticas
                </Typography>
                <Chip
                  label={`${ALERTAS.length} activas`}
                  size="small"
                  sx={{ bgcolor: alpha('#DC2626', 0.15), color: '#DC2626', fontSize: 10, fontWeight: 700 }}
                />
              </Stack>
              <Stack spacing={1.25}>
                {ALERTAS.map((alerta) => (
                  <Box
                    key={alerta.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: '10px',
                      bgcolor: alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.07),
                      border: `1px solid ${alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.2)}`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: CRITICIDAD_COLOR[alerta.criticidad],
                        flexShrink: 0,
                      }}
                    />
                    <Box flex={1} minWidth={0}>
                      <Typography fontSize={13} fontWeight={600} color="#fff" noWrap>
                        {alerta.activo}
                      </Typography>
                      <Typography fontSize={11} color="rgba(255,255,255,0.5)" noWrap>
                        {alerta.descripcion}
                      </Typography>
                    </Box>
                    <Chip
                      label={alerta.criticidad}
                      size="small"
                      sx={{
                        bgcolor: alpha(CRITICIDAD_COLOR[alerta.criticidad], 0.18),
                        color: CRITICIDAD_COLOR[alerta.criticidad],
                        fontWeight: 700,
                        fontSize: 9,
                        height: 20,
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>

          {/* Confiabilidad por categoría */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: CARD_BG,
                border: `1px solid rgba(50,172,92,0.25)`,
                borderRadius: '14px',
                p: 2.5,
                height: '100%',
              }}
            >
              <Typography fontWeight={700} fontSize={14} color="#fff" mb={2}>
                Confiabilidad por categoría
              </Typography>

              {/* Table header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
                  gap: 1,
                  pb: 1,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {['Categoría', 'MTBF', 'MTTR', 'Disp.', 'Estado'].map((h) => (
                  <Typography key={h} fontSize={11} fontWeight={700} color="rgba(255,255,255,0.4)" letterSpacing="0.5px">
                    {h.toUpperCase()}
                  </Typography>
                ))}
              </Box>

              <Stack spacing={0}>
                {CONFIABILIDAD.map((row, idx) => (
                  <Box
                    key={row.categoria}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
                      gap: 1,
                      py: 1,
                      borderBottom: idx < CONFIABILIDAD.length - 1
                        ? '1px solid rgba(255,255,255,0.05)'
                        : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <Typography fontSize={12} color="rgba(255,255,255,0.8)">
                      {row.categoria}
                    </Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.65)">
                      {row.mtbf}
                    </Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.65)">
                      {row.mttr}
                    </Typography>
                    <Typography fontSize={12} fontWeight={700} color={ESTADO_CONF_COLOR[row.estado]}>
                      {row.disponibilidad}
                    </Typography>
                    <Chip
                      label={row.estado}
                      size="small"
                      sx={{
                        bgcolor: alpha(ESTADO_CONF_COLOR[row.estado], 0.15),
                        color: ESTADO_CONF_COLOR[row.estado],
                        fontWeight: 700,
                        fontSize: 9,
                        height: 20,
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
