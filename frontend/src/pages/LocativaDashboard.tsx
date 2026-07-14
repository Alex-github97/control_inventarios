import React from 'react'
import {
  Box, Paper, Typography, Stack, Chip, Button, CircularProgress, alpha, Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Inventory2 as ActivosIcon,
  Handyman as OTIcon,
  ReportProblem as RiesgoIcon,
  Bolt as EnergiaIcon,
  CheckCircle as OkIcon,
  Error as VencidoIcon,
  Schedule as PorVencerIcon,
  ArrowForward as GoIcon,
  AttachMoney as CostoIcon,
  Speed as DispIcon,
  Warning as AlertaIcon,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

const ML_COLOR = '#0D9488'

interface KPIs {
  total_activos: number
  activos_operativos: number
  activos_mantenimiento: number
  activos_fuera_servicio: number
  activos_criticos: number
  total_ot: number
  ot_abiertas: number
  ot_en_progreso: number
  total_riesgos: number
  riesgos_inaceptables: number
  valor_libros_total: number | null
  documentos_vencidos: number
  documentos_por_vencer: number
  lecturas_anomalas: number
  consumo_energia_mes: number | null
  fallas_mes: number
  mtbf_promedio: number | null
  mttr_promedio: number | null
  disponibilidad_promedio: number | null
  costo_mantenimiento_mes: number | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtPct = (n: number | null) => (n != null ? `${(n * 100).toFixed(1)}%` : '—')

const KPICard = ({
  label, value, color, icon, sub,
}: {
  label: string; value: string | number; color: string; icon: React.ReactNode; sub?: string
}) => (
  <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography fontSize={28} fontWeight={800} color={color} lineHeight={1}>{value}</Typography>
        <Typography fontSize={12} color="text.secondary" mt={0.25}>{label}</Typography>
        {sub && <Typography fontSize={11} color="text.secondary" mt={0.25}>{sub}</Typography>}
      </Box>
      <Box sx={{
        width: 40, height: 40, borderRadius: '10px',
        bgcolor: alpha(color, 0.1),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20, color } })}
      </Box>
    </Stack>
  </Paper>
)

interface DocAlert {
  id: number
  tipo_documento: string
  fecha_vencimiento: string
  estado_semaforo: string
  activo_nombre?: string
}

export default function LocativaDashboard() {
  const navigate = useNavigate()

  const { data: kpis, isLoading } = useQuery<KPIs>({
    queryKey: ['locativa-kpis'],
    queryFn: () => api.get('/locativa/dashboard/kpis').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: docsVencidos = [] } = useQuery<DocAlert[]>({
    queryKey: ['locativa-docs-vencidos'],
    queryFn: () => api.get('/locativa/activos/documentos/alertas?estado=VENCIDO').then(r => r.data).catch(() => []),
  })

  const { data: docsPorVencer = [] } = useQuery<DocAlert[]>({
    queryKey: ['locativa-docs-por-vencer'],
    queryFn: () => api.get('/locativa/activos/documentos/alertas?estado=POR_VENCER').then(r => r.data).catch(() => []),
  })

  if (isLoading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress sx={{ color: ML_COLOR }} />
        </Box>
      </Layout>
    )
  }

  const k = kpis!

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Mantenimiento Locativo
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              ISO 55000 · ISO 41001 · IAS 16 · ISO 31000
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate('/locativa/ordenes')}
            sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Nueva OT
          </Button>
        </Stack>

        {/* KPI Row 1 — Activos */}
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em', fontWeight: 700 }}>
          Activos
        </Typography>
        <Grid container spacing={2} mt={0.25} mb={3}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Total activos" value={k?.total_activos ?? 0} color={ML_COLOR} icon={<ActivosIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Operativos" value={k?.activos_operativos ?? 0} color="#16A34A" icon={<OkIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="En mantenimiento" value={k?.activos_mantenimiento ?? 0} color="#D97706" icon={<OTIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Fuera de servicio" value={k?.activos_fuera_servicio ?? 0} color="#DC2626" icon={<VencidoIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Críticos" value={k?.activos_criticos ?? 0} color="#7C3AED" icon={<AlertaIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard
              label="Valor en libros"
              value={k?.valor_libros_total != null ? fmt(k.valor_libros_total) : '—'}
              color={ML_COLOR}
              icon={<CostoIcon />}
              sub="IAS 16"
            />
          </Grid>
        </Grid>

        {/* KPI Row 2 — OTs & Confiabilidad */}
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em', fontWeight: 700 }}>
          Órdenes de trabajo · Confiabilidad
        </Typography>
        <Grid container spacing={2} mt={0.25} mb={3}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KPICard label="OT abiertas" value={k?.ot_abiertas ?? 0} color="#D97706" icon={<OTIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KPICard label="OT en progreso" value={k?.ot_en_progreso ?? 0} color={ML_COLOR} icon={<OTIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KPICard
              label="Disponibilidad"
              value={fmtPct(k?.disponibilidad_promedio ?? null)}
              color="#16A34A"
              icon={<DispIcon />}
              sub="Promedio"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KPICard
              label="Fallas este mes"
              value={k?.fallas_mes ?? 0}
              color="#DC2626"
              icon={<AlertaIcon />}
              sub={k?.mtbf_promedio ? `MTBF ${k.mtbf_promedio.toFixed(0)}h` : undefined}
            />
          </Grid>
        </Grid>

        {/* KPI Row 3 — Riesgos & Energía */}
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em', fontWeight: 700 }}>
          Riesgos · Energía · Documentos
        </Typography>
        <Grid container spacing={2} mt={0.25} mb={3}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Riesgos inaceptables" value={k?.riesgos_inaceptables ?? 0} color="#DC2626" icon={<RiesgoIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Total riesgos" value={k?.total_riesgos ?? 0} color="#D97706" icon={<RiesgoIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard
              label="Consumo energía mes"
              value={k?.consumo_energia_mes != null ? `${k.consumo_energia_mes.toFixed(0)} kWh` : '—'}
              color="#7C3AED"
              icon={<EnergiaIcon />}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Lecturas anómalas" value={k?.lecturas_anomalas ?? 0} color="#F59E0B" icon={<AlertaIcon />} sub="ISO 50001" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Docs vencidos" value={k?.documentos_vencidos ?? 0} color="#DC2626" icon={<VencidoIcon />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <KPICard label="Docs por vencer" value={k?.documentos_por_vencer ?? 0} color="#D97706" icon={<PorVencerIcon />} />
          </Grid>
        </Grid>

        {/* Alerts */}
        {(docsVencidos.length > 0 || docsPorVencer.length > 0) && (
          <Grid container spacing={2}>
            {docsVencidos.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={0} sx={{ border: '1px solid #FEE2E2', borderRadius: '14px', p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography fontWeight={700} fontSize={14} color="#DC2626">
                      Documentos vencidos
                    </Typography>
                    <Chip label={docsVencidos.length} size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
                  </Stack>
                  <Stack spacing={1}>
                    {docsVencidos.slice(0, 5).map(d => (
                      <Stack key={d.id} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontSize={13} color="text.primary">{d.tipo_documento}</Typography>
                        <Typography fontSize={12} color="text.secondary">{d.fecha_vencimiento}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Button
                    size="small"
                    endIcon={<GoIcon />}
                    onClick={() => navigate('/locativa/activos')}
                    sx={{ mt: 1.5, color: '#DC2626', textTransform: 'none', p: 0 }}
                  >
                    Ver todos
                  </Button>
                </Paper>
              </Grid>
            )}
            {docsPorVencer.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={0} sx={{ border: '1px solid #FEF3C7', borderRadius: '14px', p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography fontWeight={700} fontSize={14} color="#D97706">
                      Próximos a vencer
                    </Typography>
                    <Chip label={docsPorVencer.length} size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700 }} />
                  </Stack>
                  <Stack spacing={1}>
                    {docsPorVencer.slice(0, 5).map(d => (
                      <Stack key={d.id} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontSize={13} color="text.primary">{d.tipo_documento}</Typography>
                        <Typography fontSize={12} color="text.secondary">{d.fecha_vencimiento}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Button
                    size="small"
                    endIcon={<GoIcon />}
                    onClick={() => navigate('/locativa/activos')}
                    sx={{ mt: 1.5, color: '#D97706', textTransform: 'none', p: 0 }}
                  >
                    Ver todos
                  </Button>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* Quick links */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em', fontWeight: 700 }}>
          Acceso rápido
        </Typography>
        <Grid container spacing={2} mt={0.5}>
          {[
            { label: 'Activos', desc: 'Gestión de activos físicos', path: '/locativa/activos', color: ML_COLOR, icon: <ActivosIcon /> },
            { label: 'Órdenes de trabajo', desc: 'Abrir y gestionar OTs', path: '/locativa/ordenes', color: '#D97706', icon: <OTIcon /> },
            { label: 'Riesgos', desc: 'Registro y matriz ISO 31000', path: '/locativa/riesgos', color: '#DC2626', icon: <RiesgoIcon /> },
            { label: 'Energía', desc: 'Lecturas y anomalías ISO 50001', path: '/locativa/energia', color: '#7C3AED', icon: <EnergiaIcon /> },
          ].map(q => (
            <Grid key={q.path} size={{ xs: 6, sm: 3 }}>
              <Paper
                elevation={0}
                onClick={() => navigate(q.path)}
                sx={{
                  border: '1px solid #E5E7EB', borderRadius: '14px', p: 2, cursor: 'pointer',
                  '&:hover': { border: `1px solid ${alpha(q.color, 0.4)}`, bgcolor: alpha(q.color, 0.03) },
                  transition: 'all 0.15s ease',
                }}
              >
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(q.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  {React.cloneElement(q.icon as React.ReactElement, { sx: { fontSize: 18, color: q.color } })}
                </Box>
                <Typography fontWeight={700} fontSize={13}>{q.label}</Typography>
                <Typography fontSize={11} color="text.secondary" mt={0.25}>{q.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Layout>
  )
}
