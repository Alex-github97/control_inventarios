import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { Layout } from '@/components/layout/Layout';

// ─── Theme Constants ──────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2';
const MES_DARK = '#0E7490';
const MES_BORDER = 'rgba(8,145,178,0.25)';
const BG_PAGE = '#060C1A';
const BG_CARD = '#0F1E35';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface KpiCard {
  label: string;
  value: string;
  unit?: string;
}

interface ProductionLine {
  id: string;
  name: string;
  oee: number;
  status: 'OPERATIVA' | 'PARADA' | 'SETUP';
  currentProduction: number;
  target: number;
  shift: string;
}

interface ActiveOrder {
  id: string;
  number: string;
  product: string;
  priority: 'URGENTE' | 'ALTA' | 'NORMAL';
  progress: number;
  remainingTime: string;
}

interface ActiveStop {
  id: string;
  equipment: string;
  type: 'MECÁNICA' | 'CALIDAD' | 'MATERIAL' | 'SETUP';
  durationMinutes: number;
}

interface ScrapEntry {
  label: string;
  percentage: number;
  color: string;
}

interface Alert {
  id: string;
  level: 'CRITICA' | 'ADVERTENCIA' | 'INFO';
  description: string;
  time: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const kpiCards: KpiCard[] = [
  { label: 'OEE Global', value: '87.3', unit: '%' },
  { label: 'Órdenes Activas', value: '12' },
  { label: 'Producción Hoy', value: '8,420', unit: ' un' },
  { label: 'Scrap Rate', value: '2.1', unit: '%' },
  { label: 'Disponibilidad', value: '91.2', unit: '%' },
  { label: 'Rendimiento', value: '95.8', unit: '%' },
  { label: 'Calidad', value: '99.4', unit: '%' },
  { label: 'Cumplimiento PM', value: '87', unit: '%' },
];

const productionLines: ProductionLine[] = [
  { id: '1', name: 'Línea 01 — Ensamble A', oee: 91, status: 'OPERATIVA', currentProduction: 1240, target: 1400, shift: 'Turno Mañana' },
  { id: '2', name: 'Línea 02 — Soldadura', oee: 78, status: 'OPERATIVA', currentProduction: 870, target: 1200, shift: 'Turno Mañana' },
  { id: '3', name: 'Línea 03 — Pintura', oee: 0, status: 'PARADA', currentProduction: 0, target: 900, shift: 'Turno Mañana' },
  { id: '4', name: 'Línea 04 — Corte CNC', oee: 85, status: 'OPERATIVA', currentProduction: 2100, target: 2500, shift: 'Turno Tarde' },
  { id: '5', name: 'Línea 05 — Empaque', oee: 62, status: 'SETUP', currentProduction: 300, target: 1000, shift: 'Turno Tarde' },
  { id: '6', name: 'Línea 06 — QA Final', oee: 96, status: 'OPERATIVA', currentProduction: 1910, target: 2000, shift: 'Turno Noche' },
];

const activeOrders: ActiveOrder[] = [
  { id: '1', number: 'OP-2024-001', product: 'Componente Alpha X200', priority: 'URGENTE', progress: 82, remainingTime: '1h 20m' },
  { id: '2', number: 'OP-2024-002', product: 'Módulo Beta V3', priority: 'ALTA', progress: 65, remainingTime: '2h 45m' },
  { id: '3', number: 'OP-2024-003', product: 'Chasis Gamma 500', priority: 'NORMAL', progress: 40, remainingTime: '4h 10m' },
  { id: '4', number: 'OP-2024-004', product: 'Ensamble Delta Pro', priority: 'ALTA', progress: 91, remainingTime: '0h 35m' },
  { id: '5', number: 'OP-2024-005', product: 'Pieza Épsilon M10', priority: 'URGENTE', progress: 55, remainingTime: '3h 00m' },
  { id: '6', number: 'OP-2024-006', product: 'Subensamble Zeta', priority: 'NORMAL', progress: 20, remainingTime: '6h 50m' },
  { id: '7', number: 'OP-2024-007', product: 'Tapa Eta Reforzada', priority: 'ALTA', progress: 73, remainingTime: '1h 55m' },
  { id: '8', number: 'OP-2024-008', product: 'Carcasa Theta Plus', priority: 'NORMAL', progress: 10, remainingTime: '8h 30m' },
];

const activeStops: ActiveStop[] = [
  { id: '1', equipment: 'Robot Soldadura R-02', type: 'MECÁNICA', durationMinutes: 145 },
  { id: '2', equipment: 'Cabina Pintura P-01', type: 'CALIDAD', durationMinutes: 87 },
  { id: '3', equipment: 'Troqueladora T-05', type: 'MATERIAL', durationMinutes: 32 },
  { id: '4', equipment: 'CNC Fresadora F-03', type: 'SETUP', durationMinutes: 20 },
  { id: '5', equipment: 'Banda Transporte B-07', type: 'MECÁNICA', durationMinutes: 210 },
  { id: '6', equipment: 'Inyectora I-04', type: 'CALIDAD', durationMinutes: 58 },
];

const scrapData: ScrapEntry[] = [
  { label: 'NORMAL', percentage: 68, color: '#22c55e' },
  { label: 'REPROCESO', percentage: 22, color: '#f59e0b' },
  { label: 'DEFECTO CALIDAD', percentage: 10, color: '#ef4444' },
];

const alerts: Alert[] = [
  { id: '1', level: 'CRITICA', description: 'Banda Transporte B-07 fuera de servicio — más de 3h', time: 'Hace 3h 30m' },
  { id: '2', level: 'CRITICA', description: 'Temperatura horno P-01 supera límite operativo 340°C', time: 'Hace 1h 27m' },
  { id: '3', level: 'ADVERTENCIA', description: 'OEE Línea 02 por debajo del umbral mínimo (80%)', time: 'Hace 45m' },
  { id: '4', level: 'ADVERTENCIA', description: 'Stock materia prima Troqueladora T-05 crítico', time: 'Hace 32m' },
  { id: '5', level: 'INFO', description: 'Mantenimiento preventivo Robot R-04 programado en 2h', time: 'Hace 10m' },
];

// ─── Helper Style Maps ────────────────────────────────────────────────────────
const statusColors: Record<ProductionLine['status'], { bg: string; text: string }> = {
  OPERATIVA: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  PARADA: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  SETUP: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
};

const priorityColors: Record<ActiveOrder['priority'], { bg: string; text: string; border: string }> = {
  URGENTE: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.35)' },
  ALTA: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  NORMAL: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.35)' },
};

const stopTypeColors: Record<ActiveStop['type'], { bg: string; text: string }> = {
  'MECÁNICA': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  'CALIDAD': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'MATERIAL': { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  'SETUP': { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
};

const stopTrafficLight = (minutes: number): string => {
  if (minutes >= 120) return '#ef4444';
  if (minutes >= 60) return '#f59e0b';
  return '#22c55e';
};

const alertColors: Record<Alert['level'], { bg: string; text: string; border: string }> = {
  CRITICA: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.35)' },
  ADVERTENCIA: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  INFO: { bg: 'rgba(8,145,178,0.12)', text: MES_COLOR, border: MES_BORDER },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** CSS horizontal progress bar */
const CssBar: React.FC<{ value: number; color?: string; height?: number }> = ({
  value,
  color = MES_COLOR,
  height = 6,
}) => (
  <Box
    sx={{
      width: '100%',
      height,
      borderRadius: height / 2,
      bgcolor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        width: `${Math.min(Math.max(value, 0), 100)}%`,
        height: '100%',
        bgcolor: color,
        borderRadius: height / 2,
        transition: 'width 0.4s ease',
      }}
    />
  </Box>
);

/** Single KPI card */
const KpiCard: React.FC<{ card: KpiCard }> = ({ card }) => (
  <Paper
    elevation={0}
    sx={{
      bgcolor: BG_CARD,
      border: `1px solid ${MES_BORDER}`,
      borderRadius: 2,
      p: 1.5,
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
      minWidth: 0,
    }}
  >
    <Typography
      variant="caption"
      sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      {card.label}
    </Typography>
    <Typography
      sx={{
        color: '#fff',
        fontSize: '1.3rem',
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {card.value}
      {card.unit && (
        <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 400, color: MES_COLOR, ml: 0.4 }}>
          {card.unit}
        </Box>
      )}
    </Typography>
  </Paper>
);

/** Production line card */
const LineCard: React.FC<{ line: ProductionLine }> = ({ line }) => {
  const progressPct = line.target > 0 ? Math.round((line.currentProduction / line.target) * 100) : 0;
  const sc = statusColors[line.status];
  return (
    <Box
      sx={{
        bgcolor: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: 1.5,
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ color: '#e2e8f0', fontSize: '0.72rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {line.name}
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: 0.2,
            borderRadius: 0.75,
            bgcolor: sc.bg,
            border: `1px solid ${sc.text}33`,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: sc.text, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            {line.status}
          </Typography>
        </Box>
      </Box>

      {/* OEE bar */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6rem' }}>OEE</Typography>
          <Typography sx={{ color: MES_COLOR, fontSize: '0.6rem', fontWeight: 700 }}>{line.oee}%</Typography>
        </Box>
        <CssBar value={line.oee} color={line.oee >= 85 ? '#22c55e' : line.oee >= 65 ? '#f59e0b' : '#ef4444'} height={5} />
      </Box>

      {/* Production vs target */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6rem' }}>
          Prod: <Box component="span" sx={{ color: '#e2e8f0', fontWeight: 600 }}>{line.currentProduction.toLocaleString()}</Box>
          {' / '}{line.target.toLocaleString()} un
        </Typography>
        <Typography sx={{ color: progressPct >= 80 ? '#22c55e' : '#f59e0b', fontSize: '0.6rem', fontWeight: 700 }}>
          {progressPct}%
        </Typography>
      </Box>

      <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem' }}>{line.shift}</Typography>
    </Box>
  );
};

/** Active order row */
const OrderRow: React.FC<{ order: ActiveOrder }> = ({ order }) => {
  const pc = priorityColors[order.priority];
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.6,
        py: 0.9,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Typography sx={{ color: MES_COLOR, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
            {order.number}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.62rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.product}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 0.7,
            py: 0.15,
            borderRadius: 0.75,
            bgcolor: pc.bg,
            border: `1px solid ${pc.border}`,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: pc.text, fontSize: '0.58rem', fontWeight: 700 }}>{order.priority}</Typography>
        </Box>
      </Box>
      <CssBar
        value={order.progress}
        color={order.progress >= 80 ? '#22c55e' : order.progress >= 50 ? MES_COLOR : '#f59e0b'}
        height={4}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.58rem' }}>
          Progreso: <Box component="span" sx={{ color: '#e2e8f0' }}>{order.progress}%</Box>
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.58rem' }}>
          Restante: <Box component="span" sx={{ color: '#f59e0b' }}>{order.remainingTime}</Box>
        </Typography>
      </Box>
    </Box>
  );
};

/** Active stop row */
const StopRow: React.FC<{ stop: ActiveStop }> = ({ stop }) => {
  const tc = stopTypeColors[stop.type];
  const dot = stopTrafficLight(stop.durationMinutes);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.85,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Traffic light dot */}
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dot, flexShrink: 0, boxShadow: `0 0 6px ${dot}` }} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: '#e2e8f0', fontSize: '0.68rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stop.equipment}
        </Typography>
        <Typography sx={{ color: dot, fontSize: '0.6rem', mt: 0.15 }}>
          {stop.durationMinutes} min detenido
        </Typography>
      </Box>

      <Box
        sx={{
          px: 0.7,
          py: 0.2,
          borderRadius: 0.75,
          bgcolor: tc.bg,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ color: tc.text, fontSize: '0.58rem', fontWeight: 700 }}>{stop.type}</Typography>
      </Box>
    </Box>
  );
};

/** Scrap horizontal bar row */
const ScrapBar: React.FC<{ entry: ScrapEntry }> = ({ entry }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>{entry.label}</Typography>
      <Typography sx={{ color: entry.color, fontSize: '0.7rem', fontWeight: 700 }}>{entry.percentage}%</Typography>
    </Box>
    <CssBar value={entry.percentage} color={entry.color} height={10} />
  </Box>
);

/** Alert row */
const AlertRow: React.FC<{ alert: Alert }> = ({ alert }) => {
  const ac = alertColors[alert.level];
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        py: 0.9,
        px: 1,
        borderRadius: 1,
        bgcolor: ac.bg,
        border: `1px solid ${ac.border}`,
        mb: 0.75,
        '&:last-child': { mb: 0 },
      }}
    >
      <Box
        sx={{
          px: 0.65,
          py: 0.15,
          borderRadius: 0.5,
          bgcolor: `${ac.text}22`,
          border: `1px solid ${ac.border}`,
          flexShrink: 0,
          mt: 0.1,
        }}
      >
        <Typography sx={{ color: ac.text, fontSize: '0.57rem', fontWeight: 700 }}>{alert.level}</Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: '#e2e8f0', fontSize: '0.68rem', lineHeight: 1.35 }}>
          {alert.description}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', mt: 0.3 }}>
          {alert.time}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Shared section card wrapper ──────────────────────────────────────────────
const SectionCard: React.FC<{ title: string; children: React.ReactNode; minHeight?: number }> = ({
  title,
  children,
  minHeight,
}) => (
  <Paper
    elevation={0}
    sx={{
      bgcolor: BG_CARD,
      border: `1px solid ${MES_BORDER}`,
      borderRadius: 2,
      p: 2,
      height: '100%',
      minHeight,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Typography
      sx={{
        color: MES_COLOR,
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        mb: 1.5,
        borderBottom: `1px solid ${MES_BORDER}`,
        pb: 1,
        flexShrink: 0,
      }}
    >
      {title}
    </Typography>
    <Box sx={{ flex: 1, overflow: 'hidden' }}>{children}</Box>
  </Paper>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const MESDashboard: React.FC = () => {
  return (
    <Layout>
      <Box
        sx={{
          bgcolor: BG_PAGE,
          minHeight: '100vh',
          p: { xs: 2, md: 3 },
          color: '#fff',
        }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            pb: 2,
            borderBottom: `1px solid ${MES_BORDER}`,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${MES_COLOR}22`,
              border: `1px solid ${MES_BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PrecisionManufacturingIcon sx={{ color: MES_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: '#f0f9ff',
                fontWeight: 800,
                fontSize: { xs: '1.1rem', md: '1.4rem' },
                lineHeight: 1.2,
              }}
            >
              Torre de Control MES
            </Typography>
            <Typography sx={{ color: MES_COLOR, fontSize: '0.72rem', fontWeight: 500, mt: 0.3 }}>
              Manufacturing Execution System — Tiempo real
            </Typography>
          </Box>

          {/* Live indicator */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
              }}
            />
            <Typography sx={{ color: '#22c55e', fontSize: '0.65rem', fontWeight: 700 }}>EN VIVO</Typography>
          </Box>
        </Box>

        {/* ── KPI Strip ── */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {kpiCards.map((card) => (
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }} key={card.label}>
              <KpiCard card={card} />
            </Grid>
          ))}
        </Grid>

        {/* ── Central Row ── */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {/* Col 1: Líneas en tiempo real */}
          <Grid size={{ xs: 12, md: 4 }}>
            <SectionCard title="Líneas en tiempo real" minHeight={400}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {productionLines.map((line) => (
                  <LineCard key={line.id} line={line} />
                ))}
              </Box>
            </SectionCard>
          </Grid>

          {/* Col 2: Órdenes activas */}
          <Grid size={{ xs: 12, md: 4 }}>
            <SectionCard title="Órdenes activas" minHeight={400}>
              <Box>
                {activeOrders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </Box>
            </SectionCard>
          </Grid>

          {/* Col 3: Paradas activas */}
          <Grid size={{ xs: 12, md: 4 }}>
            <SectionCard title="Paradas activas" minHeight={400}>
              <Box>
                {activeStops.map((stop) => (
                  <StopRow key={stop.id} stop={stop} />
                ))}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        {/* ── Bottom Row ── */}
        <Grid container spacing={2}>
          {/* Col 1: Scrap por tipo */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Scrap por tipo">
              <Box sx={{ pt: 0.5 }}>
                {scrapData.map((entry) => (
                  <ScrapBar key={entry.label} entry={entry} />
                ))}

                {/* Legend total */}
                <Box
                  sx={{
                    mt: 2,
                    pt: 1.5,
                    borderTop: `1px solid rgba(255,255,255,0.07)`,
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  {scrapData.map((entry) => (
                    <Box key={entry.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: entry.color, flexShrink: 0 }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem' }}>
                        {entry.label} — {entry.percentage}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>
          </Grid>

          {/* Col 2: Alertas críticas */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Alertas críticas">
              <Box sx={{ pt: 0.5 }}>
                {alerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default MESDashboard;
