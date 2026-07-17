import {
  Box, Paper, Typography, Stack, Chip, Button, alpha,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Assessment as AssessmentIcon,
  ShoppingCart as CartIcon,
  Factory as FactoryIcon,
  SwapHoriz as SwapIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { exportarPDF } from '@/utils/exportar'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ── Mock Data ──────────────────────────────────────────────────────────────

const kpis = [
  { label: 'Forecast Accuracy', value: '91.4%', icon: <AssessmentIcon />, color: APS_COLOR, sub: 'Promedio 12 meses' },
  { label: 'Bias', value: '-1.2%', icon: <TrendingUpIcon />, color: '#3B82F6', sub: 'Sesgo del pronóstico' },
  { label: 'OTIF', value: '96.2%', icon: <ShippingIcon />, color: '#10B981', sub: 'On Time In Full' },
  { label: 'Fill Rate', value: '97.8%', icon: <CheckIcon />, color: '#10B981', sub: 'Tasa de llenado' },
  { label: 'Inventory Turns', value: '8.3x', icon: <InventoryIcon />, color: APS_COLOR, sub: 'Rotación anual' },
  { label: 'Days of Inventory', value: '44d', icon: <InventoryIcon />, color: '#F59E0B', sub: 'DOI promedio' },
  { label: 'Service Level', value: '97.1%', icon: <CheckIcon />, color: '#10B981', sub: 'Nivel de servicio' },
  { label: 'Perfect Order', value: '94.5%', icon: <CheckIcon />, color: APS_COLOR, sub: 'Orden perfecta' },
]

const alertas = [
  { id: 1, tipo: 'CRÍTICA', descripcion: 'Quiebre de stock inminente — SKU-1042 (Aceite Motor 20W50)', producto: 'SKU-1042', impacto: 'Alto', fecha: '2026-06-22', responsable: 'Compras' },
  { id: 2, tipo: 'CRÍTICA', descripcion: 'Stock bajo mínimo — SKU-0871 (Filtro Aire Industrial)', producto: 'SKU-0871', impacto: 'Alto', fecha: '2026-06-21', responsable: 'Compras' },
  { id: 3, tipo: 'ADVERTENCIA', descripcion: 'Exceso de inventario — SKU-2210 (Tornillos M8 x 40)', producto: 'SKU-2210', impacto: 'Medio', fecha: '2026-06-30', responsable: 'Planificación' },
  { id: 4, tipo: 'ADVERTENCIA', descripcion: 'Cuello de botella capacidad — Línea Ensamble A3', producto: 'Línea A3', impacto: 'Alto', fecha: '2026-06-25', responsable: 'Producción' },
  { id: 5, tipo: 'ADVERTENCIA', descripcion: 'Proveedor con retraso — Lead time +8 días Proveedor SUMIBOL', producto: 'SUMIBOL', impacto: 'Medio', fecha: '2026-06-28', responsable: 'Compras' },
  { id: 6, tipo: 'INFO', descripcion: 'Revisión S&OP programada para el 25-Jun-2026', producto: 'Global', impacto: 'Bajo', fecha: '2026-06-25', responsable: 'Planificación' },
]

const ordenesSugeridas = [
  { id: 1, producto: 'Aceite Motor 20W50 — 5L', tipo: 'COMPRA', cantidad: '1,200 und', fechaRequerida: '2026-06-24', prioridad: 'URGENTE', proveedor: 'PETROANDES' },
  { id: 2, producto: 'Filtro Aire Industrial FA-220', tipo: 'COMPRA', cantidad: '450 und', fechaRequerida: '2026-06-23', prioridad: 'URGENTE', proveedor: 'FILTREX' },
  { id: 3, producto: 'Caja Ensamblada Modelo X7', tipo: 'PRODUCCION', cantidad: '800 und', fechaRequerida: '2026-06-28', prioridad: 'ALTA', proveedor: 'Planta Bogotá' },
  { id: 4, producto: 'Repuesto Hidráulico RH-45', tipo: 'COMPRA', cantidad: '200 und', fechaRequerida: '2026-07-02', prioridad: 'ALTA', proveedor: 'HIDRAL SAS' },
  { id: 5, producto: 'Sub-ensamble Motor M12', tipo: 'PRODUCCION', cantidad: '350 und', fechaRequerida: '2026-07-05', prioridad: 'MEDIA', proveedor: 'Planta Medellín' },
  { id: 6, producto: 'Lubricante Sintético LS-500', tipo: 'TRASLADO', cantidad: '600 und', fechaRequerida: '2026-06-30', prioridad: 'MEDIA', proveedor: 'CD Bogotá → Cali' },
  { id: 7, producto: 'Empaque Primario EP-100', tipo: 'COMPRA', cantidad: '5,000 und', fechaRequerida: '2026-07-08', prioridad: 'BAJA', proveedor: 'EMPAQUES SA' },
  { id: 8, producto: 'Componente Electrónico CE-77', tipo: 'TRASLADO', cantidad: '120 und', fechaRequerida: '2026-07-10', prioridad: 'BAJA', proveedor: 'Almacén 3 → Planta' },
]

const forecastFamilias = [
  { familia: 'Lubricantes', accuracy: 94, meta: 90 },
  { familia: 'Filtros', accuracy: 89, meta: 90 },
  { familia: 'Repuestos Mecánicos', accuracy: 91, meta: 90 },
  { familia: 'Empaques', accuracy: 87, meta: 88 },
  { familia: 'Componentes Electrónicos', accuracy: 82, meta: 85 },
  { familia: 'Materias Primas', accuracy: 93, meta: 90 },
  { familia: 'Producto Terminado', accuracy: 95, meta: 92 },
]

const capacidadRecursos = [
  { recurso: 'Línea Ensamble A1', uso: 65, turno: '2 turnos', unidad: 'hrs/día' },
  { recurso: 'Línea Ensamble A3', uso: 94, turno: '3 turnos', unidad: 'hrs/día' },
  { recurso: 'Almacén CD Bogotá', uso: 78, turno: '2 turnos', unidad: 'posiciones' },
  { recurso: 'Flota Distribución', uso: 85, turno: '2 turnos', unidad: 'vehículos' },
  { recurso: 'Línea Pintura P2', uso: 55, turno: '1 turno', unidad: 'hrs/día' },
  { recurso: 'Maquinaria CNC-04', uso: 97, turno: '3 turnos', unidad: 'hrs/día' },
]

const tendenciaKPIs = [
  { semana: 'S1', accuracy: 88, otif: 94, fillRate: 96 },
  { semana: 'S2', accuracy: 90, otif: 95, fillRate: 97 },
  { semana: 'S3', accuracy: 91, otif: 96, fillRate: 97 },
  { semana: 'S4', accuracy: 91, otif: 96, fillRate: 98 },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function alertaColor(tipo: string) {
  if (tipo === 'CRÍTICA') return '#EF4444'
  if (tipo === 'ADVERTENCIA') return '#F59E0B'
  return '#3B82F6'
}

function alertaIcon(tipo: string) {
  if (tipo === 'CRÍTICA') return <WarningIcon sx={{ fontSize: 14 }} />
  if (tipo === 'ADVERTENCIA') return <WarningIcon sx={{ fontSize: 14 }} />
  return <InfoIcon sx={{ fontSize: 14 }} />
}

function tipoOrdenColor(tipo: string) {
  if (tipo === 'COMPRA') return '#3B82F6'
  if (tipo === 'PRODUCCION') return '#10B981'
  return '#F59E0B'
}

function tipoOrdenIcon(tipo: string) {
  if (tipo === 'COMPRA') return <CartIcon sx={{ fontSize: 14 }} />
  if (tipo === 'PRODUCCION') return <FactoryIcon sx={{ fontSize: 14 }} />
  return <SwapIcon sx={{ fontSize: 14 }} />
}

function prioridadColor(p: string) {
  if (p === 'URGENTE') return '#EF4444'
  if (p === 'ALTA') return '#F59E0B'
  if (p === 'MEDIA') return APS_COLOR
  return '#64748B'
}

function capacidadColor(uso: number) {
  if (uso > 90) return '#EF4444'
  if (uso >= 70) return '#F59E0B'
  return '#10B981'
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactElement; color: string; sub: string }) {
  return (
    <Paper elevation={0} className="hover-lift" sx={{
      border: '1px solid #E5E7EB',
      borderLeft: `4px solid ${color}`,
      borderRadius: '14px',
      p: 2.5,
      height: '100%',
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography className="text-gradient" fontSize={26} fontWeight={800} color={color} lineHeight={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
          <Typography fontSize={12} fontWeight={600} color="text.primary" mt={0.5}>{label}</Typography>
          <Typography fontSize={11} color="text.secondary" mt={0.25}>{sub}</Typography>
        </Box>
        <Box sx={{
          width: 40, height: 40, borderRadius: '10px',
          bgcolor: alpha(color, 0.1),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { fontSize: 20, color } })}
        </Box>
      </Stack>
    </Paper>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box mb={2}>
      <Typography fontSize={15} fontWeight={700} color="text.primary">{title}</Typography>
      {subtitle && <Typography fontSize={12} color="text.secondary">{subtitle}</Typography>}
    </Box>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function APSDashboard() {
  return (
    <Layout title="Torre de Control APS — Advanced Planning & Scheduling">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
            <Chip
              label="APS"
              size="small"
              sx={{ bgcolor: APS_COLOR, color: '#fff', fontWeight: 800, fontSize: 11, height: 22, letterSpacing: '0.05em' }}
            />
            <Typography fontSize={22} fontWeight={800} letterSpacing="-0.03em">
              Torre de Control APS
            </Typography>
          </Stack>
          <Typography fontSize={13} color="text.secondary">
            Advanced Planning &amp; Scheduling · Semana 25 · Jun 2026
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" size="small" onClick={() => exportarPDF({
            archivo: 'aps-ordenes-sugeridas',
            titulo: 'APS — Órdenes sugeridas',
            color: APS_COLOR,
            columnas: [
              { key: 'tipo', header: 'Tipo' }, { key: 'producto', header: 'Producto' },
              { key: 'cantidad', header: 'Cantidad' }, { key: 'fecha', header: 'Fecha' }, { key: 'prioridad', header: 'Prioridad' },
            ],
            filas: ordenesSugeridas,
          })} sx={{ borderColor: APS_COLOR, color: APS_COLOR, textTransform: 'none', fontWeight: 600 }}>
            Exportar
          </Button>
          <Button variant="contained" size="small"
            sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK }, textTransform: 'none', fontWeight: 600 }}>
            Aprobar Todo
          </Button>
        </Stack>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2} mb={3} className="anim-stagger">
        {kpis.map((k, i) => (
          <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
            <KPICard {...k} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} mb={3}>
        {/* Alertas Supply Chain */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
            <SectionHeader title="Alertas de Supply Chain" subtitle="Requieren atención inmediata" />
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Nivel', 'Descripción', 'Impacto', 'Fecha', 'Responsable'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {alertas.map(a => {
                  const color = alertaColor(a.tipo)
                  return (
                    <TableRow key={a.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          icon={alertaIcon(a.tipo)}
                          label={a.tipo}
                          size="small"
                          sx={{ bgcolor: alpha(color, 0.1), color, height: 20, fontSize: 10, fontWeight: 700, '& .MuiChip-icon': { color } }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, maxWidth: 260 }}>{a.descripcion}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip label={a.impacto} size="small" sx={{ bgcolor: alpha(color, 0.08), color, height: 18, fontSize: 10 }} />
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{a.fecha}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{a.responsable}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* Forecast por Familia — barras CSS */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
            <SectionHeader title="Forecast por Familia" subtitle="% Accuracy vs Meta" />
            <Stack gap={1.5}>
              {forecastFamilias.map((f, i) => {
                const color = f.accuracy >= f.meta ? '#10B981' : '#F59E0B'
                return (
                  <Box key={i}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize={12} fontWeight={600}>{f.familia}</Typography>
                      <Typography fontSize={12} fontWeight={700} color={color}>{f.accuracy}%</Typography>
                    </Stack>
                    <Box sx={{ position: 'relative', height: 8, bgcolor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                      <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${f.accuracy}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                      {/* Meta line */}
                      <Box sx={{ position: 'absolute', top: 0, left: `${f.meta}%`, width: 2, height: '100%', bgcolor: '#64748B', borderRadius: 1 }} />
                    </Box>
                    <Typography fontSize={10} color="text.secondary" mt={0.25}>Meta: {f.meta}%</Typography>
                  </Box>
                )
              })}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Órdenes Sugeridas */}
      <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <SectionHeader title="Órdenes Sugeridas Pendientes" subtitle="Generadas por el motor APS — pendientes de aprobación" />
          <Chip label={`${ordenesSugeridas.length} pendientes`} size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.1), color: APS_COLOR, fontWeight: 700, fontSize: 11 }} />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Producto', 'Tipo', 'Cantidad', 'Fecha Requerida', 'Prioridad', 'Fuente/Proveedor', 'Acción'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ordenesSugeridas.map(o => {
              const tColor = tipoOrdenColor(o.tipo)
              const pColor = prioridadColor(o.prioridad)
              return (
                <TableRow key={o.id} sx={{ '&:hover': { bgcolor: alpha(APS_COLOR, 0.03) } }}>
                  <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600 }}>{o.producto}</TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Chip
                      icon={tipoOrdenIcon(o.tipo)}
                      label={o.tipo}
                      size="small"
                      sx={{ bgcolor: alpha(tColor, 0.1), color: tColor, height: 20, fontSize: 10, fontWeight: 700, '& .MuiChip-icon': { color: tColor } }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700 }}>{o.cantidad}</TableCell>
                  <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{o.fechaRequerida}</TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Chip label={o.prioridad} size="small" sx={{ bgcolor: alpha(pColor, 0.1), color: pColor, height: 20, fontSize: 10, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{o.proveedor}</TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Button size="small" variant="contained"
                      sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK }, textTransform: 'none', fontWeight: 600, fontSize: 11, py: 0.3, px: 1.5, minWidth: 'auto' }}>
                      Aprobar
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>

      <Grid container spacing={2} mb={2}>
        {/* Carga de Capacidad por Recurso */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <SectionHeader title="Carga de Capacidad por Recurso" subtitle="% utilización — Semana actual" />
            <Stack gap={2}>
              {capacidadRecursos.map((r, i) => {
                const color = capacidadColor(r.uso)
                return (
                  <Box key={i}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Box>
                        <Typography fontSize={12} fontWeight={600}>{r.recurso}</Typography>
                        <Typography fontSize={10} color="text.secondary">{r.turno} · {r.unidad}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontSize={15} fontWeight={800} color={color}>{r.uso}%</Typography>
                        {r.uso > 90 && <Typography fontSize={10} color="#EF4444" fontWeight={600}>SOBRECARGADO</Typography>}
                        {r.uso >= 70 && r.uso <= 90 && <Typography fontSize={10} color="#F59E0B" fontWeight={600}>CARGA ALTA</Typography>}
                        {r.uso < 70 && <Typography fontSize={10} color="#10B981" fontWeight={600}>NORMAL</Typography>}
                      </Box>
                    </Stack>
                    <Box sx={{ position: 'relative', height: 10, bgcolor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                      <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${r.uso}%`, bgcolor: color, borderRadius: 5, transition: 'width 0.4s ease' }} />
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </Paper>
        </Grid>

        {/* Tendencia KPIs — barras CSS */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <SectionHeader title="Tendencia KPIs — Últimas 4 Semanas" subtitle="Forecast Accuracy · OTIF · Fill Rate" />
            <Stack gap={2}>
              {/* Forecast Accuracy */}
              <Box>
                <Typography fontSize={12} fontWeight={700} color={APS_COLOR} mb={1}>Forecast Accuracy (%)</Typography>
                <Stack direction="row" gap={0.75} alignItems="flex-end" height={60}>
                  {tendenciaKPIs.map((t, i) => (
                    <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Typography fontSize={10} fontWeight={700} color={APS_COLOR}>{t.accuracy}</Typography>
                      <Box sx={{ width: '100%', height: `${(t.accuracy - 80) * 4}px`, bgcolor: alpha(APS_COLOR, 0.7), borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                      <Typography fontSize={10} color="text.secondary">{t.semana}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              {/* OTIF */}
              <Box>
                <Typography fontSize={12} fontWeight={700} color="#10B981" mb={1}>OTIF (%)</Typography>
                <Stack direction="row" gap={0.75} alignItems="flex-end" height={60}>
                  {tendenciaKPIs.map((t, i) => (
                    <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Typography fontSize={10} fontWeight={700} color="#10B981">{t.otif}</Typography>
                      <Box sx={{ width: '100%', height: `${(t.otif - 90) * 6}px`, bgcolor: alpha('#10B981', 0.7), borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                      <Typography fontSize={10} color="text.secondary">{t.semana}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              {/* Fill Rate */}
              <Box>
                <Typography fontSize={12} fontWeight={700} color="#3B82F6" mb={1}>Fill Rate (%)</Typography>
                <Stack direction="row" gap={0.75} alignItems="flex-end" height={60}>
                  {tendenciaKPIs.map((t, i) => (
                    <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Typography fontSize={10} fontWeight={700} color="#3B82F6">{t.fillRate}</Typography>
                      <Box sx={{ width: '100%', height: `${(t.fillRate - 93) * 8}px`, bgcolor: alpha('#3B82F6', 0.7), borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                      <Typography fontSize={10} color="text.secondary">{t.semana}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  )
}

// React import needed for React.cloneElement
import React from 'react'
