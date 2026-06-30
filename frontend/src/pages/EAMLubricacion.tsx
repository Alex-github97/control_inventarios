import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip, Grid,
  Stack, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { Layout } from '@/components/layout/Layout';

const EAM_COLOR = '#32AC5C';
const CARD_BG = '#0F1E35';
const DARK_BG = '#060C1A';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

type Contamination = 'NORMAL' | 'MODERADA' | 'CRITICA';
type AlertLevel = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';

interface OilSample {
  id: string;
  asset: string;
  component: string;
  date: string;
  lubricant: string;
  hours: number;
  fe: number;
  cu: number;
  al: number;
  si: number;
  water: number;
  viscosity: number;
  contamination: Contamination;
  alert: string | null;
}

interface TrendSample {
  date: string;
  fe: number;
  cu: number;
  al: number;
  si: number;
  contamination: Contamination;
}

interface PredictiveAlert {
  id: string;
  asset: string;
  component: string;
  finding: string;
  recommendation: string;
  level: AlertLevel;
}

interface ChangeRecommendation {
  asset: string;
  lubricant: string;
  currentHours: number;
  recommendedAt: number;
  reason: string;
}

interface MonthlyConsumption {
  month: string;
  liters: number;
  cost: number;
}

const CONTAMINATION_COLORS: Record<Contamination, string> = {
  NORMAL: '#16A34A',
  MODERADA: '#CA8A04',
  CRITICA: '#DC2626',
};

const ALERT_COLORS: Record<AlertLevel, string> = {
  URGENTE: '#DC2626',
  ALTA: '#32AC5C',
  MEDIA: '#CA8A04',
  BAJA: '#6B7280',
};

const SAMPLES: OilSample[] = [
  { id: 'MU-001', asset: 'VH-001', component: 'Motor', date: '2026-06-10', lubricant: 'Shell Rimula R4X 15W-40', hours: 14520, fe: 82, cu: 12, al: 8, si: 18, water: 0.05, viscosity: 108.4, contamination: 'MODERADA', alert: 'Fe elevado — posible desgaste de cilindros' },
  { id: 'MU-002', asset: 'VH-003', component: 'Motor', date: '2026-06-08', lubricant: 'Shell Rimula R4X 15W-40', hours: 9870, fe: 34, cu: 7, al: 4, si: 9, water: 0.02, viscosity: 112.1, contamination: 'NORMAL', alert: null },
  { id: 'MU-003', asset: 'MC-003', component: 'Sistema Hidráulico', date: '2026-06-12', lubricant: 'Shell Tellus S2 M 46', hours: 6240, fe: 15, cu: 5, al: 3, si: 142, water: 0.18, viscosity: 46.8, contamination: 'CRITICA', alert: 'Silicio crítico — contaminación por tierra/polvo' },
  { id: 'MU-004', asset: 'VH-007', component: 'Caja de cambios', date: '2026-06-11', lubricant: 'Shell Spirax S4 TXM', hours: 22100, fe: 44, cu: 23, al: 6, si: 7, water: 0.03, viscosity: 95.6, contamination: 'MODERADA', alert: 'Cu elevado — revisar bujes de caja' },
  { id: 'MU-005', asset: 'CMP-07', component: 'Compresor', date: '2026-06-09', lubricant: 'Shell Corena S3 R 46', hours: 8800, fe: 28, cu: 9, al: 5, si: 11, water: 0.04, viscosity: 41.2, contamination: 'NORMAL', alert: null },
  { id: 'MU-006', asset: 'VH-012', component: 'Motor', date: '2026-06-07', lubricant: 'Shell Rimula R4X 15W-40', hours: 31440, fe: 118, cu: 18, al: 15, si: 25, water: 0.11, viscosity: 98.7, contamination: 'CRITICA', alert: 'Fe y Al críticos — desgaste acelerado, cambio urgente' },
  { id: 'MU-007', asset: 'MC-001', component: 'Transmisión', date: '2026-06-05', lubricant: 'Shell Spirax S4 TXM', hours: 4320, fe: 19, cu: 8, al: 2, si: 6, water: 0.01, viscosity: 98.1, contamination: 'NORMAL', alert: null },
  { id: 'MU-008', asset: 'VH-019', component: 'Diferencial', date: '2026-06-13', lubricant: 'Shell Spirax S5 ATE 75W-90', hours: 18760, fe: 61, cu: 14, al: 9, si: 13, water: 0.07, viscosity: 134.5, contamination: 'MODERADA', alert: 'Fe moderado — monitorear tendencia' },
];

const VH001_TREND: TrendSample[] = [
  { date: '2025-12-10', fe: 28, cu: 8, al: 3, si: 10, contamination: 'NORMAL' },
  { date: '2026-01-15', fe: 34, cu: 9, al: 4, si: 11, contamination: 'NORMAL' },
  { date: '2026-02-20', fe: 48, cu: 10, al: 5, si: 13, contamination: 'NORMAL' },
  { date: '2026-03-28', fe: 59, cu: 11, al: 6, si: 15, contamination: 'MODERADA' },
  { date: '2026-05-04', fe: 71, cu: 11, al: 7, si: 16, contamination: 'MODERADA' },
  { date: '2026-06-10', fe: 82, cu: 12, al: 8, si: 18, contamination: 'MODERADA' },
];

const FE_ALERT_LIMIT = 75;

const PREDICTIVE_ALERTS: PredictiveAlert[] = [
  { id: 'IA-001', asset: 'VH-001', component: 'Motor', finding: 'Desgaste de metal detectado — tendencia alcista en Fe (28→82 ppm en 6 meses)', recommendation: 'Cambio de aceite en 500 km — Inspección de camisas de cilindros', level: 'URGENTE' },
  { id: 'IA-002', asset: 'MC-003', component: 'Sistema Hidráulico', finding: 'Contaminación por silicio detectada (142 ppm — límite: 20 ppm)', recommendation: 'Inspección de sellos de cilindros hidráulicos recomendada — filtro de alta presión', level: 'ALTA' },
  { id: 'IA-003', asset: 'CMP-07', component: 'Compresor', finding: 'TBN bajo detectado — lubricante con vida útil al límite', recommendation: 'Próximo análisis en 200 horas — considerar cambio preventivo', level: 'MEDIA' },
];

const CHANGE_RECOMMENDATIONS: ChangeRecommendation[] = [
  { asset: 'VH-001', lubricant: 'Shell Rimula R4X 15W-40', currentHours: 14520, recommendedAt: 15000, reason: 'Fe elevado + ciclo de 500 km' },
  { asset: 'MC-003', lubricant: 'Shell Tellus S2 M 46', currentHours: 6240, recommendedAt: 6240, reason: 'Contaminación silicio crítica' },
  { asset: 'VH-012', lubricant: 'Shell Rimula R4X 15W-40', currentHours: 31440, recommendedAt: 31000, reason: 'Desgaste acelerado — vencido' },
  { asset: 'VH-007', lubricant: 'Shell Spirax S4 TXM', currentHours: 22100, recommendedAt: 24000, reason: 'Cu moderado — monitorear' },
  { asset: 'VH-019', lubricant: 'Shell Spirax S5 ATE 75W-90', currentHours: 18760, recommendedAt: 20000, reason: 'Fe moderado — próximo ciclo' },
];

const MONTHLY_CONSUMPTION: MonthlyConsumption[] = [
  { month: 'Ene', liters: 384, cost: 9216000 },
  { month: 'Feb', liters: 312, cost: 7488000 },
  { month: 'Mar', liters: 428, cost: 10272000 },
  { month: 'Abr', liters: 356, cost: 8544000 },
  { month: 'May', liters: 402, cost: 9648000 },
  { month: 'Jun', liters: 217, cost: 5208000 },
];

const MAX_LITERS = Math.max(...MONTHLY_CONSUMPTION.map(m => m.liters));
const MAX_FE = Math.max(...VH001_TREND.map(s => s.fe), FE_ALERT_LIMIT + 10);

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

export default function EAMLubricacion() {
  const [tab, setTab] = useState(0);

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh', background: DARK_BG }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1}>
          <Box sx={{ width: 6, height: 36, bgcolor: EAM_COLOR, borderRadius: 1 }} />
          <Typography variant="h4" sx={{ color: EAM_COLOR, fontWeight: 700 }}>
            Gestión de Lubricación
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          Análisis de aceites, tendencias tribológicas e inteligencia predictiva de lubricación
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
            <Tab label="Laboratorio de Aceites" />
            <Tab label="Tendencias" />
            <Tab label="IA Predictiva Lubricación" />
          </Tabs>
        </Box>

        {/* TAB 0 — Laboratorio de Aceites */}
        <TabPanel value={tab} index={0}>
          {/* KPIs */}
          <Grid container spacing={2} mb={3}>
            {[
              { label: 'Total Muestras', value: '156', color: '#60A5FA', sub: 'en el historial' },
              { label: 'Alertas Activas', value: '4', color: '#F87171', sub: 'requieren acción' },
              { label: 'Cambios Recomendados', value: '7', color: '#FCD34D', sub: 'esta semana' },
              { label: 'Análisis Este Mes', value: '23', color: '#34D399', sub: 'muestras procesadas' },
            ].map(kpi => (
              <Grid key={kpi.label} size={{ xs: 12, md: 3 }}>
                <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 900, mb: 0.5 }}>{kpi.value}</Typography>
                    <Typography variant="body2" sx={{ color: '#F9FAFB', fontWeight: 600, mb: 0.25 }}>{kpi.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>{kpi.sub}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Samples table */}
          <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>
                Muestras de laboratorio — resultados analíticos
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#060C1A', color: '#6B7280', fontWeight: 700, borderColor: '#1F2937', fontSize: '0.7rem', whiteSpace: 'nowrap' } }}>
                        <TableCell>Muestra</TableCell>
                        <TableCell>Activo</TableCell>
                        <TableCell>Componente</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Lubricante</TableCell>
                        <TableCell>Horas</TableCell>
                        <TableCell>Fe (ppm)</TableCell>
                        <TableCell>Cu (ppm)</TableCell>
                        <TableCell>Al (ppm)</TableCell>
                        <TableCell>Si (ppm)</TableCell>
                        <TableCell>Agua %</TableCell>
                        <TableCell>Visc @40</TableCell>
                        <TableCell>Contaminación</TableCell>
                        <TableCell>Alerta</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {SAMPLES.map(s => (
                        <TableRow key={s.id} sx={{ '&:hover': { bgcolor: '#1F293750' } }}>
                          <TableCell sx={{ color: '#6B7280', borderColor: '#1F2937', fontSize: '0.75rem' }}>{s.id}</TableCell>
                          <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937', fontWeight: 700 }}>{s.asset}</TableCell>
                          <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.8rem' }}>{s.component}</TableCell>
                          <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.75rem' }}>{s.date}</TableCell>
                          <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.72rem', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.lubricant}</TableCell>
                          <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{s.hours.toLocaleString()}</TableCell>
                          <TableCell sx={{ borderColor: '#1F2937' }}>
                            <Typography sx={{ color: s.fe > 75 ? '#F87171' : s.fe > 50 ? '#FCD34D' : '#34D399', fontWeight: 700 }}>{s.fe}</Typography>
                          </TableCell>
                          <TableCell sx={{ color: s.cu > 20 ? '#FCD34D' : '#D1D5DB', borderColor: '#1F2937' }}>{s.cu}</TableCell>
                          <TableCell sx={{ color: s.al > 10 ? '#FCD34D' : '#D1D5DB', borderColor: '#1F2937' }}>{s.al}</TableCell>
                          <TableCell sx={{ borderColor: '#1F2937' }}>
                            <Typography sx={{ color: s.si > 30 ? '#F87171' : s.si > 15 ? '#FCD34D' : '#D1D5DB', fontWeight: s.si > 30 ? 700 : 400 }}>{s.si}</Typography>
                          </TableCell>
                          <TableCell sx={{ color: s.water > 0.1 ? '#F87171' : '#D1D5DB', borderColor: '#1F2937' }}>{s.water.toFixed(2)}</TableCell>
                          <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{s.viscosity}</TableCell>
                          <TableCell sx={{ borderColor: '#1F2937' }}>
                            <Chip
                              label={s.contamination}
                              size="small"
                              sx={{
                                bgcolor: CONTAMINATION_COLORS[s.contamination] + '22',
                                color: CONTAMINATION_COLORS[s.contamination],
                                border: `1px solid ${CONTAMINATION_COLORS[s.contamination]}`,
                                fontWeight: 700, fontSize: '0.62rem',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ borderColor: '#1F2937', maxWidth: 200 }}>
                            {s.alert ? (
                              <Typography variant="caption" sx={{ color: '#F87171', fontSize: '0.7rem' }}>{s.alert}</Typography>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#34D399', fontSize: '0.7rem' }}>Sin alertas</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* TAB 1 — Tendencias */}
        <TabPanel value={tab} index={1}>
          <Grid container spacing={3}>
            {/* Fe trend chart */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 0.5 }}>
                    VH-001 Tractocamión Kenworth — Hierro (Fe ppm)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>Tendencia de las últimas 6 muestras</Typography>

                  <Box sx={{ mt: 3, mb: 1, position: 'relative' }}>
                    {/* Alert limit line */}
                    <Box sx={{
                      position: 'absolute',
                      top: `${100 - (FE_ALERT_LIMIT / MAX_FE) * 100}%`,
                      left: 0, right: 0,
                      borderTop: '2px dashed #DC2626',
                      zIndex: 2,
                    }}>
                      <Typography variant="caption" sx={{ color: '#F87171', fontSize: '0.65rem', ml: 0.5, bgcolor: CARD_BG, px: 0.5 }}>
                        Límite: {FE_ALERT_LIMIT} ppm
                      </Typography>
                    </Box>

                    {/* Bars */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 160, position: 'relative', zIndex: 1 }}>
                      {VH001_TREND.map((s, i) => {
                        const heightPct = (s.fe / MAX_FE) * 100;
                        const isOverLimit = s.fe > FE_ALERT_LIMIT;
                        return (
                          <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: isOverLimit ? '#F87171' : '#34D399', fontWeight: 700, fontSize: '0.7rem' }}>
                              {s.fe}
                            </Typography>
                            <Box sx={{
                              width: '100%',
                              height: `${heightPct * 1.6}px`,
                              bgcolor: isOverLimit ? '#DC262630' : '#3B82F630',
                              border: `2px solid ${isOverLimit ? '#DC2626' : '#3B82F6'}`,
                              borderRadius: '4px 4px 0 0',
                            }} />
                            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.6rem', textAlign: 'center' }}>
                              {s.date.substring(5)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: '#1F2937', my: 2 }} />

                  {/* Interpretation */}
                  <Box sx={{ bgcolor: '#DC262615', border: '1px solid #DC262640', borderRadius: 1, p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#F87171', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Diagnóstico actual — IA Tribológica
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#D1D5DB', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      El hierro en VH-001 muestra una tendencia alcista sostenida de 28 ppm (dic-25) a 82 ppm (jun-26), superando el límite de alerta de 75 ppm.
                      La tasa de incremento (~9 ppm/mes) indica desgaste progresivo de cilindros o anillos de pistón.
                      Se recomienda cambio inmediato de aceite e inspección de motor antes de las próximas 500 km de operación.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Trend data table */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>
                    Historial de 6 muestras — VH-001 Motor
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#060C1A', color: '#6B7280', fontWeight: 700, borderColor: '#1F2937', fontSize: '0.68rem' } }}>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Fe</TableCell>
                          <TableCell>Cu</TableCell>
                          <TableCell>Al</TableCell>
                          <TableCell>Si</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {VH001_TREND.map((s, i) => (
                          <TableRow key={i} sx={{ '&:hover': { bgcolor: '#1F293750' } }}>
                            <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.75rem' }}>{s.date}</TableCell>
                            <TableCell sx={{ borderColor: '#1F2937' }}>
                              <Typography sx={{ color: s.fe > FE_ALERT_LIMIT ? '#F87171' : '#34D399', fontWeight: 700, fontSize: '0.8rem' }}>{s.fe}</Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{s.cu}</TableCell>
                            <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{s.al}</TableCell>
                            <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{s.si}</TableCell>
                            <TableCell sx={{ borderColor: '#1F2937' }}>
                              <Chip
                                label={s.contamination}
                                size="small"
                                sx={{
                                  bgcolor: CONTAMINATION_COLORS[s.contamination] + '22',
                                  color: CONTAMINATION_COLORS[s.contamination],
                                  fontWeight: 700, fontSize: '0.6rem',
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
          </Grid>
        </TabPanel>

        {/* TAB 2 — IA Predictiva Lubricación */}
        <TabPanel value={tab} index={2}>
          {/* Predictive alerts */}
          <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>
            Alertas predictivas generadas por IA
          </Typography>
          <Grid container spacing={2} mb={4}>
            {PREDICTIVE_ALERTS.map(alert => (
              <Grid key={alert.id} size={{ xs: 12, md: 4 }}>
                <Card sx={{
                  bgcolor: CARD_BG,
                  border: `2px solid ${ALERT_COLORS[alert.level]}40`,
                  borderRadius: 2, height: '100%',
                }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip
                        label={alert.level}
                        size="small"
                        sx={{
                          bgcolor: ALERT_COLORS[alert.level] + '22',
                          color: ALERT_COLORS[alert.level],
                          border: `1px solid ${ALERT_COLORS[alert.level]}`,
                          fontWeight: 700, fontSize: '0.65rem',
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>{alert.id}</Typography>
                    </Stack>

                    <Typography variant="subtitle1" sx={{ color: EAM_COLOR, fontWeight: 700, mb: 0.25 }}>{alert.asset}</Typography>
                    <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1.5 }}>{alert.component}</Typography>

                    <Box sx={{ bgcolor: '#060C1A', borderRadius: 1, p: 1, mb: 1.5, border: '1px solid #1F2937' }}>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 0.25, fontWeight: 600 }}>HALLAZGO</Typography>
                      <Typography variant="body2" sx={{ color: '#D1D5DB', fontSize: '0.8rem', lineHeight: 1.5 }}>{alert.finding}</Typography>
                    </Box>

                    <Box sx={{ bgcolor: ALERT_COLORS[alert.level] + '10', borderRadius: 1, p: 1, border: `1px solid ${ALERT_COLORS[alert.level]}30` }}>
                      <Typography variant="caption" sx={{ color: ALERT_COLORS[alert.level], display: 'block', mb: 0.25, fontWeight: 700 }}>RECOMENDACIÓN</Typography>
                      <Typography variant="body2" sx={{ color: '#D1D5DB', fontSize: '0.8rem', lineHeight: 1.5 }}>{alert.recommendation}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            {/* Change recommendations table */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>
                    Recomendaciones de cambio programadas
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#060C1A', color: '#6B7280', fontWeight: 700, borderColor: '#1F2937', fontSize: '0.7rem' } }}>
                          <TableCell>Activo</TableCell>
                          <TableCell>Lubricante</TableCell>
                          <TableCell>Hrs actuales</TableCell>
                          <TableCell>Cambio en</TableCell>
                          <TableCell>Motivo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {CHANGE_RECOMMENDATIONS.map((r, i) => {
                          const diff = r.recommendedAt - r.currentHours;
                          const isOverdue = diff <= 0;
                          return (
                            <TableRow key={i} sx={{ '&:hover': { bgcolor: '#1F293750' } }}>
                              <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937', fontWeight: 700 }}>{r.asset}</TableCell>
                              <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.75rem' }}>{r.lubricant}</TableCell>
                              <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{r.currentHours.toLocaleString()}</TableCell>
                              <TableCell sx={{ borderColor: '#1F2937' }}>
                                <Typography sx={{ color: isOverdue ? '#F87171' : diff < 500 ? '#FCD34D' : '#34D399', fontWeight: 700 }}>
                                  {isOverdue ? `VENCIDO (${Math.abs(diff)} hrs)` : `${diff} hrs`}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.75rem' }}>{r.reason}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly consumption */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 3 }}>
                    Consumo de lubricantes — mensual
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 130, mb: 1 }}>
                    {MONTHLY_CONSUMPTION.map(m => (
                      <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: '0.65rem' }}>
                          {m.liters}L
                        </Typography>
                        <Box sx={{
                          width: '100%',
                          height: `${(m.liters / MAX_LITERS) * 110}px`,
                          bgcolor: '#32AC5C20',
                          border: `2px solid ${EAM_COLOR}`,
                          borderRadius: '4px 4px 0 0',
                        }} />
                        <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, fontSize: '0.65rem' }}>{m.month}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ borderColor: '#1F2937', mb: 1.5 }} />
                  <Stack spacing={0.5}>
                    {MONTHLY_CONSUMPTION.slice().reverse().slice(0, 3).map(m => (
                      <Stack key={m.month} direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>{m.month} 2026</Typography>
                        <Stack direction="row" spacing={2}>
                          <Typography variant="caption" sx={{ color: '#D1D5DB', fontWeight: 600 }}>{m.liters} L</Typography>
                          <Typography variant="caption" sx={{ color: EAM_COLOR, fontWeight: 600 }}>{formatCOP(m.cost)}</Typography>
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                  <Divider sx={{ borderColor: '#1F2937', mt: 1.5, mb: 1 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700 }}>Total acumulado (6 meses)</Typography>
                    <Typography variant="caption" sx={{ color: '#FCD34D', fontWeight: 700 }}>
                      {formatCOP(MONTHLY_CONSUMPTION.reduce((acc, m) => acc + m.cost, 0))}
                    </Typography>
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
