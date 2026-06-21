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
  TextField,
  alpha,
  Divider,
} from '@mui/material'
import PauseIcon from '@mui/icons-material/Pause'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReportIcon from '@mui/icons-material/Report'
import AddIcon from '@mui/icons-material/Add'
import PersonIcon from '@mui/icons-material/Person'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'
const BG        = '#060C1A'
const SURFACE   = '#0F1E35'
const BORDER    = '#1E3A5F'
const TEXT      = '#E2E8F0'
const MUTED     = '#94A3B8'

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
    bgcolor: alpha(SURFACE, 0.5),
    color: TEXT,
    borderRadius: '8px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: MES_COLOR },
    '&.Mui-focused fieldset': { borderColor: MES_COLOR },
  },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: MES_COLOR },
  '& .MuiSelect-icon': { color: MUTED },
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

interface OperacionActiva {
  op: string
  linea: string
  operario: string
  equipo: string
  producto: string
  producido: number
  meta: number
  tiempoMin: number
  estado: 'EN_PROGRESO' | 'PAUSADA'
}

const OPERACIONES: OperacionActiva[] = [
  { op: 'OP-2401', linea: 'Línea A', operario: 'Carlos Ruiz',      equipo: 'EQ-A01', producto: 'Aceite Motor 5W-30 1L',   producido: 840,  meta: 1200, tiempoMin: 187, estado: 'EN_PROGRESO' },
  { op: 'OP-2403', linea: 'Línea B', operario: 'Ana Gómez',        equipo: 'EQ-B01', producto: 'Grasa Industrial #2',      producido: 320,  meta: 500,  tiempoMin: 245, estado: 'EN_PROGRESO' },
  { op: 'OP-2405', linea: 'Línea C', operario: 'Luis Pérez',       equipo: 'EQ-C01', producto: 'Desengrasante Industrial', producido: 0,    meta: 800,  tiempoMin: 12,  estado: 'PAUSADA' },
  { op: 'OP-2408', linea: 'Línea D', operario: 'Martha Torres',    equipo: 'EQ-D01', producto: 'Aceite Compresor VDL 100', producido: 1100, meta: 1500, tiempoMin: 302, estado: 'EN_PROGRESO' },
  { op: 'OP-2410', linea: 'Línea C', operario: 'Jorge Salinas',    equipo: 'EQ-C02', producto: 'Filtro Aceite Premium',    producido: 200,  meta: 600,  tiempoMin: 95,  estado: 'PAUSADA' },
  { op: 'OP-2413', linea: 'Línea E', operario: 'Patricia Mora',    equipo: 'EQ-E01', producto: 'Fluido Frenos DOT 4',      producido: 450,  meta: 700,  tiempoMin: 178, estado: 'EN_PROGRESO' },
]

interface RegistroProduccion {
  hora: string; op: string; buena: number; scrap: number; tipo: string; operario: string
}

const REGISTROS: RegistroProduccion[] = [
  { hora: '07:15', op: 'OP-2401', buena: 120, scrap: 3,  tipo: 'NORMAL',    operario: 'C. Ruiz' },
  { hora: '07:45', op: 'OP-2403', buena: 80,  scrap: 0,  tipo: 'NORMAL',    operario: 'A. Gómez' },
  { hora: '08:00', op: 'OP-2408', buena: 200, scrap: 5,  tipo: 'REPROCESO', operario: 'M. Torres' },
  { hora: '08:30', op: 'OP-2401', buena: 130, scrap: 2,  tipo: 'NORMAL',    operario: 'C. Ruiz' },
  { hora: '08:45', op: 'OP-2413', buena: 90,  scrap: 8,  tipo: 'DEFECTO',   operario: 'P. Mora' },
  { hora: '09:00', op: 'OP-2403', buena: 100, scrap: 1,  tipo: 'NORMAL',    operario: 'A. Gómez' },
  { hora: '09:20', op: 'OP-2408', buena: 180, scrap: 0,  tipo: 'NORMAL',    operario: 'M. Torres' },
  { hora: '09:45', op: 'OP-2401', buena: 140, scrap: 4,  tipo: 'NORMAL',    operario: 'C. Ruiz' },
  { hora: '10:00', op: 'OP-2413', buena: 110, scrap: 2,  tipo: 'NORMAL',    operario: 'P. Mora' },
  { hora: '10:30', op: 'OP-2403', buena: 140, scrap: 0,  tipo: 'NORMAL',    operario: 'A. Gómez' },
]

interface Parada {
  id: number; equipo: string; tipo: string; causa: string
  horaInicio: string; duracion: number; estado: 'ACTIVA' | 'CERRADA'
}

const PARADAS: Parada[] = [
  { id: 1, equipo: 'EQ-C01', tipo: 'MECÁNICA',  causa: 'Falla rodamiento',    horaInicio: '06:30', duracion: 45, estado: 'CERRADA' },
  { id: 2, equipo: 'EQ-B02', tipo: 'SETUP',     causa: 'Cambio de formato',   horaInicio: '07:00', duracion: 25, estado: 'CERRADA' },
  { id: 3, equipo: 'EQ-A03', tipo: 'MATERIAL',  causa: 'Espera de MP',        horaInicio: '07:45', duracion: 30, estado: 'CERRADA' },
  { id: 4, equipo: 'EQ-C02', tipo: 'CALIDAD',   causa: 'Inspección lote',     horaInicio: '08:15', duracion: 20, estado: 'CERRADA' },
  { id: 5, equipo: 'EQ-D01', tipo: 'ELÉCTRICA', causa: 'Corte alimentación',  horaInicio: '08:50', duracion: 10, estado: 'CERRADA' },
  { id: 6, equipo: 'EQ-E01', tipo: 'OPERATIVA', causa: 'Pausa operario',      horaInicio: '09:20', duracion: 8,  estado: 'CERRADA' },
  { id: 7, equipo: 'EQ-C01', tipo: 'MECÁNICA',  causa: 'Ajuste banda',        horaInicio: '10:10', duracion: 0,  estado: 'ACTIVA' },
  { id: 8, equipo: 'EQ-B01', tipo: 'SETUP',     causa: 'Cambio lote',         horaInicio: '10:40', duracion: 0,  estado: 'ACTIVA' },
]

interface WIPItem {
  celda: string; producto: string; lote: string; cantidad: number
  unidad: string; fechaEntrada: string; tiempoHrs: number
}

const WIP_DATA: WIPItem[] = [
  { celda: 'MEZCLADO-01', producto: 'Base Aceite Mineral',      lote: 'LOT-2026-001', cantidad: 480,  unidad: 'kg',  fechaEntrada: '10:00', tiempoHrs: 0.8 },
  { celda: 'FILTRADO-01', producto: 'Aceite Mineral Tratado',   lote: 'LOT-2026-002', cantidad: 320,  unidad: 'kg',  fechaEntrada: '08:30', tiempoHrs: 2.2 },
  { celda: 'DOSIF-01',    producto: 'Compuesto Aditivo A',      lote: 'LOT-2026-003', cantidad: 150,  unidad: 'kg',  fechaEntrada: '06:00', tiempoHrs: 4.7 },
  { celda: 'ENVASADO-01', producto: 'Aceite Motor 5W-30 1L',    lote: 'LOT-2026-004', cantidad: 840,  unidad: 'und', fechaEntrada: '07:15', tiempoHrs: 3.5 },
  { celda: 'ETIQ-01',     producto: 'Aceite Motor 5W-30 1L',    lote: 'LOT-2026-004', cantidad: 700,  unidad: 'und', fechaEntrada: '05:00', tiempoHrs: 5.7 },
  { celda: 'DOSIF-02',    producto: 'Grasa Industrial #2',       lote: 'LOT-2026-005', cantidad: 200,  unidad: 'kg',  fechaEntrada: '02:00', tiempoHrs: 8.7 },
  { celda: 'ENVASADO-02', producto: 'Fluido Frenos DOT 4',       lote: 'LOT-2026-006', cantidad: 450,  unidad: 'und', fechaEntrada: '09:00', tiempoHrs: 1.7 },
  { celda: 'PALLETIZ-01', producto: 'Aceite Compresor VDL 100', lote: 'LOT-2026-007', cantidad: 700,  unidad: 'und', fechaEntrada: '04:00', tiempoHrs: 6.7 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tiempoStr(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function tipoParadaColor(tipo: string) {
  switch (tipo) {
    case 'MECÁNICA':  return '#EF4444'
    case 'ELÉCTRICA': return '#F59E0B'
    case 'CALIDAD':   return '#8B5CF6'
    case 'MATERIAL':  return '#0891B2'
    case 'SETUP':     return '#10B981'
    case 'OPERATIVA': return '#6B7280'
    default: return MUTED
  }
}

function wipSemaforo(hrs: number): { color: string; label: string } {
  if (hrs < 4)  return { color: '#10B981', label: 'Normal' }
  if (hrs < 8)  return { color: '#F59E0B', label: 'Alerta' }
  return { color: '#EF4444', label: 'Crítico' }
}

// ─── Tab 0: Operaciones Activas ───────────────────────────────────────────────

function TabOperaciones() {
  return (
    <Grid container spacing={2}>
      {OPERACIONES.map(op => {
        const pct = Math.min(100, Math.round((op.producido / op.meta) * 100))
        const estadoColor = op.estado === 'EN_PROGRESO' ? '#10B981' : '#F59E0B'
        return (
          <Grid key={op.op} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                  <Box>
                    <Typography sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 15 }}>{op.op}</Typography>
                    <Typography sx={{ color: MUTED, fontSize: 12 }}>{op.linea} · {op.equipo}</Typography>
                  </Box>
                  <Chip label={op.estado === 'EN_PROGRESO' ? 'En progreso' : 'Pausada'} size="small"
                    sx={{ bgcolor: alpha(estadoColor, 0.15), color: estadoColor, fontWeight: 700, border: `1px solid ${alpha(estadoColor, 0.4)}`, fontSize: 11 }} />
                </Stack>

                <Typography sx={{ color: TEXT, fontSize: 13, mb: 1.5, fontWeight: 500 }} noWrap>
                  {op.producto}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <PersonIcon sx={{ fontSize: 14, color: MUTED }} />
                  <Typography sx={{ color: MUTED, fontSize: 12 }}>{op.operario}</Typography>
                </Stack>

                {/* Barra progreso producción */}
                <Box mb={0.5}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ color: MUTED, fontSize: 11 }}>Producción</Typography>
                    <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>
                      {op.producido.toLocaleString('es-CO')} / {op.meta.toLocaleString('es-CO')} un
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 6, bgcolor: alpha(MES_COLOR, 0.15), borderRadius: '3px', overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%', width: `${pct}%`,
                      bgcolor: pct >= 90 ? '#10B981' : pct >= 60 ? MES_COLOR : '#F59E0B',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }} />
                  </Box>
                  <Typography sx={{ color: MUTED, fontSize: 11, mt: 0.25 }}>{pct}% completado</Typography>
                </Box>

                <Stack direction="row" justifyContent="space-between" mb={2}>
                  <Typography sx={{ color: MUTED, fontSize: 12 }}>Tiempo transcurrido</Typography>
                  <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{tiempoStr(op.tiempoMin)}</Typography>
                </Stack>

                <Divider sx={{ borderColor: BORDER, mb: 1.5 }} />

                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<PauseIcon />}
                    disabled={op.estado === 'PAUSADA'}
                    sx={{
                      flex: 1, borderRadius: '7px', textTransform: 'none', fontSize: 12,
                      color: '#F59E0B', border: `1px solid ${alpha('#F59E0B', 0.3)}`,
                      '&:hover': { bgcolor: alpha('#F59E0B', 0.08) },
                      '&.Mui-disabled': { color: alpha(MUTED, 0.4), border: `1px solid ${alpha(MUTED, 0.2)}` },
                    }}>
                    Pausar
                  </Button>
                  <Button size="small" startIcon={<CheckCircleIcon />}
                    sx={{
                      flex: 1, borderRadius: '7px', textTransform: 'none', fontSize: 12,
                      color: '#10B981', border: `1px solid ${alpha('#10B981', 0.3)}`,
                      '&:hover': { bgcolor: alpha('#10B981', 0.08) },
                    }}>
                    Completar
                  </Button>
                  <Button size="small" startIcon={<ReportIcon />}
                    sx={{
                      flex: 1, borderRadius: '7px', textTransform: 'none', fontSize: 12,
                      color: '#EF4444', border: `1px solid ${alpha('#EF4444', 0.3)}`,
                      '&:hover': { bgcolor: alpha('#EF4444', 0.08) },
                    }}>
                    Parada
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

// ─── Tab 1: Registrar Producción ──────────────────────────────────────────────

function TabRegistrarProduccion() {
  const [form, setForm] = useState({
    op: '', buena: '', scrap: '', tipoScrap: 'NORMAL', turno: '1', operario: '', obs: '',
  })
  const [guardado, setGuardado] = useState(false)

  const handleGuardar = () => {
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2.5 }}>
              Nuevo registro de producción
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth size="small" sx={inputSx}>
                <InputLabel>OP Activa</InputLabel>
                <Select value={form.op} onChange={e => setForm(f => ({ ...f, op: e.target.value }))} label="OP Activa">
                  {OPERACIONES.filter(o => o.estado === 'EN_PROGRESO').map(o => (
                    <MenuItem key={o.op} value={o.op}>{o.op} — {o.producto}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Cantidad buena" type="number"
                    value={form.buena} onChange={e => setForm(f => ({ ...f, buena: e.target.value }))}
                    sx={inputSx} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Cantidad scrap" type="number"
                    value={form.scrap} onChange={e => setForm(f => ({ ...f, scrap: e.target.value }))}
                    sx={inputSx} />
                </Grid>
              </Grid>

              <FormControl fullWidth size="small" sx={inputSx}>
                <InputLabel>Tipo scrap</InputLabel>
                <Select value={form.tipoScrap} onChange={e => setForm(f => ({ ...f, tipoScrap: e.target.value }))} label="Tipo scrap">
                  {['NORMAL', 'REPROCESO', 'DEFECTO'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small" sx={inputSx}>
                    <InputLabel>Turno</InputLabel>
                    <Select value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))} label="Turno">
                      <MenuItem value="1">Turno 1 (6:00–14:00)</MenuItem>
                      <MenuItem value="2">Turno 2 (14:00–22:00)</MenuItem>
                      <MenuItem value="3">Turno 3 (22:00–6:00)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small" sx={inputSx}>
                    <InputLabel>Operario</InputLabel>
                    <Select value={form.operario} onChange={e => setForm(f => ({ ...f, operario: e.target.value }))} label="Operario">
                      {['Carlos Ruiz', 'Ana Gómez', 'Luis Pérez', 'Martha Torres', 'Jorge Salinas', 'Patricia Mora'].map(o => (
                        <MenuItem key={o} value={o}>{o}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField fullWidth size="small" label="Observaciones" multiline rows={2}
                value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
                sx={inputSx} />

              <Button variant="contained" onClick={handleGuardar}
                sx={{
                  bgcolor: guardado ? '#10B981' : MES_COLOR,
                  '&:hover': { bgcolor: guardado ? '#059669' : MES_DARK },
                  borderRadius: '8px', textTransform: 'none', fontWeight: 600, py: 1.2,
                }}>
                {guardado ? 'Registro guardado' : 'Guardar registro'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
              Últimos 10 registros del turno
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Hora', 'OP', 'Buena', 'Scrap', 'Tipo', 'Operario'].map(h => (
                      <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {REGISTROS.map((r, i) => (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) } }}>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{r.hora}</TableCell>
                      <TableCell sx={{ color: MES_COLOR, borderColor: BORDER, fontWeight: 600, fontSize: 12 }}>{r.op}</TableCell>
                      <TableCell sx={{ color: '#10B981', borderColor: BORDER, fontWeight: 600 }}>{r.buena}</TableCell>
                      <TableCell sx={{ color: r.scrap > 0 ? '#EF4444' : MUTED, borderColor: BORDER, fontWeight: r.scrap > 0 ? 700 : 400 }}>{r.scrap}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Chip label={r.tipo} size="small" sx={{
                          bgcolor: alpha(r.tipo === 'NORMAL' ? MES_COLOR : r.tipo === 'REPROCESO' ? '#F59E0B' : '#EF4444', 0.12),
                          color: r.tipo === 'NORMAL' ? MES_COLOR : r.tipo === 'REPROCESO' ? '#F59E0B' : '#EF4444',
                          fontSize: 10, fontWeight: 600,
                        }} />
                      </TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{r.operario}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// ─── Tab 2: Paradas ───────────────────────────────────────────────────────────

function TabParadas() {
  const [formP, setFormP] = useState({
    equipo: '', tipo: '', causa: '', desc: '',
    horaInicio: new Date().toTimeString().slice(0, 5),
  })
  const [registrado, setRegistrado] = useState(false)

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2.5 }}>
              Registrar parada
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth size="small" sx={inputSx}>
                <InputLabel>Equipo</InputLabel>
                <Select value={formP.equipo} onChange={e => setFormP(f => ({ ...f, equipo: e.target.value }))} label="Equipo">
                  {['EQ-A01','EQ-A02','EQ-B01','EQ-B02','EQ-C01','EQ-C02','EQ-D01','EQ-E01'].map(e => (
                    <MenuItem key={e} value={e}>{e}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={inputSx}>
                <InputLabel>Tipo de parada</InputLabel>
                <Select value={formP.tipo} onChange={e => setFormP(f => ({ ...f, tipo: e.target.value }))} label="Tipo de parada">
                  {['MECÁNICA','ELÉCTRICA','CALIDAD','MATERIAL','SETUP','OPERATIVA'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={inputSx}>
                <InputLabel>Causa</InputLabel>
                <Select value={formP.causa} onChange={e => setFormP(f => ({ ...f, causa: e.target.value }))} label="Causa">
                  {['Falla rodamiento','Corte alimentación','Ajuste banda','Cambio formato','Espera MP','Inspección lote','Pausa operario','Calibración sensor'].map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField fullWidth size="small" label="Descripción breve"
                value={formP.desc} onChange={e => setFormP(f => ({ ...f, desc: e.target.value }))}
                sx={inputSx} />

              <TextField fullWidth size="small" label="Hora inicio"
                value={formP.horaInicio} onChange={e => setFormP(f => ({ ...f, horaInicio: e.target.value }))}
                sx={inputSx} />

              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => { setRegistrado(true); setTimeout(() => setRegistrado(false), 2000) }}
                sx={{
                  bgcolor: registrado ? '#10B981' : '#EF4444',
                  '&:hover': { bgcolor: registrado ? '#059669' : '#DC2626' },
                  borderRadius: '8px', textTransform: 'none', fontWeight: 600, py: 1.2,
                }}>
                {registrado ? 'Parada registrada' : 'Registrar parada'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Resumen turno */}
        <Card sx={{ ...cardSx, mt: 2 }}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 14, mb: 1.5 }}>Resumen del turno</Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: MUTED, fontSize: 13 }}>Total paradas</Typography>
                <Typography sx={{ color: '#EF4444', fontSize: 14, fontWeight: 700 }}>145 min</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: MUTED, fontSize: 13 }}>Tiempo perdido</Typography>
                <Typography sx={{ color: '#F59E0B', fontSize: 14, fontWeight: 700 }}>30.2%</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: MUTED, fontSize: 13 }}>Paradas registradas</Typography>
                <Typography sx={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>8</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
              Paradas del turno
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Equipo','Tipo','Causa','Inicio','Duración','Estado'].map(h => (
                      <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {PARADAS.map(p => {
                    const tColor = tipoParadaColor(p.tipo)
                    const eColor = p.estado === 'ACTIVA' ? '#EF4444' : '#10B981'
                    return (
                      <TableRow key={p.id} sx={{ '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) } }}>
                        <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600, fontSize: 12 }}>{p.equipo}</TableCell>
                        <TableCell sx={{ borderColor: BORDER }}>
                          <Chip label={p.tipo} size="small" sx={{
                            bgcolor: alpha(tColor, 0.12), color: tColor, fontSize: 10, fontWeight: 600,
                            border: `1px solid ${alpha(tColor, 0.3)}`,
                          }} />
                        </TableCell>
                        <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{p.causa}</TableCell>
                        <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{p.horaInicio}</TableCell>
                        <TableCell sx={{ color: p.duracion > 0 ? TEXT : MUTED, borderColor: BORDER, fontSize: 12 }}>
                          {p.duracion > 0 ? `${p.duracion} min` : 'En curso'}
                        </TableCell>
                        <TableCell sx={{ borderColor: BORDER }}>
                          <Chip label={p.estado} size="small" sx={{
                            bgcolor: alpha(eColor, 0.12), color: eColor, fontSize: 10, fontWeight: 700,
                            border: `1px solid ${alpha(eColor, 0.3)}`,
                          }} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// ─── Tab 3: WIP ───────────────────────────────────────────────────────────────

function TabWIP() {
  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'WIP Total', value: '2,840', unit: 'un', color: MES_COLOR },
          { label: 'Celdas con acumulación', value: '3', unit: 'celdas', color: '#EF4444' },
          { label: 'Throughput actual', value: '420', unit: 'un/h', color: '#10B981' },
        ].map(kpi => (
          <Grid key={kpi.label} size={{ xs: 12, md: 4 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Typography sx={{ color: MUTED, fontSize: 12, mb: 0.5 }}>{kpi.label}</Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography sx={{ color: kpi.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{kpi.value}</Typography>
                  <Typography sx={{ color: MUTED, fontSize: 13 }}>{kpi.unit}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={cardSx}>
        <CardContent>
          <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
            WIP por celda productiva
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['Celda','Producto','Lote','Cantidad','Unidad','Entrada','Tiempo en celda','Estado'].map(h => (
                    <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {WIP_DATA.map((w, i) => {
                  const sem = wipSemaforo(w.tiempoHrs)
                  return (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) } }}>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600, fontSize: 13 }}>{w.celda}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{w.producto}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{w.lote}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{w.cantidad.toLocaleString('es-CO')}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{w.unidad}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{w.fechaEntrada}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Typography sx={{ color: sem.color, fontWeight: 700, fontSize: 13 }}>
                          {w.tiempoHrs.toFixed(1)} h
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sem.color, boxShadow: `0 0 6px ${alpha(sem.color, 0.7)}` }} />
                          <Typography sx={{ color: sem.color, fontSize: 12, fontWeight: 600 }}>{sem.label}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Leyenda semáforo */}
          <Stack direction="row" spacing={3} mt={2} pt={1.5} sx={{ borderTop: `1px solid ${BORDER}` }}>
            {[
              { color: '#10B981', label: 'Normal — menos de 4 h' },
              { color: '#F59E0B', label: 'Alerta — entre 4 y 8 h' },
              { color: '#EF4444', label: 'Crítico — más de 8 h' },
            ].map(s => (
              <Stack key={s.color} direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                <Typography sx={{ color: MUTED, fontSize: 12 }}>{s.label}</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MESEjecucion() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="MES · Ejecución en Planta">
      <Box sx={{ bgcolor: BG, minHeight: '100%', p: { xs: 2, sm: 3 }, mx: -3, mt: -3 }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Box sx={{ width: 4, height: 20, bgcolor: MES_COLOR, borderRadius: '2px' }} />
                <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  MES · Captura en Planta
                </Typography>
              </Stack>
              <Typography sx={{ color: TEXT, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Ejecución — Turno 1
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip label="Turno 1 · 6:00–14:00" size="small"
                sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 600, border: `1px solid ${alpha(MES_COLOR, 0.3)}` }} />
              <Chip label="6 activas" size="small"
                sx={{ bgcolor: alpha('#10B981', 0.12), color: '#10B981', fontWeight: 600, border: `1px solid ${alpha('#10B981', 0.3)}` }} />
            </Stack>
          </Stack>

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
            <Tab label="Operaciones activas" />
            <Tab label="Registrar producción" />
            <Tab label="Paradas" />
            <Tab label="WIP" />
          </Tabs>

          {tab === 0 && <TabOperaciones />}
          {tab === 1 && <TabRegistrarProduccion />}
          {tab === 2 && <TabParadas />}
          {tab === 3 && <TabWIP />}
        </Box>
      </Box>
    </Layout>
  )
}
