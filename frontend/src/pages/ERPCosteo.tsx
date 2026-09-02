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
  Alert,
} from '@mui/material'
import {
  Analytics,
  AccountTree,
  PieChart,
  TrendingDown,
  Calculate,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

import { COLOR_MODULO } from '@/config/marca'
const ERP_COLOR = COLOR_MODULO

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

// ─── Inductores ──────────────────────────────────────────────────────────────
//
// Antes eran cuatro filas fijas con un costo unitario inventado. El costo
// unitario de verdad es el saldo de la cuenta dividido por las unidades
// consumidas, así que se calcula en el servidor a partir del mayor: repartir el
// arriendo por metros cuadrados en vez de por horas hombre cambia qué línea de
// negocio parece rentable, y eso no puede ser una constante que nadie ve.

interface Inductor {
  id: number
  codigo: string
  actividad: string
  inductor: string
  unidad: string
  cuenta_origen?: string | null
  unidades_totales: number
  monto_del_mes: number
  costo_unitario: number | null
}

interface CentroEjecutado {
  id: number
  codigo: string
  nombre: string
  tipo: TipoCentroCosto
  responsable?: string | null
  presupuesto_anual: number
  ejecutado: number
  disponible: number
  pct_ejecucion: number | null
}

// ─── Tab 0: Centros de Costo ──────────────────────────────────────────────────

function TabCentrosCosto({ isLoading }: { centrosCosto?: CentroCosto[]; isLoading: boolean }) {
  // La ejecución sale del mayor, no de un cero fijo: antes la columna
  // «Ejecutado» era siempre 0 y el porcentaje siempre 0%, así que la pantalla
  // aparentaba informar y no informaba de nada.
  const { data, isLoading: cargando } = useQuery<{
    centros: CentroEjecutado[]; total_ejecutado: number
    sin_centro_de_costo: number; desde: string; hasta: string
  }>({
    queryKey: ['erp-costeo-centros'],
    queryFn: () => apiClient.get('/erp/costeo/centros').then((r) => r.data),
  })

  const cc = data?.centros ?? []
  const cargandoTodo = isLoading || cargando
  const countByTipo = (tipo: TipoCentroCosto) => cc.filter((c) => c.tipo === tipo).length
  const totalPresupuesto = cc.reduce((s, c) => s + (c.presupuesto_anual ?? 0), 0)

  return (
    <>
      {/* Summary cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <KPICard label="Total CC" value={cargandoTodo ? '—' : cc.length} sub="registrados" />
        <KPICard
          label="Operativos"
          value={cargandoTodo ? '—' : countByTipo('OPERATIVO')}
          accent="#1D4ED8"
        />
        <KPICard
          label="Administrativos"
          value={cargandoTodo ? '—' : countByTipo('ADMINISTRATIVO')}
          accent="#475569"
        />
        <KPICard
          label="Proyectos"
          value={cargandoTodo ? '—' : countByTipo('PROYECTO')}
          accent="#6D28D9"
        />
        <KPICard
          label="Presupuesto total"
          value={cargandoTodo ? '—' : formatCurrency(totalPresupuesto)}
          sub="presupuesto anual consolidado"
        />
        <KPICard
          label="Ejecutado"
          value={cargandoTodo ? '—' : formatCurrency(data?.total_ejecutado ?? 0)}
          sub={data ? `del ${data.desde} al ${data.hasta}` : undefined}
          accent="#B45309"
        />
      </Box>

      {/* Table */}
      {!!data?.sin_centro_de_costo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Hay {formatCurrency(data.sin_centro_de_costo)} de costo y gasto sin
          centro asignado. No se reparte entre los demás porque eso falsearía
          todos los porcentajes; impútelo en el documento de origen.
        </Alert>
      )}

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
          {cargandoTodo
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
                const ejecutado = c.ejecutado
                const pct = c.pct_ejecucion ?? 0
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
  const qc = useQueryClient()

  const { data: inductores = [], isLoading: cargandoInductores } = useQuery<Inductor[]>({
    queryKey: ['erp-costeo-inductores'],
    queryFn: () => apiClient.get('/erp/costeo/inductores').then((r) => r.data),
  })

  // El período es el mes en curso: es el que se cierra, y dejarlo elegir
  // invitaría a repartir un mes ya cerrado, que es justo lo que no se debe.
  const periodo = new Date().toISOString().slice(0, 7)

  const distribuir = useMutation({
    mutationFn: (inductor_id: number) =>
      apiClient.post('/erp/costeo/distribuir', { inductor_id, periodo })
        .then((r) => r.data),
    onSuccess: (r: any) => {
      toast.success(`Repartido ${formatCurrency(r.monto_distribuido)} · ${r.comprobante}`)
      qc.invalidateQueries({ queryKey: ['erp-costeo-inductores'] })
      qc.invalidateQueries({ queryKey: ['erp-costeo-centros'] })
    },
    onError: (e: any) => {
      const d = e?.response?.data?.detail
      toast.error(typeof d === 'string' ? d : (d?.contabilidad ?? 'No se pudo distribuir'))
    },
  })

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
              {['Actividad', 'Inductor', 'Unidad', 'Cuenta que reparte', 'Saldo del mes', 'Costo Unitario'].map((h) => (
                <TableCell
                  key={h}
                  sx={{ fontWeight: 700, color: ERP_COLOR, fontSize: 12 }}
                  align={['Costo Unitario', 'Saldo del mes'].includes(h) ? 'right' : 'left'}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {cargandoInductores && (
              <TableRow><TableCell colSpan={6}><Skeleton /></TableCell></TableRow>
            )}
            {!cargandoInductores && inductores.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Todavía no hay inductores definidos. Cada uno dice qué cuenta se
                  reparte y con qué criterio.
                </TableCell>
              </TableRow>
            )}
            {inductores.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.actividad}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{row.inductor}</TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      px: 1, py: 0.25, borderRadius: 1,
                      bgcolor: alpha(ERP_COLOR, 0.08), color: ERP_COLOR,
                      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                    }}
                  >
                    {row.unidad}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
                  {row.cuenta_origen ?? '— sin cuenta —'}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {formatCurrency(row.monto_del_mes)}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {/* Sin unidades consumidas no hay costo unitario, y un cero ahí
                      se leería como «cuesta cero». */}
                  {row.costo_unitario == null
                    ? <Typography variant="caption" color="text.secondary">sin consumo</Typography>
                    : formatCurrency(row.costo_unitario)}
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
            Distribuir reparte el saldo de cada cuenta entre los centros que
            consumieron la actividad <strong>y genera el asiento</strong>, así que
            el costeo y los libros dicen lo mismo. Un mes ya repartido no se
            vuelve a repartir: duplicaría el costo en quien lo recibe.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Calculate />}
          disabled={distribuir.isPending || inductores.length === 0}
          onClick={() => {
            const conCuenta = inductores.filter((i) => i.monto_del_mes > 0)
            if (conCuenta.length === 0) {
              toast('Ninguna cuenta de los inductores tiene saldo sin asignar este mes.')
              return
            }
            conCuenta.forEach((i) => distribuir.mutate(i.id))
          }}
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

interface ProyectoMedido {
  id: number; codigo: string; nombre: string; cliente?: string | null
  estado: string; presupuesto: number; ingresos: number
  costos: number; gastos: number; ejecutado: number
  margen: number; margen_pct: number | null; medible: boolean
}

function TabRentabilidad({ isLoading }: { proyectos?: Proyecto[]; isLoading: boolean }) {
  const { data: list = [], isLoading: cargando } = useQuery<ProyectoMedido[]>({
    queryKey: ['erp-proyectos-rentabilidad'],
    queryFn: () => apiClient.get('/erp/proyectos/rentabilidad-real').then((r) => r.data),
  })
  const cargandoTodo = isLoading || cargando

  // Un proyecto sin centro de costo no se puede medir. Decirlo es más útil que
  // mostrar ceros, que se leen como «no dejó margen».
  const sinMedir = list.filter((p) => !p.medible).length

  const totalUtilidadNum = list.reduce((s, p) => s + p.margen, 0)

  const margenesValidos = list
    .map((p) => p.margen_pct)
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
          {cargandoTodo
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
                const utilidad = p.margen
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
