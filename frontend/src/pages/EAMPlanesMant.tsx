import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip, Grid,
  Stack, LinearProgress, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { Layout } from '@/components/layout/Layout';

const EAM_COLOR = '#32AC5C';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

type PlanType = 'TIEMPO' | 'USO' | 'CONDICIÓN';
type OTType = 'PREVENTIVA' | 'INSPECCION' | 'PREDICTIVA' | 'CALIBRACION';

interface Plan {
  id: string;
  name: string;
  asset: string;
  assetType: string;
  frequency: string;
  otType: OTType;
  planType: PlanType;
  lastFulfillment: string;
  nextDueDate: string;
  daysRemaining: number;
  compliance: number;
}

const PLANS: Plan[] = [
  {
    id: 'PM-001', name: 'Cambio de aceite motor VH-001', asset: 'VH-001', assetType: 'Vehículo',
    frequency: 'Cada 5.000 km', otType: 'PREVENTIVA', planType: 'USO',
    lastFulfillment: '2026-04-15', nextDueDate: '2026-06-23', daysRemaining: 3, compliance: 95,
  },
  {
    id: 'PM-002', name: 'Cambio de filtros flota', asset: 'Flota General', assetType: 'Vehículo',
    frequency: 'Cada 3 meses', otType: 'PREVENTIVA', planType: 'TIEMPO',
    lastFulfillment: '2026-03-10', nextDueDate: '2026-07-02', daysRemaining: 12, compliance: 88,
  },
  {
    id: 'PM-003', name: 'Revisión hidráulica Montacargas', asset: 'MC-003', assetType: 'Montacargas',
    frequency: 'Cada 250 hrs', otType: 'PREVENTIVA', planType: 'USO',
    lastFulfillment: '2026-05-01', nextDueDate: '2026-07-12', daysRemaining: 22, compliance: 78,
  },
  {
    id: 'PM-004', name: 'Inspección eléctrica general', asset: 'Instalaciones', assetType: 'Infraestructura',
    frequency: 'Mensual', otType: 'INSPECCION', planType: 'TIEMPO',
    lastFulfillment: '2026-05-20', nextDueDate: '2026-06-25', daysRemaining: 5, compliance: 91,
  },
  {
    id: 'PM-005', name: 'Termografía tableros eléctricos', asset: 'Tableros Eléctricos', assetType: 'Infraestructura',
    frequency: 'Semestral', otType: 'PREDICTIVA', planType: 'TIEMPO',
    lastFulfillment: '2025-12-10', nextDueDate: '2026-08-04', daysRemaining: 45, compliance: 100,
  },
  {
    id: 'PM-006', name: 'Inspección cubierta Bodega Bogotá', asset: 'Bodega Bogotá', assetType: 'Infraestructura',
    frequency: 'Trimestral', otType: 'INSPECCION', planType: 'TIEMPO',
    lastFulfillment: '2026-03-15', nextDueDate: '2026-06-28', daysRemaining: 8, compliance: 84,
  },
  {
    id: 'PM-007', name: 'Calibración básculas', asset: 'Básculas Piso', assetType: 'Equipo',
    frequency: 'Anual', otType: 'CALIBRACION', planType: 'TIEMPO',
    lastFulfillment: '2025-06-20', nextDueDate: '2026-08-26', daysRemaining: 67, compliance: 100,
  },
  {
    id: 'PM-008', name: 'Limpieza técnica compresores', asset: 'CMP-07', assetType: 'Equipo',
    frequency: 'Mensual', otType: 'PREVENTIVA', planType: 'CONDICIÓN',
    lastFulfillment: '2026-05-20', nextDueDate: '2026-06-22', daysRemaining: 2, compliance: 72,
  },
];

const OT_COLORS: Record<OTType, string> = {
  PREVENTIVA: '#3B82F6',
  INSPECCION: '#8B5CF6',
  PREDICTIVA: '#10B981',
  CALIBRACION: '#F59E0B',
};

const PLAN_TYPE_COLORS: Record<PlanType, string> = {
  TIEMPO: '#6366F1',
  USO: '#0EA5E9',
  CONDICIÓN: '#14B8A6',
};

function DaysChip({ days }: { days: number }) {
  if (days <= 7) return <Chip label="URGENTE" size="small" sx={{ bgcolor: '#DC2626', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
  if (days <= 15) return <Chip label="PRONTO" size="small" sx={{ bgcolor: '#32AC5C', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
  if (days <= 30) return <Chip label="PRÓXIMO" size="small" sx={{ bgcolor: '#CA8A04', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
  return <Chip label="OK" size="small" sx={{ bgcolor: '#16A34A', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
}

const COMPLIANCE_MONTHLY = [
  { month: 'Ene', value: 81 },
  { month: 'Feb', value: 85 },
  { month: 'Mar', value: 79 },
  { month: 'Abr', value: 88 },
  { month: 'May', value: 90 },
  { month: 'Jun', value: 87 },
];

const ASSET_TYPE_COMPLIANCE = [
  { type: 'Vehículos', compliance: 92 },
  { type: 'Montacargas', compliance: 78 },
  { type: 'Infraestructura', compliance: 84 },
  { type: 'Equipos', compliance: 89 },
];

export default function EAMPlanesMant() {
  const [tab, setTab] = useState(0);

  const grouped: Record<PlanType, Plan[]> = { TIEMPO: [], USO: [], CONDICIÓN: [] };
  PLANS.forEach(p => grouped[p.planType].push(p));

  const sorted = [...PLANS].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh', background: '#F8FAFC' }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1}>
          <Box sx={{ width: 6, height: 36, bgcolor: EAM_COLOR, borderRadius: 1 }} />
          <Typography variant="h4" sx={{ color: EAM_COLOR, fontWeight: 700 }}>
            Planes de Mantenimiento
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          Gestión y seguimiento de planes preventivos, predictivos y de calibración
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: '#9CA3AF', fontWeight: 600 },
              '& .Mui-selected': { color: EAM_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR },
            }}
          >
            <Tab label="Planes Activos" />
            <Tab label="Calendario de Vencimientos" />
            <Tab label="Cumplimiento" />
          </Tabs>
        </Box>

        {/* TAB 0 — Planes Activos */}
        <TabPanel value={tab} index={0}>
          {(['TIEMPO', 'USO', 'CONDICIÓN'] as PlanType[]).map(type => (
            <Box key={type} mb={4}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Chip
                  label={type}
                  size="small"
                  sx={{ bgcolor: PLAN_TYPE_COLORS[type], color: '#fff', fontWeight: 700, fontSize: '0.7rem', letterSpacing: 1 }}
                />
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  {grouped[type].length} plan(es)
                </Typography>
              </Stack>
              <Grid container spacing={2}>
                {grouped[type].map(plan => (
                  <Grid key={plan.id} size={{ xs: 12, md: 6 }}>
                    <Card sx={{ border: `1px solid ${plan.daysRemaining <= 7 ? '#DC2626' : plan.daysRemaining <= 15 ? EAM_COLOR : '#1F2937'}`, borderRadius: 2 }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Typography variant="subtitle2" sx={{ color: '#F9FAFB', fontWeight: 700, flex: 1, pr: 1 }}>
                            {plan.name}
                          </Typography>
                          <DaysChip days={plan.daysRemaining} />
                        </Stack>
                        <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
                          <Chip label={plan.otType} size="small" sx={{ bgcolor: OT_COLORS[plan.otType] + '22', color: OT_COLORS[plan.otType], border: `1px solid ${OT_COLORS[plan.otType]}`, fontSize: '0.65rem', fontWeight: 600 }} />
                          <Chip label={plan.assetType} size="small" sx={{ bgcolor: '#1F2937', color: '#9CA3AF', fontSize: '0.65rem' }} />
                        </Stack>
                        <Grid container spacing={1} mb={1.5}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Activo</Typography>
                            <Typography variant="body2" sx={{ color: '#D1D5DB', fontWeight: 600 }}>{plan.asset}</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Frecuencia</Typography>
                            <Typography variant="body2" sx={{ color: '#D1D5DB', fontWeight: 600 }}>{plan.frequency}</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Último cumplimiento</Typography>
                            <Typography variant="body2" sx={{ color: '#D1D5DB' }}>{plan.lastFulfillment}</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Próximo vencimiento</Typography>
                            <Typography variant="body2" sx={{ color: plan.daysRemaining <= 7 ? '#F87171' : plan.daysRemaining <= 15 ? '#FB923C' : '#D1D5DB', fontWeight: 700 }}>
                              {plan.nextDueDate} ({plan.daysRemaining}d)
                            </Typography>
                          </Grid>
                        </Grid>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Cumplimiento</Typography>
                            <Typography variant="caption" sx={{ color: plan.compliance >= 90 ? '#34D399' : plan.compliance >= 75 ? '#FCD34D' : '#F87171', fontWeight: 700 }}>
                              {plan.compliance}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={plan.compliance}
                            sx={{
                              height: 6, borderRadius: 3, bgcolor: '#1F2937',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: plan.compliance >= 90 ? '#34D399' : plan.compliance >= 75 ? '#FCD34D' : '#F87171',
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </TabPanel>

        {/* TAB 1 — Calendario de Vencimientos */}
        <TabPanel value={tab} index={1}>
          <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>
            Vencimientos ordenados por urgencia
          </Typography>
          <Stack spacing={2}>
            {sorted.map(plan => (
              <Card key={plan.id} sx={{ border: `1px solid ${plan.daysRemaining <= 7 ? '#DC262640' : plan.daysRemaining <= 15 ? '#32AC5C40' : '#1F2937'}`, borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{
                      minWidth: 64, height: 64, borderRadius: 2, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      bgcolor: plan.daysRemaining <= 7 ? '#DC262620' : plan.daysRemaining <= 15 ? '#32AC5C20' : plan.daysRemaining <= 30 ? '#CA8A0420' : '#16A34A20',
                      border: `2px solid ${plan.daysRemaining <= 7 ? '#DC2626' : plan.daysRemaining <= 15 ? '#32AC5C' : plan.daysRemaining <= 30 ? '#CA8A04' : '#16A34A'}`,
                    }}>
                      <Typography sx={{ color: plan.daysRemaining <= 7 ? '#F87171' : plan.daysRemaining <= 15 ? '#FB923C' : plan.daysRemaining <= 30 ? '#FDE68A' : '#34D399', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1 }}>
                        {plan.daysRemaining}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: '0.6rem', fontWeight: 600, letterSpacing: 0.5 }}>DÍAS</Typography>
                    </Box>
                    <Box flex={1}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <Typography variant="subtitle2" sx={{ color: '#F9FAFB', fontWeight: 700 }}>{plan.name}</Typography>
                        <DaysChip days={plan.daysRemaining} />
                      </Stack>
                      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Activo: <Box component="span" sx={{ color: '#D1D5DB', fontWeight: 600 }}>{plan.asset}</Box>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Fecha exacta: <Box component="span" sx={{ color: '#D1D5DB', fontWeight: 600 }}>{plan.nextDueDate}</Box>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Tipo: <Box component="span" sx={{ color: OT_COLORS[plan.otType], fontWeight: 600 }}>{plan.otType}</Box>
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </TabPanel>

        {/* TAB 2 — Cumplimiento */}
        <TabPanel value={tab} index={2}>
          {/* KPIs */}
          <Grid container spacing={2} mb={4}>
            {[
              { label: 'Cumplimiento Global', value: '87%', color: '#34D399', sub: 'de planes activos' },
              { label: 'OTs PM Generadas', value: '245', color: '#60A5FA', sub: 'en el período' },
              { label: 'PM Vencidos', value: '12', color: '#F87171', sub: 'requieren atención' },
              { label: 'Ahorro estimado vs correctivo', value: '$145M', color: '#FCD34D', sub: 'COP acumulado' },
            ].map(kpi => (
              <Grid key={kpi.label} size={{ xs: 12, md: 3 }}>
                <Card sx={{ border: '1px solid #1F2937', borderRadius: 2, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 900, mb: 0.5 }}>{kpi.value}</Typography>
                    <Typography variant="body2" sx={{ color: '#F9FAFB', fontWeight: 600, mb: 0.25 }}>{kpi.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>{kpi.sub}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            {/* Compliance by asset type */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ border: '1px solid #1F2937', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>Cumplimiento por tipo de activo</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#6B7280', borderColor: '#1F2937', fontWeight: 600 }}>Tipo</TableCell>
                          <TableCell sx={{ color: '#6B7280', borderColor: '#1F2937', fontWeight: 600 }}>Cumplimiento</TableCell>
                          <TableCell sx={{ color: '#6B7280', borderColor: '#1F2937', fontWeight: 600 }}>Barra</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ASSET_TYPE_COMPLIANCE.map(row => (
                          <TableRow key={row.type}>
                            <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{row.type}</TableCell>
                            <TableCell sx={{ borderColor: '#1F2937' }}>
                              <Typography sx={{ color: row.compliance >= 90 ? '#34D399' : row.compliance >= 80 ? '#FCD34D' : '#F87171', fontWeight: 700 }}>
                                {row.compliance}%
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ borderColor: '#1F2937', width: 120 }}>
                              <LinearProgress
                                variant="determinate"
                                value={row.compliance}
                                sx={{
                                  height: 8, borderRadius: 4, bgcolor: '#1F2937',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: row.compliance >= 90 ? '#34D399' : row.compliance >= 80 ? '#FCD34D' : '#F87171',
                                    borderRadius: 4,
                                  },
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly bar chart */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ border: '1px solid #1F2937', borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 3 }}>
                    Cumplimiento mensual — últimos 6 meses
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 160, px: 1 }}>
                    {COMPLIANCE_MONTHLY.map(m => (
                      <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: m.value >= 90 ? '#34D399' : m.value >= 80 ? '#FCD34D' : '#F87171', fontWeight: 700 }}>
                          {m.value}%
                        </Typography>
                        <Box sx={{
                          width: '100%',
                          height: `${m.value * 1.4}px`,
                          bgcolor: m.value >= 90 ? '#34D39940' : m.value >= 80 ? '#FCD34D40' : '#F8717140',
                          border: `2px solid ${m.value >= 90 ? '#34D399' : m.value >= 80 ? '#FCD34D' : '#F87171'}`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }} />
                        <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>{m.month}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ borderColor: '#1F2937', mt: 1, mb: 1.5 }} />
                  <Stack direction="row" spacing={2} justifyContent="center">
                    {[{ color: '#34D399', label: '≥ 90% Excelente' }, { color: '#FCD34D', label: '80-89% Aceptable' }, { color: '#F87171', label: '< 80% Requiere acción' }].map(l => (
                      <Stack key={l.label} direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: l.color }} />
                        <Typography variant="caption" sx={{ color: '#6B7280' }}>{l.label}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>
    </Layout>
  );
}
