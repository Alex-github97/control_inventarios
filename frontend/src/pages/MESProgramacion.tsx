import { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Grid,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  alpha,
  Tooltip,
} from '@mui/material'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import TodayIcon from '@mui/icons-material/Today'
import ScheduleIcon from '@mui/icons-material/Schedule'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'
const BG        = '#060C1A'
const SURFACE   = '#0F1E35'
const BORDER    = '#1E3A5F'
const TEXT      = '#E2E8F0'
const MUTED     = '#94A3B8'

// ─── Paleta de colores por producto ──────────────────────────────────────────
const PRODUCT_COLORS: Record<string, string> = {
  'PRD-001': '#0891B2',
  'PRD-002': '#8B5CF6',
  'PRD-003': '#F59E0B',
  'PRD-004': '#10B981',
  'PRD-005': '#EF4444',
  'PRD-006': '#EC4899',
  'PRD-007': '#6366F1',
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

interface GanttBar {
  op: string
  producto: string
  color: string
  left: number   // % desde inicio del día
  width: number  // % del ancho total (sobre 6 días)
  dia: number    // 0=Lun ... 5=Sab (columna base)
  estado: 'PROG' | 'EN_EJECUCION' | 'CONF'
}

interface GanttLine {
  nombre: string
  bars: GanttBar[]
}

const GANTT_DATA: GanttLine[] = [
  {
    nombre: 'Línea A',
    bars: [
      { op: 'OP-2401', producto: 'PRD-001', color: PRODUCT_COLORS['PRD-001'], left: 0,    width: 14.5, dia: 0, estado: 'EN_EJECUCION' },
      { op: 'OP-2402', producto: 'PRD-002', color: PRODUCT_COLORS['PRD-002'], left: 16.7, width: 10.0, dia: 0, estado: 'PROG' },
      { op: 'OP-2407', producto: 'PRD-005', color: PRODUCT_COLORS['PRD-005'], left: 50.0, width: 16.0, dia: 0, estado: 'PROG' },
      { op: 'OP-2412', producto: 'PRD-003', color: PRODUCT_COLORS['PRD-003'], left: 83.3, width: 16.7, dia: 0, estado: 'PROG' },
    ],
  },
  {
    nombre: 'Línea B',
    bars: [
      { op: 'OP-2403', producto: 'PRD-003', color: PRODUCT_COLORS['PRD-003'], left: 0,    width: 33.0, dia: 0, estado: 'EN_EJECUCION' },
      { op: 'OP-2404', producto: 'PRD-004', color: PRODUCT_COLORS['PRD-004'], left: 33.4, width: 22.0, dia: 0, estado: 'PROG' },
      { op: 'OP-2409', producto: 'PRD-007', color: PRODUCT_COLORS['PRD-007'], left: 66.7, width: 16.6, dia: 0, estado: 'CONF' },
    ],
  },
  {
    nombre: 'Línea C',
    bars: [
      { op: 'OP-2405', producto: 'PRD-005', color: PRODUCT_COLORS['PRD-005'], left: 0,    width: 16.7, dia: 0, estado: 'PROG' },
      { op: 'OP-2406', producto: 'PRD-006', color: PRODUCT_COLORS['PRD-006'], left: 16.7, width: 27.0, dia: 0, estado: 'PROG' },
      { op: 'OP-2410', producto: 'PRD-001', color: PRODUCT_COLORS['PRD-001'], left: 50.0, width: 16.7, dia: 0, estado: 'CONF' },
      { op: 'OP-2415', producto: 'PRD-004', color: PRODUCT_COLORS['PRD-004'], left: 66.7, width: 33.3, dia: 0, estado: 'PROG' },
    ],
  },
  {
    nombre: 'Línea D',
    bars: [
      { op: 'OP-2408', producto: 'PRD-007', color: PRODUCT_COLORS['PRD-007'], left: 0,    width: 50.0, dia: 0, estado: 'EN_EJECUCION' },
      { op: 'OP-2411', producto: 'PRD-002', color: PRODUCT_COLORS['PRD-002'], left: 66.7, width: 16.7, dia: 0, estado: 'PROG' },
    ],
  },
  {
    nombre: 'Línea E',
    bars: [
      { op: 'OP-2413', producto: 'PRD-006', color: PRODUCT_COLORS['PRD-006'], left: 16.7, width: 33.0, dia: 0, estado: 'PROG' },
      { op: 'OP-2414', producto: 'PRD-003', color: PRODUCT_COLORS['PRD-003'], left: 50.0, width: 33.3, dia: 0, estado: 'PROG' },
    ],
  },
]

interface CapacidadLinea {
  nombre: string
  carga: number
  horasDisponibles: number
  horasUtilizadas: number
  estado: 'OK' | 'ALERTA' | 'CRITICO'
}

const CAPACIDAD_DATA: CapacidadLinea[] = [
  { nombre: 'Línea A', carga: 92, horasDisponibles: 16, horasUtilizadas: 14.7, estado: 'CRITICO' },
  { nombre: 'Línea B', carga: 78, horasDisponibles: 16, horasUtilizadas: 12.5, estado: 'ALERTA' },
  { nombre: 'Línea C', carga: 85, horasDisponibles: 16, horasUtilizadas: 13.6, estado: 'CRITICO' },
  { nombre: 'Línea D', carga: 65, horasDisponibles: 16, horasUtilizadas: 10.4, estado: 'OK' },
  { nombre: 'Línea E', carga: 71, horasDisponibles: 16, horasUtilizadas: 11.4, estado: 'ALERTA' },
]

const CUELLOS_BOTELLA = [
  { linea: 'Línea A', operacion: 'Empaque primario', ocupacion: 92, disponible: 1.3 },
  { linea: 'Línea C', operacion: 'Sellado térmico',  ocupacion: 85, disponible: 2.4 },
  { linea: 'Línea B', operacion: 'Dosificación',     ocupacion: 78, disponible: 3.5 },
  { linea: 'Línea E', operacion: 'Etiquetado',        ocupacion: 71, disponible: 4.6 },
]

interface OrdenSecuencia {
  op: string
  producto: string
  prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'NORMAL'
  setup: number
  proceso: number
  entrega: string
}

const SECUENCIA_INICIAL: OrdenSecuencia[] = [
  { op: 'OP-2416', producto: 'Aceite Motor 5W-30 1L',    prioridad: 'URGENTE', setup: 30, proceso: 240, entrega: '2026-06-20' },
  { op: 'OP-2417', producto: 'Filtro Aceite Premium',     prioridad: 'ALTA',    setup: 15, proceso: 180, entrega: '2026-06-21' },
  { op: 'OP-2418', producto: 'Grasa Industrial #2',       prioridad: 'URGENTE', setup: 45, proceso: 300, entrega: '2026-06-20' },
  { op: 'OP-2419', producto: 'Lubricante Cadena 500ml',   prioridad: 'MEDIA',   setup: 20, proceso: 150, entrega: '2026-06-22' },
  { op: 'OP-2420', producto: 'Aceite Hidráulico ISO 46',  prioridad: 'ALTA',    setup: 25, proceso: 210, entrega: '2026-06-21' },
  { op: 'OP-2421', producto: 'Desengrasante Industrial',  prioridad: 'NORMAL',  setup: 10, proceso: 120, entrega: '2026-06-23' },
  { op: 'OP-2422', producto: 'Aceite Compresor VDL 100',  prioridad: 'MEDIA',   setup: 35, proceso: 270, entrega: '2026-06-22' },
  { op: 'OP-2423', producto: 'Fluido Frenos DOT 4',       prioridad: 'ALTA',    setup: 20, proceso: 180, entrega: '2026-06-21' },
]

const DIAS = ['Lun 17', 'Mar 18', 'Mié 19', 'Jue 20', 'Vie 21', 'Sáb 22']

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const cardSx = {
  bgcolor: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
}

const tabsSx = {
  borderBottom: `1px solid ${BORDER}`,
  mb: 3,
  '& .MuiTabs-indicator': { bgcolor: MES_COLOR },
  '& .MuiTab-root': { color: MUTED, textTransform: 'none', fontWeight: 500, fontSize: 14 },
  '& .MuiTab-root.Mui-selected': { color: MES_COLOR },
}

function prioridadColor(p: OrdenSecuencia['prioridad']) {
  if (p === 'URGENTE') return '#EF4444'
  if (p === 'ALTA')    return '#F59E0B'
  if (p === 'MEDIA')   return '#0891B2'
  return MUTED
}

function cargaColor(c: number) {
  if (c >= 90) return '#EF4444'
  if (c >= 75) return '#F59E0B'
  return '#10B981'
}

// ─── Componente SVG radial progress ──────────────────────────────────────────

function RadialProgress({ value, color }: { value: number; color: string }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <Box sx={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke={alpha(color, 0.15)} strokeWidth="6" />
        <circle
          cx="42" cy="42" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>
          {value}%
        </Typography>
      </Box>
    </Box>
  )
}

// ─── Tab 0: Gantt ─────────────────────────────────────────────────────────────

function TabGantt() {
  const [semana, setSemana] = useState('2026-W25')

  return (
    <Box>
      {/* Controles semana */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={semana}
            onChange={e => setSemana(e.target.value)}
            sx={{
              bgcolor: SURFACE, color: TEXT, borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              '& .MuiSvgIcon-root': { color: MUTED },
            }}
          >
            <MenuItem value="2026-W24">Semana 24 — 10 al 15 Jun</MenuItem>
            <MenuItem value="2026-W25">Semana 25 — 17 al 22 Jun</MenuItem>
            <MenuItem value="2026-W26">Semana 26 — 24 al 29 Jun</MenuItem>
          </Select>
        </FormControl>
        <Button size="small" startIcon={<NavigateBeforeIcon />}
          sx={{ color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '8px', textTransform: 'none' }}>
          Anterior
        </Button>
        <Button size="small" startIcon={<TodayIcon />}
          sx={{ color: MES_COLOR, border: `1px solid ${MES_COLOR}`, borderRadius: '8px', textTransform: 'none' }}>
          Hoy
        </Button>
        <Button size="small" endIcon={<NavigateNextIcon />}
          sx={{ color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '8px', textTransform: 'none' }}>
          Siguiente
        </Button>
      </Stack>

      {/* Gantt body */}
      <Card sx={{ ...cardSx, overflow: 'hidden' }}>
        {/* Cabecera de días */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '100px repeat(6, 1fr)',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <Box sx={{ p: 1.5, borderRight: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recurso
            </Typography>
          </Box>
          {DIAS.map(dia => (
            <Box key={dia} sx={{
              p: 1.5, textAlign: 'center',
              borderRight: `1px solid ${BORDER}`,
              bgcolor: dia === 'Mié 19' ? alpha(MES_COLOR, 0.08) : 'transparent',
            }}>
              <Typography sx={{ color: dia === 'Mié 19' ? MES_COLOR : TEXT, fontSize: 13, fontWeight: 600 }}>
                {dia}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Filas de líneas */}
        {GANTT_DATA.map((linea, li) => (
          <Box key={linea.nombre} sx={{
            display: 'grid',
            gridTemplateColumns: '100px repeat(6, 1fr)',
            borderBottom: li < GANTT_DATA.length - 1 ? `1px solid ${BORDER}` : 'none',
            minHeight: 56,
          }}>
            {/* Label línea */}
            <Box sx={{
              p: 1.5, borderRight: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center',
            }}>
              <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>
                {linea.nombre}
              </Typography>
            </Box>

            {/* 6 columnas de días — las barras se posicionan sobre la fila completa */}
            <Box sx={{
              gridColumn: '2 / 8',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              py: 1,
            }}>
              {linea.bars.map(bar => (
                <Tooltip key={bar.op} title={`${bar.op} · ${bar.producto}`} placement="top" arrow>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${bar.left}%`,
                      width: `${bar.width}%`,
                      height: 34,
                      borderRadius: '6px',
                      bgcolor: alpha(bar.color, bar.estado === 'CONF' ? 0.25 : 0.35),
                      border: `1.5px solid ${alpha(bar.color, bar.estado === 'EN_EJECUCION' ? 1 : 0.6)}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      px: 0.75,
                      overflow: 'hidden',
                      transition: 'filter 0.15s',
                      '&:hover': { filter: 'brightness(1.3)' },
                      ...(bar.estado === 'EN_EJECUCION' && {
                        boxShadow: `0 0 8px ${alpha(bar.color, 0.5)}`,
                      }),
                    }}
                  >
                    <Typography sx={{
                      color: bar.estado === 'CONF' ? alpha(bar.color, 0.7) : bar.color,
                      fontSize: 10,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      letterSpacing: '0.04em',
                    }}>
                      {bar.op}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
              {/* Líneas separadoras de columna */}
              {[1, 2, 3, 4, 5].map(i => (
                <Box key={i} sx={{
                  position: 'absolute',
                  left: `${(i / 6) * 100}%`,
                  top: 0, bottom: 0,
                  width: '1px',
                  bgcolor: BORDER,
                  pointerEvents: 'none',
                }} />
              ))}
            </Box>
          </Box>
        ))}
      </Card>

      {/* Leyenda de estados */}
      <Stack direction="row" spacing={2} mt={2} alignItems="center">
        <Typography sx={{ color: MUTED, fontSize: 12 }}>Estado:</Typography>
        {[
          { label: 'En ejecución', color: MES_COLOR, fill: 0.35 },
          { label: 'Programada',   color: '#8B5CF6',  fill: 0.35 },
          { label: 'Conflicto',    color: '#EF4444',  fill: 0.25 },
        ].map(s => (
          <Stack key={s.label} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 16, height: 10, borderRadius: '3px', bgcolor: alpha(s.color, s.fill), border: `1.5px solid ${s.color}` }} />
            <Typography sx={{ color: MUTED, fontSize: 12 }}>{s.label}</Typography>
          </Stack>
        ))}
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2} mt={2}>
        {[
          { label: 'Utilización global', value: '78%', color: '#10B981', icon: <CheckCircleIcon /> },
          { label: 'OPs programadas',    value: '24',  color: MES_COLOR,  icon: <ScheduleIcon /> },
          { label: 'Conflictos',         value: '2',   color: '#EF4444',  icon: <WarningAmberIcon />, chip: true },
        ].map(kpi => (
          <Grid key={kpi.label} size={{ xs: 12, md: 4 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: MUTED, fontSize: 12, mb: 0.5 }}>{kpi.label}</Typography>
                    <Typography sx={{ color: kpi.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                  {kpi.chip ? (
                    <Chip label={kpi.value} size="small"
                      sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', fontWeight: 700, border: `1px solid ${alpha('#EF4444', 0.4)}` }} />
                  ) : (
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '10px',
                      bgcolor: alpha(kpi.color, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {kpi.icon}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

// ─── Tab 1: Carga Capacidad ───────────────────────────────────────────────────

function TabCargaCapacidad() {
  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {CAPACIDAD_DATA.map(linea => {
          const color = cargaColor(linea.carga)
          return (
            <Grid key={linea.nombre} size={{ xs: 12, md: 4, lg: 2.4 }}>
              <Card sx={cardSx}>
                <CardContent>
                  <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 14, mb: 2 }}>
                    {linea.nombre}
                  </Typography>
                  <Stack alignItems="center" spacing={1.5}>
                    <RadialProgress value={linea.carga} color={color} />
                    <Chip
                      label={linea.estado}
                      size="small"
                      sx={{
                        bgcolor: alpha(color, 0.15),
                        color,
                        fontWeight: 700,
                        border: `1px solid ${alpha(color, 0.4)}`,
                        fontSize: 11,
                      }}
                    />
                    <Box sx={{ width: '100%' }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: MUTED, fontSize: 11 }}>Disponibles</Typography>
                        <Typography sx={{ color: TEXT, fontSize: 11, fontWeight: 600 }}>{linea.horasDisponibles} h</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" mt={0.25}>
                        <Typography sx={{ color: MUTED, fontSize: 11 }}>Utilizadas</Typography>
                        <Typography sx={{ color, fontSize: 11, fontWeight: 600 }}>{linea.horasUtilizadas} h</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Card sx={cardSx}>
        <CardContent>
          <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
            Cuellos de Botella Identificados
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Línea', 'Operación', '% Ocupación', 'Tiempo Disponible'].map(h => (
                    <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {CUELLOS_BOTELLA.map(row => {
                  const color = cargaColor(row.ocupacion)
                  return (
                    <TableRow key={row.linea} sx={{ '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) } }}>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{row.linea}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{row.operacion}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{
                            width: 80, height: 6, borderRadius: '3px',
                            bgcolor: alpha(color, 0.2),
                            position: 'relative', overflow: 'hidden',
                          }}>
                            <Box sx={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${row.ocupacion}%`,
                              bgcolor: color,
                              borderRadius: '3px',
                            }} />
                          </Box>
                          <Typography sx={{ color, fontSize: 13, fontWeight: 700 }}>{row.ocupacion}%</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{row.disponible} h</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── Tab 2: Secuenciación ─────────────────────────────────────────────────────

function TabSecuenciacion() {
  const [ordenes, setOrdenes] = useState<OrdenSecuencia[]>(SECUENCIA_INICIAL)
  const [aplicado, setAplicado] = useState(false)

  const mover = (idx: number, dir: -1 | 1) => {
    const next = [...ordenes]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setOrdenes(next)
    setAplicado(false)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography sx={{ color: MUTED, fontSize: 14 }}>
          Reordena las OPs para optimizar setup y cumplimiento de entregas
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => setAplicado(true)}
          sx={{
            bgcolor: aplicado ? '#10B981' : MES_COLOR,
            '&:hover': { bgcolor: aplicado ? '#059669' : MES_DARK },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {aplicado ? 'Secuencia aplicada' : 'Aplicar secuencia'}
        </Button>
      </Stack>

      <Card sx={cardSx}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['#', 'OP', 'Producto', 'Prioridad', 'Setup (min)', 'Proceso (min)', 'Entrega', 'Mover'].map(h => (
                  <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ordenes.map((op, idx) => {
                const pColor = prioridadColor(op.prioridad)
                return (
                  <TableRow key={op.op} sx={{ '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) } }}>
                    <TableCell sx={{ color: MUTED, borderColor: BORDER, fontWeight: 700, width: 40 }}>
                      {idx + 1}
                    </TableCell>
                    <TableCell sx={{ color: MES_COLOR, borderColor: BORDER, fontWeight: 700 }}>{op.op}</TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER, maxWidth: 200 }}>
                      <Typography sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {op.producto}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderColor: BORDER }}>
                      <Chip label={op.prioridad} size="small" sx={{
                        bgcolor: alpha(pColor, 0.15), color: pColor,
                        fontWeight: 700, border: `1px solid ${alpha(pColor, 0.4)}`, fontSize: 11,
                      }} />
                    </TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{op.setup}</TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{op.proceso}</TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{op.entrega}</TableCell>
                    <TableCell sx={{ borderColor: BORDER }}>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Subir" placement="top">
                          <span>
                            <Button size="small" onClick={() => mover(idx, -1)} disabled={idx === 0}
                              sx={{ minWidth: 28, p: 0.5, color: MUTED, '&:hover': { color: MES_COLOR } }}>
                              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Bajar" placement="top">
                          <span>
                            <Button size="small" onClick={() => mover(idx, 1)} disabled={idx === ordenes.length - 1}
                              sx={{ minWidth: 28, p: 0.5, color: MUTED, '&:hover': { color: MES_COLOR } }}>
                              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MESProgramacion() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="MES · Programación APS">
      <Box sx={{ bgcolor: BG, minHeight: '100%', p: { xs: 2, sm: 3 }, mx: -3, mt: -3 }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Box sx={{ width: 4, height: 20, bgcolor: MES_COLOR, borderRadius: '2px' }} />
                <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  MES · Programación Finita
                </Typography>
              </Stack>
              <Typography sx={{ color: TEXT, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                APS — Planificación de Capacidad
              </Typography>
            </Box>
            <Chip
              label="Semana 25 · 2026"
              sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700, border: `1px solid ${alpha(MES_COLOR, 0.3)}` }}
            />
          </Stack>

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
            <Tab label="Gantt" />
            <Tab label="Carga Capacidad" />
            <Tab label="Secuenciación" />
          </Tabs>

          {tab === 0 && <TabGantt />}
          {tab === 1 && <TabCargaCapacidad />}
          {tab === 2 && <TabSecuenciacion />}
        </Box>
      </Box>
    </Layout>
  )
}
