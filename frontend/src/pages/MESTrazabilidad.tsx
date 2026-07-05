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
  TextField,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Collapse,
  Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'
const SURFACE   = '#FFFFFF'
const BORDER    = '#E5E7EB'
const TEXT      = '#1E293B'
const MUTED     = '#64748B'

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

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    '&:hover fieldset': { borderColor: MES_COLOR },
    '&.Mui-focused fieldset': { borderColor: MES_COLOR },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: MES_COLOR },
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

interface NodoArbol {
  id: string
  nombre: string
  lote: string
  tipo: 'PT' | 'MP' | 'EMP' | 'INFO'
  estado: 'LIBERADO' | 'EN_USO' | 'BLOQUEADO' | 'APROBADO'
  color: string
  hijos?: NodoArbol[]
  detalle?: { proveedor?: string; fechaRec?: string; certCalidad?: string; cantidad?: string }
}

const ARBOL_GENEALOGIA: NodoArbol = {
  id: 'PT-001',
  nombre: 'Aceite Motor 5W-30 1L',
  lote: 'PT-2024-LOT-001',
  tipo: 'PT',
  estado: 'LIBERADO',
  color: '#10B981',
  hijos: [
    {
      id: 'MP-001',
      nombre: 'Base Aceite Mineral',
      lote: 'LOT-MP-001',
      tipo: 'MP',
      estado: 'EN_USO',
      color: MES_COLOR,
      detalle: { proveedor: 'Petroquímica del Norte SA', fechaRec: '2026-06-15', certCalidad: 'CERT-2026-0412', cantidad: '480 kg' },
      hijos: [
        { id: 'info-prov',  nombre: 'Proveedor', lote: 'Petroquímica del Norte SA', tipo: 'INFO', estado: 'APROBADO', color: MUTED },
        { id: 'info-fecha', nombre: 'Recepción',  lote: '2026-06-15 08:30',          tipo: 'INFO', estado: 'APROBADO', color: MUTED },
        { id: 'info-cert',  nombre: 'Certificado', lote: 'CERT-2026-0412',            tipo: 'INFO', estado: 'APROBADO', color: '#10B981' },
      ],
    },
    {
      id: 'MP-002',
      nombre: 'Paquete Aditivos A100',
      lote: 'LOT-MP-002',
      tipo: 'MP',
      estado: 'EN_USO',
      color: '#8B5CF6',
      detalle: { proveedor: 'Lubrizol Colombia', fechaRec: '2026-06-14', certCalidad: 'CERT-2026-0389', cantidad: '120 kg' },
    },
    {
      id: 'EMP-001',
      nombre: 'Envase PET 1L + Tapa',
      lote: 'LOT-EMP-001',
      tipo: 'EMP',
      estado: 'APROBADO',
      color: '#F59E0B',
      detalle: { proveedor: 'Plásticos Modernos SAS', fechaRec: '2026-06-13', certCalidad: 'CERT-EMP-0021', cantidad: '1200 und' },
    },
  ],
}

interface EventoTimeline {
  fecha: string; evento: string; responsable: string; detalle?: string
  icono: 'RECEPCION' | 'PRODUCCION' | 'INSPECCION' | 'EMPAQUE' | 'LIBERACION' | 'DESPACHO'
}

const TIMELINE_LOTE: EventoTimeline[] = [
  { fecha: '2026-06-15 08:30', evento: 'Recepción de materias primas', responsable: 'Almacén — Jorge Salinas',    icono: 'RECEPCION',  detalle: 'Base Aceite Mineral + Aditivos. Ingreso a cuarentena.' },
  { fecha: '2026-06-16 06:00', evento: 'Inicio producción',            responsable: 'Producción — Carlos Ruiz',   icono: 'PRODUCCION', detalle: 'Línea A · OP-2401. Mezcla base 480 kg.' },
  { fecha: '2026-06-16 14:00', evento: 'Inspección en proceso',        responsable: 'Calidad — Ana Torres',       icono: 'INSPECCION', detalle: 'Viscosidad: 96 cSt ✓  Densidad: 0.871 g/cm³ ✓' },
  { fecha: '2026-06-17 07:00', evento: 'Empaque y etiquetado',         responsable: 'Producción — Martha Torres', icono: 'EMPAQUE',    detalle: '1,140 unidades empacadas. 12 scrap por defecto de sello.' },
  { fecha: '2026-06-17 15:00', evento: 'Liberación por Calidad',       responsable: 'QC — Ingrid López',          icono: 'LIBERACION', detalle: 'Lote aprobado. Cod. liberación QC-2026-0844.' },
  { fecha: '2026-06-18 09:00', evento: 'Despacho a cliente',           responsable: 'Logística — Pedro Castro',   icono: 'DESPACHO',   detalle: 'Remisión R-2026-2841 · Destino: Distribuciones del Caribe.' },
]

const MATERIAS_INVERSAS = [
  { mp: 'Base Aceite Mineral',  lote: 'LOT-MP-001', proveedor: 'Petroquímica del Norte SA', cantidad: '480 kg',  fecha: '2026-06-15' },
  { mp: 'Paquete Aditivos A100', lote: 'LOT-MP-002', proveedor: 'Lubrizol Colombia',          cantidad: '120 kg',  fecha: '2026-06-14' },
  { mp: 'Envase PET 1L + Tapa', lote: 'LOT-EMP-001', proveedor: 'Plásticos Modernos SAS',     cantidad: '1,200 und', fecha: '2026-06-13' },
  { mp: 'Etiqueta Autoadhesiva', lote: 'LOT-ETQ-007', proveedor: 'Etiketas Andinas',           cantidad: '1,200 und', fecha: '2026-06-12' },
]

const OPS_AFECTADAS = [
  { op: 'OP-2401', producto: 'Aceite Motor 5W-30 1L',   linea: 'Línea A', estado: 'EN_EJECUCION', riesgo: 'ALTO' },
  { op: 'OP-2408', producto: 'Aceite Compresor VDL 100', linea: 'Línea D', estado: 'PROGRAMADA',   riesgo: 'ALTO' },
  { op: 'OP-2415', producto: 'Aceite Hidráulico ISO 46', linea: 'Línea C', estado: 'PROGRAMADA',   riesgo: 'MEDIO' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estadoColor(e: string) {
  switch (e) {
    case 'LIBERADO':  return '#10B981'
    case 'EN_USO':    return MES_COLOR
    case 'BLOQUEADO': return '#EF4444'
    case 'APROBADO':  return '#8B5CF6'
    default: return MUTED
  }
}

function iconoTimeline(tipo: EventoTimeline['icono']) {
  switch (tipo) {
    case 'RECEPCION':  return { bg: MES_COLOR,   label: 'R' }
    case 'PRODUCCION': return { bg: '#8B5CF6',    label: 'P' }
    case 'INSPECCION': return { bg: '#F59E0B',    label: 'I' }
    case 'EMPAQUE':    return { bg: '#10B981',    label: 'E' }
    case 'LIBERACION': return { bg: '#10B981',    label: 'L' }
    case 'DESPACHO':   return { bg: '#6366F1',    label: 'D' }
  }
}

function riesgoColor(r: string) {
  if (r === 'ALTO')  return '#EF4444'
  if (r === 'MEDIO') return '#F59E0B'
  return '#10B981'
}

// ─── Nodo árbol genealogía ────────────────────────────────────────────────────

function NodoGenealogico({ nodo, nivel }: { nodo: NodoArbol; nivel: number }) {
  const [expandido, setExpandido] = useState(true)
  const tieneHijos = nodo.hijos && nodo.hijos.length > 0

  return (
    <Box sx={{ ml: nivel * 3 }}>
      {/* Línea conectora vertical */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {nivel > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1, pt: 1.5 }}>
            <Box sx={{ width: 1, height: 12, bgcolor: BORDER }} />
            <Box sx={{ width: 16, height: 1, bgcolor: BORDER }} />
          </Box>
        )}

        <Tooltip title={nodo.detalle ? `Proveedor: ${nodo.detalle.proveedor || '—'} · Rec: ${nodo.detalle.fechaRec || '—'}` : ''} placement="right" arrow>
          <Box
            onClick={() => tieneHijos && setExpandido(e => !e)}
            sx={{
              border: `1.5px solid ${alpha(nodo.color, nodo.tipo === 'INFO' ? 0.3 : 0.6)}`,
              borderRadius: '10px',
              p: 1.5,
              mb: 1,
              bgcolor: alpha(nodo.color, nodo.tipo === 'INFO' ? 0.04 : 0.08),
              cursor: tieneHijos ? 'pointer' : 'default',
              transition: 'all 0.15s',
              minWidth: 220,
              maxWidth: 320,
              '&:hover': tieneHijos ? { bgcolor: alpha(nodo.color, 0.14), borderColor: nodo.color } : {},
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: nodo.tipo === 'INFO' ? MUTED : TEXT, fontSize: 13, fontWeight: 600, mb: 0.25 }} noWrap>
                  {nodo.nombre}
                </Typography>
                <Typography sx={{ color: nodo.color, fontSize: 11, fontFamily: 'monospace', opacity: 0.85 }}>
                  {nodo.lote}
                </Typography>
              </Box>
              {nodo.tipo !== 'INFO' && (
                <Chip label={nodo.estado} size="small" sx={{
                  bgcolor: alpha(estadoColor(nodo.estado), 0.15),
                  color: estadoColor(nodo.estado),
                  fontSize: 10, fontWeight: 700, ml: 1, flexShrink: 0,
                  border: `1px solid ${alpha(estadoColor(nodo.estado), 0.3)}`,
                }} />
              )}
            </Stack>
            {nodo.detalle?.cantidad && (
              <Typography sx={{ color: MUTED, fontSize: 11, mt: 0.5 }}>
                Cantidad: {nodo.detalle.cantidad}
              </Typography>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Hijos */}
      {tieneHijos && (
        <Collapse in={expandido}>
          <Box sx={{ ml: nivel > 0 ? 2 : 0 }}>
            {nodo.hijos!.map(hijo => (
              <NodoGenealogico key={hijo.id} nodo={hijo} nivel={nivel + 1} />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  )
}

// ─── Tab 0: Árbol Genealogía ──────────────────────────────────────────────────

function TabArbolGenealogía() {
  const [busqueda, setBusqueda] = useState('')
  const [mostrar, setMostrar] = useState(true)

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={3}>
        <TextField
          fullWidth size="small"
          placeholder="Buscar lote o OP — ej. PT-2024-LOT-001"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          sx={{ ...inputSx, maxWidth: 480 }}
        />
        <Button variant="contained" startIcon={<SearchIcon />}
          onClick={() => setMostrar(true)}
          sx={{
            bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK },
            borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3,
          }}>
          Buscar
        </Button>
      </Stack>

      {mostrar && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>
                    Árbol de genealogía — PT-2024-LOT-001
                  </Typography>
                  <Chip label="Producto terminado" size="small"
                    sx={{ bgcolor: alpha('#10B981', 0.12), color: '#10B981', fontWeight: 600, fontSize: 11, border: `1px solid ${alpha('#10B981', 0.3)}` }} />
                </Stack>

                <Box sx={{ overflowX: 'auto', pb: 1 }}>
                  <NodoGenealogico nodo={ARBOL_GENEALOGIA} nivel={0} />
                </Box>

                <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${BORDER}` }}>
                  <Typography sx={{ color: MUTED, fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                    Haz clic en un nodo con hijos para contraerlo / expandirlo. Pasa el cursor para ver detalles.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
                  Resumen de componentes
                </Typography>
                <Stack spacing={2}>
                  {[
                    { label: 'Producto terminado', lote: 'PT-2024-LOT-001', cantidad: '1,140 un', color: '#10B981' },
                    { label: 'Base Aceite Mineral', lote: 'LOT-MP-001', cantidad: '480 kg', color: MES_COLOR },
                    { label: 'Paquete Aditivos A100', lote: 'LOT-MP-002', cantidad: '120 kg', color: '#8B5CF6' },
                    { label: 'Envase PET 1L + Tapa', lote: 'LOT-EMP-001', cantidad: '1,200 und', color: '#F59E0B' },
                  ].map(c => (
                    <Box key={c.lote} sx={{
                      p: 1.5, borderRadius: '8px',
                      border: `1px solid ${alpha(c.color, 0.3)}`,
                      bgcolor: alpha(c.color, 0.05),
                    }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{c.label}</Typography>
                          <Typography sx={{ color: c.color, fontSize: 11, fontFamily: 'monospace' }}>{c.lote}</Typography>
                        </Box>
                        <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{c.cantidad}</Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

// ─── Tab 1: Búsqueda por Lote ─────────────────────────────────────────────────

function TabBusquedaLote() {
  const [query, setQuery] = useState('')
  const [encontrado, setEncontrado] = useState(true)

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={3}>
        <TextField
          fullWidth size="small"
          placeholder="Ingresa número de lote — ej. PT-2024-LOT-001 · LOT-MP-001 · LOT-EMP-001"
          value={query}
          onChange={e => setQuery(e.target.value)}
          sx={{ ...inputSx, maxWidth: 560 }}
        />
        <Button variant="contained" startIcon={<SearchIcon />}
          onClick={() => setEncontrado(true)}
          sx={{
            bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK },
            borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3,
          }}>
          Buscar lote
        </Button>
      </Stack>

      {encontrado && (
        <Grid container spacing={3}>
          {/* Card datos lote */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>
                    Datos del lote
                  </Typography>
                  <Chip label="LIBERADO" size="small"
                    sx={{ bgcolor: alpha('#10B981', 0.12), color: '#10B981', fontWeight: 700, border: `1px solid ${alpha('#10B981', 0.3)}` }} />
                </Stack>

                <Stack spacing={1.5}>
                  {[
                    { label: 'Producto',          value: 'Aceite Motor 5W-30 1L' },
                    { label: '# Lote',            value: 'PT-2024-LOT-001', mono: true, color: MES_COLOR },
                    { label: 'Cantidad producida', value: '1,140 unidades' },
                    { label: 'Fecha fabricación', value: '2026-06-16' },
                    { label: 'Fecha vencimiento', value: '2028-06-16' },
                    { label: 'OP de origen',      value: 'OP-2401', mono: true, color: MES_COLOR },
                    { label: 'Línea',             value: 'Línea A' },
                  ].map(f => (
                    <Stack key={f.label} direction="row" justifyContent="space-between" sx={{ pb: 1, borderBottom: `1px solid ${alpha(BORDER, 0.6)}` }}>
                      <Typography sx={{ color: MUTED, fontSize: 13 }}>{f.label}</Typography>
                      <Typography sx={{
                        color: f.color || TEXT,
                        fontSize: 13, fontWeight: 600,
                        fontFamily: f.mono ? 'monospace' : 'inherit',
                      }}>{f.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2.5 }}>
                  Historial de eventos
                </Typography>

                <Box sx={{ position: 'relative', pl: 3.5 }}>
                  {/* Línea vertical continua */}
                  <Box sx={{
                    position: 'absolute', left: 11, top: 16, bottom: 16,
                    width: 2, bgcolor: alpha(MES_COLOR, 0.2), borderRadius: '1px',
                  }} />

                  <Stack spacing={0}>
                    {TIMELINE_LOTE.map((ev, i) => {
                      const ico = iconoTimeline(ev.icono)
                      const esUltimo = i === TIMELINE_LOTE.length - 1
                      return (
                        <Box key={i} sx={{ position: 'relative', pb: esUltimo ? 0 : 2.5 }}>
                          {/* Punto circular */}
                          <Box sx={{
                            position: 'absolute', left: -28, top: 4,
                            width: 22, height: 22, borderRadius: '50%',
                            bgcolor: ico.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 8px ${alpha(ico.bg, 0.5)}`,
                            zIndex: 1,
                          }}>
                            <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>{ico.label}</Typography>
                          </Box>

                          <Box sx={{
                            p: 1.5, borderRadius: '8px',
                            border: `1px solid ${alpha(ico.bg, 0.25)}`,
                            bgcolor: alpha(ico.bg, 0.05),
                          }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{ev.evento}</Typography>
                              <Typography sx={{ color: MUTED, fontSize: 11, ml: 1, flexShrink: 0 }}>{ev.fecha}</Typography>
                            </Stack>
                            <Typography sx={{ color: MUTED, fontSize: 12, mt: 0.25 }}>{ev.responsable}</Typography>
                            {ev.detalle && (
                              <Typography sx={{ color: alpha(TEXT, 0.7), fontSize: 11, mt: 0.75, lineHeight: 1.4 }}>
                                {ev.detalle}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

// ─── Tab 2: Trazabilidad Inversa ──────────────────────────────────────────────

function TabTrazabilidadInversa() {
  const [lotePT, setLotePT] = useState('PT-2024-LOT-001')
  const [mostrar, setMostrar] = useState(true)
  const [bloquear, setBloquear] = useState(false)

  return (
    <Box>
      {/* Sección 1: ¿Qué MP se usaron? */}
      <Card sx={{ ...cardSx, mb: 3 }}>
        <CardContent>
          <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
            Consulta directa
          </Typography>
          <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
            ¿Qué materias primas se usaron para fabricar este lote?
          </Typography>

          <Stack direction="row" spacing={1.5} mb={3}>
            <TextField size="small" value={lotePT} onChange={e => setLotePT(e.target.value)}
              placeholder="Lote de producto terminado"
              sx={{ ...inputSx, minWidth: 280 }} />
            <Button variant="contained" startIcon={<SearchIcon />} onClick={() => setMostrar(true)}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
              Consultar
            </Button>
          </Stack>

          {mostrar && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Materia prima','Lote MP','Proveedor','Cantidad usada','Fecha recepción'].map(h => (
                      <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MATERIAS_INVERSAS.map((m, i) => (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) } }}>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{m.mp}</TableCell>
                      <TableCell sx={{ color: MES_COLOR, borderColor: BORDER, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{m.lote}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{m.proveedor}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{m.cantidad}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{m.fecha}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Sección 2: Análisis de impacto */}
      <Card sx={cardSx}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                Análisis de impacto
              </Typography>
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>
                ¿Qué OPs se verían afectadas si bloqueamos LOT-MP-001?
              </Typography>
            </Box>
            <Button
              variant={bloquear ? 'contained' : 'outlined'}
              startIcon={bloquear ? <CheckCircleIcon /> : <WarningAmberIcon />}
              onClick={() => setBloquear(b => !b)}
              sx={{
                borderRadius: '8px', textTransform: 'none', fontWeight: 600,
                ...(bloquear
                  ? { bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }
                  : { color: '#EF4444', borderColor: alpha('#EF4444', 0.5), '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }
                ),
              }}
            >
              {bloquear ? 'Bloqueo simulado activo' : 'Simular bloqueo de lote'}
            </Button>
          </Stack>

          {bloquear && (
            <Box sx={{ p: 1.5, mb: 2, borderRadius: '8px', bgcolor: alpha('#EF4444', 0.08), border: `1px solid ${alpha('#EF4444', 0.3)}` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningAmberIcon sx={{ color: '#EF4444', fontSize: 18 }} />
                <Typography sx={{ color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                  Simulación activa — LOT-MP-001 bloqueado. Las siguientes OPs quedarían sin insumo.
                </Typography>
              </Stack>
            </Box>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['OP','Producto','Línea','Estado actual','Riesgo'].map(h => (
                    <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {OPS_AFECTADAS.map(op => {
                  const rColor = riesgoColor(op.riesgo)
                  const eColor = op.estado === 'EN_EJECUCION' ? '#10B981' : MES_COLOR
                  return (
                    <TableRow key={op.op} sx={{
                      '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) },
                      ...(bloquear && { bgcolor: alpha('#EF4444', 0.04) }),
                    }}>
                      <TableCell sx={{ color: MES_COLOR, borderColor: BORDER, fontWeight: 700, fontFamily: 'monospace' }}>{op.op}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{op.producto}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 13 }}>{op.linea}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Chip label={op.estado.replace('_', ' ')} size="small" sx={{
                          bgcolor: alpha(eColor, 0.12), color: eColor, fontSize: 10, fontWeight: 700,
                          border: `1px solid ${alpha(eColor, 0.3)}`,
                        }} />
                      </TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: rColor, boxShadow: `0 0 6px ${alpha(rColor, 0.6)}` }} />
                          <Typography sx={{ color: rColor, fontWeight: 700, fontSize: 13 }}>{op.riesgo}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${BORDER}` }}>
            <Stack direction="row" spacing={3}>
              {[
                { color: '#EF4444', label: 'Alto — detención inmediata de producción' },
                { color: '#F59E0B', label: 'Medio — posible impacto en próximas 8 h' },
                { color: '#10B981', label: 'Bajo — no impacta operación actual' },
              ].map(s => (
                <Stack key={s.color} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                  <Typography sx={{ color: MUTED, fontSize: 12 }}>{s.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MESTrazabilidad() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="MES · Trazabilidad">
      <Box sx={{ minHeight: '100%', p: { xs: 2, sm: 3 }, mx: -3, mt: -3 }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Box sx={{ width: 4, height: 20, bgcolor: MES_COLOR, borderRadius: '2px' }} />
                <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  MES · Trazabilidad Total
                </Typography>
              </Stack>
              <Typography sx={{ color: TEXT, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Genealogía del Producto
              </Typography>
            </Box>
            <Chip
              label="Datos en tiempo real"
              size="small"
              sx={{ bgcolor: alpha('#10B981', 0.12), color: '#10B981', fontWeight: 600, border: `1px solid ${alpha('#10B981', 0.3)}` }}
            />
          </Stack>

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
            <Tab label="Árbol genealogía" />
            <Tab label="Búsqueda por lote" />
            <Tab label="Trazabilidad inversa" />
          </Tabs>

          {tab === 0 && <TabArbolGenealogía />}
          {tab === 1 && <TabBusquedaLote />}
          {tab === 2 && <TabTrazabilidadInversa />}
        </Box>
      </Box>
    </Layout>
  )
}
