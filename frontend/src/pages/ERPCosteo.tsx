import React, { useState } from 'react'
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  Tabs,
  Tab,
  LinearProgress,
  Divider,
} from '@mui/material'
import {
  Analytics,
  AccountTree,
  PieChart,
  TrendingDown,
  Calculate,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import Layout from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ERP_COLOR = '#1A3A6B'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoCentroCosto = 'OPERATIVO' | 'ADMINISTRATIVO' | 'COMERCIAL' | 'FINANCIERO' | 'PROYECTO'

interface CentroCosto {
  id: number
  codigo: string
  nombre: string
  tipo: TipoCentroCosto
  responsable?: string
  presupuesto_anual?: number
}

interface Proyecto {
  id: number
  codigo: string
  nombre: string
  cliente?: string
  presupuesto?: number
  ejecutado?: number
  ingresos?: number
  estado?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value?: number) =>
  value != null
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(value)
    : '—'

const formatPct = (value?: number) =>
  value != null ? `${value.toFixed(1)}%` : '—'

// ─── Tipo Centro Costo chip ───────────────────────────────────────────────────

const TIPO_CC_STYLES: Record<
  TipoCentroCosto,
  { bg: string; color: string; label: string }
> = {
  OPERATIVO:      { bg: alpha('#2563EB', 0.12), color: '#1D4ED8', label: 'Operativo' },
  ADMINISTRATIVO: { bg: alpha('#64748B', 0.12), color: '#475569', label: 'Administrativo' },
  COMERCIAL:      { bg: alpha('#16A34A', 0.12), color: '#15803D', label: 'Comercial' },
  FINANCIERO:     { bg: alpha('#0C1E3D', 0.12), color: '#0C1E3D', label: 'Financiero' },
  PROYECTO:       { bg: alpha('#7C3AED', 0.12), color: '#6D28D9', label: 'Proyecto' },
}

function TipoChip({ tipo }: { tipo: TipoCentroCosto }) {
  const s = TIPO_CC_STYLES[tipo] ?? TIPO_CC_STYLES.OPERATIVO
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        bgcolor: s.bg,
        color: s.color,
        textTransform: 'uppercase',
      }}
    >
      {s.label}
    </Box>
  )
}

// ─── Summary KPI Card ─────────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
}

function KPICard({ label, value, sub, accent }: KPICardProps) {
  return (
    <Card
      sx={{
        p: 2.5,
        borderLeft: `4px solid ${accent ?? ERP_COLOR}`,
        borderRadius: 2,
        flex: 1,
        minWidth: 140,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color: accent ?? ERP_COLOR, lineHeight: 1.2, mt: 0.5 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      )}
    </Card>
  )
}

// ─── Static ABC cost driver data ─────────────────────────────────────────────

const INDUCTORES = [
  { actividad: 'Almacenamiento',  inductor: 'm² ocupado',          unidad: 'm²', costoUnitario: 4_800 },
  { actividad: 'Transporte',      inductor: 'km recorrido',         unidad: 'km', costoUnitario: 1_250 },
  { actividad: 'Administración',  inductor: 'horas hombre',         unidad: 'h',  costoUnitario: 28_500 },
  { actividad: 'Mantenimiento',   inductor: 'órdenes de trabajo',   unidad: 'OT', costoUnitario: 185_000 },
]

// ─── Tab 0: Centros de Costo ──────────────────────────────────────────────────

function TabCentrosCosto({ centrosCosto, isLoading }: { centrosCosto?: CentroCosto[]; isLoading: boolean }) {
  const cc = centrosCosto ?? []
  const countByTipo = (tipo: TipoCentroCosto) => cc.filter((c) => c.tipo === tipo).length
  const totalPresupuesto = cc.reduce((s, c) => s + (c.presupuesto_anual ?? 0), 0)

  return (
    <>
      {/* Summary cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <KPICard label="Total CC" value={isLoading ? '—' : cc.length} sub="registrados" />
        <KPICard
          label="Operativos"
          value={isLoading ? '—' : countByTipo('OPERATIVO')}
          accent="#1D4ED8"
        />
        <KPICard
          label="Administrativos"
          value={isLoading ? '—' : countByTipo('ADMINISTRATIVO')}
          accent="#475569"
        />
        <KPICard
          label="Proyectos"
          value={isLoading ? '—' : countByTipo('PROYECTO')}
          accent="#6D28D9"
        />
        <KPICard
          label="Presupuesto total"
          value={isLoading ? '—' : formatCurrency(totalPresupuesto)}
          sub="presupuesto anual consolidado"
        />
      </Box>

      {/* Table */}
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.05) }}>
            {['Código', 'Nombre', 'Tipo', 'Responsable', 'Presupuesto Anual', 'Ejecutado', '% Ejecución'].map(
              (h) => (
                <TableCell
                  key={h}
                  sx={{ fontWeight: 700, color: ERP_COLOR, fontSize: 12 }}
                  align={['Presupuesto Anual', 'Ejecutado', '% Ejecución'].includes(h) ? 'right' : 'left'}
                >
                  {h}
                </TableCell>
              )
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : cc.length === 0
            ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No hay centros de costo registrados. Cree uno desde Contabilidad General.
                  </TableCell>
                </TableRow>
              )
            : cc.map((c) => {
                const ejecutado = 0
                const pct = c.presupuesto_anual && c.presupuesto_anual > 0 ? (ejecutado / c.presupuesto_anual) * 100 : 0
                return (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                      {c.codigo}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{c.nombre}</TableCell>
                    <TableCell>
                      <TipoChip tipo={c.tipo} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{c.responsable ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {formatCurrency(c.presupuesto_anual)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {formatCurrency(ejecutado)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, minWidth: 80 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ color: ERP_COLOR }}>
                          {formatPct(pct)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(pct, 100)}
                          sx={{
                            width: 64,
                            bgcolor: alpha(ERP_COLOR, 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: ERP_COLOR },
                          }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
        </TableBody>
      </Table>
    </>
  )
}

// ─── Tab 1: Metodología ABC ───────────────────────────────────────────────────

function TabCosteoABC() {
  return (
    <Box>
      {/* Concept banner */}
      <Box
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          bgcolor: alpha(ERP_COLOR, 0.04),
          border: `1px solid ${alpha(ERP_COLOR, 0.12)}`,
          display: 'flex',
          gap: 2,
          alignItems: 'flex-start',
        }}
      >
        <PieChart sx={{ color: ERP_COLOR, mt: 0.25, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: ERP_COLOR, mb: 0.5 }}>
            Costeo Basado en Actividades (ABC)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            El método ABC asigna costos indirectos a productos o servicios identificando las{' '}
            <strong>actividades</strong> que consumen recursos y los <strong>inductores</strong> que
            miden el uso de cada actividad. En lugar de prorratear por volumen, cada costo sigue la
            actividad que lo origina — lo que produce asignaciones más precisas y decisiones de
            precio más confiables.
          </Typography>
        </Box>
      </Box>

      {/* Inductores table */}
      <Card sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Box
          sx={{
            px: 3,
            py: 2,
            bgcolor: ERP_COLOR,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Calculate sx={{ color: '#fff', fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#fff' }}>
            Inductores de Costo (Cost Drivers)
          </Typography>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.05) }}>
              {['Actividad', 'Inductor', 'Unidad', 'Costo Unitario'].map((h) => (
                <TableCell
                  key={h}
                  sx={{ fontWeight: 700, color: ERP_COLOR, fontSize: 12 }}
                  align={h === 'Costo Unitario' ? 'right' : 'left'}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {INDUCTORES.map((row) => (
              <TableRow key={row.actividad} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.actividad}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{row.inductor}</TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: alpha(ERP_COLOR, 0.08),
                      color: ERP_COLOR,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    {row.unidad}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {formatCurrency(row.costoUnitario)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Info + CTA */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          bgcolor: alpha('#7C3AED', 0.05),
          border: `1px dashed ${alpha('#7C3AED', 0.3)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <Analytics sx={{ color: '#7C3AED', mt: 0.25, flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary">
            Configure sus inductores de costo y asigne actividades a centros de costo para un
            análisis ABC completo con trazabilidad por servicio, cliente y proyecto.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Calculate />}
          onClick={() => toast('Módulo de configuración ABC disponible próximamente', { icon: '🔧' })}
          sx={{
            borderColor: '#7C3AED',
            color: '#7C3AED',
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: alpha('#7C3AED', 0.06), borderColor: '#7C3AED' },
          }}
        >
          Configurar Inductores
        </Button>
      </Box>
    </Box>
  )
}

// ─── Tab 2: Rentabilidad por Proyecto ─────────────────────────────────────────

function TabRentabilidad({ proyectos, isLoading }: { proyectos?: Proyecto[]; isLoading: boolean }) {
  const list = proyectos ?? []

  const totalUtilidadNum = list.reduce((s, p) => {
    const util = (p.ingresos ?? 0) - (p.ejecutado ?? 0)
    return s + util
  }, 0)

  const margenesValidos = list
    .map((p) => {
      const util = (p.ingresos ?? 0) - (p.ejecutado ?? 0)
      return p.ingresos && p.ingresos > 0 ? (util / p.ingresos) * 100 : null
    })
    .filter((m): m is number => m !== null)

  const margenProm =
    margenesValidos.length > 0
      ? margenesValidos.reduce((s, m) => s + m, 0) / margenesValidos.length
      : null

  const margenColor = (m: number | null) => {
    if (m === null) return 'text.secondary'
    if (m > 20) return '#15803D'
    if (m >= 0) return '#B45309'
    return '#DC2626'
  }

  const margenBg = (m: number | null) => {
    if (m === null) return 'transparent'
    if (m > 20) return alpha('#16A34A', 0.1)
    if (m >= 0) return alpha('#F59E0B', 0.1)
    return alpha('#EF4444', 0.1)
  }

  return (
    <>
      {/* KPIs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <KPICard
          label="Proyectos activos"
          value={isLoading ? '—' : list.length}
          sub="en cartera"
        />
        <KPICard
          label="Utilidad total"
          value={isLoading ? '—' : formatCurrency(totalUtilidadNum)}
          sub="ingresos − ejecutado"
          accent={totalUtilidadNum >= 0 ? '#15803D' : '#DC2626'}
        />
        <KPICard
          label="Margen promedio"
          value={isLoading ? '—' : margenProm !== null ? formatPct(margenProm) : '—'}
          sub="sobre ingresos"
          accent={margenProm !== null && margenProm > 20 ? '#15803D' : margenProm !== null && margenProm >= 0 ? '#B45309' : '#DC2626'}
        />
      </Box>

      {/* Table */}
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.05) }}>
            {['Código', 'Nombre', 'Cliente', 'Presupuesto', 'Ejecutado', 'Ingresos', 'Utilidad', 'Margen %'].map(
              (h) => (
                <TableCell
                  key={h}
                  sx={{ fontWeight: 700, color: ERP_COLOR, fontSize: 12 }}
                  align={['Presupuesto', 'Ejecutado', 'Ingresos', 'Utilidad', 'Margen %'].includes(h) ? 'right' : 'left'}
                >
                  {h}
                </TableCell>
              )
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : list.length === 0
            ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No hay proyectos registrados en el sistema.
                  </TableCell>
                </TableRow>
              )
            : list.map((p) => {
                const utilidad = (p.ingresos ?? 0) - (p.ejecutado ?? 0)
                const margen =
                  p.ingresos && p.ingresos > 0 ? (utilidad / p.ingresos) * 100 : null

                return (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                      {p.codigo}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{p.nombre}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{p.cliente ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {formatCurrency(p.presupuesto)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {formatCurrency(p.ejecutado)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {formatCurrency(p.ingresos)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: 13,
                        color: utilidad >= 0 ? '#15803D' : '#DC2626',
                      }}
                    >
                      {formatCurrency(utilidad)}
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 1.25,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: margenBg(margen),
                          color: margenColor(margen),
                          fontWeight: 800,
                          fontSize: 12,
                          fontFamily: 'monospace',
                        }}
                      >
                        {margen !== null ? formatPct(margen) : '—'}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
        </TableBody>
      </Table>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ERPCosteo() {
  const [tabValue, setTabValue] = useState(0)

  const { data: centrosCosto, isLoading: loadingCC } = useQuery<CentroCosto[]>({
    queryKey: ['erp-centros-costo'],
    queryFn: () => apiClient.get('/erp/contabilidad/centros-costo').then((r) => r.data),
  })

  const { data: proyectos, isLoading: loadingProyectos } = useQuery<Proyecto[]>({
    queryKey: ['erp-proyectos'],
    queryFn: () => apiClient.get('/erp/proyectos').then((r) => r.data),
  })

  return (
    <Layout title="ERP — Costeo y Análisis">
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: ERP_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Analytics sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: ERP_COLOR, lineHeight: 1.2 }}>
              Costeo ABC y Análisis de Costos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Centros de costo, metodología ABC e indicadores de rentabilidad por proyecto
            </Typography>
          </Box>
        </Box>

        {/* Tabs Card */}
        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(ERP_COLOR, 0.03) }}>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{
                px: 2,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 },
                '& .Mui-selected': { color: ERP_COLOR },
                '& .MuiTabs-indicator': { bgcolor: ERP_COLOR },
              }}
            >
              <Tab
                label="Centros de Costo"
                icon={<AccountTree fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                label="Costeo ABC"
                icon={<Calculate fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                label="Rentabilidad por Proyecto"
                icon={<TrendingDown fontSize="small" />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {tabValue === 0 && (
              <TabCentrosCosto centrosCosto={centrosCosto} isLoading={loadingCC} />
            )}
            {tabValue === 1 && <TabCosteoABC />}
            {tabValue === 2 && (
              <TabRentabilidad proyectos={proyectos} isLoading={loadingProyectos} />
            )}
          </Box>
        </Card>
      </Box>
    </Layout>
  )
}
