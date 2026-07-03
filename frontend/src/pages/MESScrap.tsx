import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Grid, Card, CardContent, Divider, LinearProgress,
  TextField, MenuItem, Button, Select, FormControl, InputLabel,
} from '@mui/material'
import {
  DeleteSweep, Autorenew, EmojiObjects, Analytics,
  CircleOutlined, Warning, CheckCircle,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'

// ─── Types ────────────────────────────────────────────────────────────────────
type TipoScrap    = 'MATERIAL' | 'PROCESO' | 'CONFIGURACIÓN' | 'OPERADOR'
type EstadoReproc = 'PENDIENTE' | 'EN PROCESO' | 'COMPLETADO'

interface ScrapRow {
  fecha: string; op: string; producto: string; tipo: TipoScrap; causa: string
  cantidad: number; costo: number; operario: string; reprocesable: boolean
}

interface ReprocRow {
  opOrigen: string; producto: string; cantidad: number; causa: string
  estado: EstadoReproc; fecha: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const scrapRows: ScrapRow[] = [
  { fecha: '20/06', op: 'OP-0812', producto: 'Ref. A-120', tipo: 'PROCESO',       causa: 'Temperatura excesiva', cantidad: 48,  costo: 960000,  operario: 'J. Martínez', reprocesable: false },
  { fecha: '20/06', op: 'OP-0813', producto: 'Ref. B-340', tipo: 'CONFIGURACIÓN', causa: 'Setup incorrecto',      cantidad: 32,  costo: 1280000, operario: 'A. Torres',   reprocesable: true  },
  { fecha: '19/06', op: 'OP-0801', producto: 'Ref. C-220', tipo: 'MATERIAL',      causa: 'MP fuera de spec',     cantidad: 120, costo: 2400000, operario: 'L. Peña',     reprocesable: false },
  { fecha: '19/06', op: 'OP-0802', producto: 'Ref. A-120', tipo: 'OPERADOR',      causa: 'Error humano',         cantidad: 18,  costo: 360000,  operario: 'C. Ruiz',     reprocesable: true  },
  { fecha: '19/06', op: 'OP-0795', producto: 'Ref. D-100', tipo: 'PROCESO',       causa: 'Desgaste herramienta', cantidad: 85,  costo: 1700000, operario: 'M. García',   reprocesable: false },
  { fecha: '18/06', op: 'OP-0789', producto: 'Ref. B-340', tipo: 'CONFIGURACIÓN', causa: 'Parámetro mal',        cantidad: 60,  costo: 2400000, operario: 'P. López',    reprocesable: true  },
  { fecha: '18/06', op: 'OP-0790', producto: 'Ref. E-500', tipo: 'MATERIAL',      causa: 'Contaminación',        cantidad: 200, costo: 3600000, operario: 'J. Martínez', reprocesable: false },
  { fecha: '17/06', op: 'OP-0780', producto: 'Ref. C-220', tipo: 'PROCESO',       causa: 'Velocidad excesiva',   cantidad: 45,  costo: 900000,  operario: 'A. Torres',   reprocesable: false },
  { fecha: '17/06', op: 'OP-0781', producto: 'Ref. A-120', tipo: 'OPERADOR',      causa: 'Mal manejo',           cantidad: 22,  costo: 440000,  operario: 'L. Peña',     reprocesable: true  },
  { fecha: '16/06', op: 'OP-0771', producto: 'Ref. D-100', tipo: 'PROCESO',       causa: 'Vibración excesiva',   cantidad: 70,  costo: 1400000, operario: 'C. Ruiz',     reprocesable: false },
]

const tendencia6m = [
  { mes: 'Ene', rate: 2.8 }, { mes: 'Feb', rate: 2.5 }, { mes: 'Mar', rate: 2.3 },
  { mes: 'Abr', rate: 2.4 }, { mes: 'May', rate: 2.2 }, { mes: 'Jun', rate: 2.1 },
]

const reprocRows: ReprocRow[] = [
  { opOrigen: 'OP-0813', producto: 'Ref. B-340', cantidad: 32,  causa: 'Setup incorrecto',   estado: 'EN PROCESO', fecha: '20/06' },
  { opOrigen: 'OP-0802', producto: 'Ref. A-120', cantidad: 18,  causa: 'Error operador',     estado: 'COMPLETADO', fecha: '19/06' },
  { opOrigen: 'OP-0789', producto: 'Ref. B-340', cantidad: 60,  causa: 'Parámetro incorrecto', estado: 'COMPLETADO', fecha: '18/06' },
  { opOrigen: 'OP-0781', producto: 'Ref. A-120', cantidad: 22,  causa: 'Mal manejo',         estado: 'COMPLETADO', fecha: '17/06' },
  { opOrigen: 'OP-0765', producto: 'Ref. E-500', cantidad: 90,  causa: 'Lote fuera de spec', estado: 'PENDIENTE',  fecha: '15/06' },
  { opOrigen: 'OP-0754', producto: 'Ref. C-220', cantidad: 45,  causa: 'Temperatura',        estado: 'EN PROCESO', fecha: '14/06' },
  { opOrigen: 'OP-0741', producto: 'Ref. D-100', cantidad: 120, causa: 'Dimensión',          estado: 'COMPLETADO', fecha: '12/06' },
  { opOrigen: 'OP-0730', producto: 'Ref. A-120', cantidad: 38,  causa: 'Contaminación menor', estado: 'PENDIENTE', fecha: '10/06' },
]

const kaizens = [
  { nombre: 'Reducción tiempo setup L-1', area: 'Línea 1', lider: 'J. Martínez', avance: 72, dias: 8  },
  { nombre: 'Estandarización 5S almacén', area: 'Almacén',  lider: 'A. Torres',   avance: 45, dias: 14 },
  { nombre: 'Eliminación movimientos NVA', area: 'Línea 3', lider: 'L. Peña',     avance: 88, dias: 3  },
  { nombre: 'Mejora flujo de materiales',  area: 'Picking',  lider: 'C. Ruiz',     avance: 30, dias: 21 },
  { nombre: 'Control visual de proceso',   area: 'Línea 2',  lider: 'M. García',   avance: 60, dias: 10 },
]

const cincoS = [
  { s: 'Seiri (Clasificar)',    pct: 88, area: 'Promedio' },
  { s: 'Seiton (Ordenar)',      pct: 82, area: 'Promedio' },
  { s: 'Seiso (Limpiar)',       pct: 91, area: 'Promedio' },
  { s: 'Seiketsu (Estandarizar)', pct: 76, area: 'Promedio' },
  { s: 'Shitsuke (Disciplina)', pct: 71, area: 'Promedio' },
]

const smedRows = [
  { referencia: 'Ref. A-120', antes: 45, despues: 18, reduccion: 60, objetivo: 12 },
  { referencia: 'Ref. B-340', antes: 52, despues: 24, reduccion: 54, objetivo: 18 },
  { referencia: 'Ref. C-220', antes: 38, despues: 16, reduccion: 58, objetivo: 10 },
  { referencia: 'Ref. D-100', antes: 61, despues: 28, reduccion: 54, objetivo: 20 },
]

const causasScrap = [
  { causa: 'Temperatura excesiva',   kg: 820, pct: 29 },
  { causa: 'MP fuera de spec',       kg: 740, pct: 26 },
  { causa: 'Setup incorrecto',       kg: 580, pct: 20 },
  { causa: 'Desgaste herramienta',   kg: 420, pct: 15 },
  { causa: 'Error operador',         kg: 280, pct: 10 },
]

const lineasScrap = [
  { linea: 'Línea 1', kg: 710,  pct: 2.8, costo: 12400000 },
  { linea: 'Línea 2', kg: 620,  pct: 2.3, costo: 10800000 },
  { linea: 'Línea 3', kg: 540,  pct: 2.0, costo:  9200000 },
  { linea: 'Línea 4', kg: 480,  pct: 1.8, costo:  8400000 },
  { linea: 'Línea 5', kg: 490,  pct: 1.7, costo:  7400000 },
]

const sparkline = [2.4, 2.1, 2.3, 1.9, 2.0, 2.2, 2.5, 2.1, 1.8, 2.0]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

function TipoScrapChip({ t }: { t: TipoScrap }) {
  const map: Record<TipoScrap, string> = { MATERIAL: '#7c3aed', PROCESO: MES_COLOR, 'CONFIGURACIÓN': '#ea580c', OPERADOR: '#d97706' }
  return <Chip label={t} size="small" sx={{ bgcolor: map[t], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function EstadoReprocChip({ e }: { e: EstadoReproc }) {
  const map: Record<EstadoReproc, string> = { PENDIENTE: '#64748b', 'EN PROCESO': MES_COLOR, COMPLETADO: '#16a34a' }
  return <Chip label={e} size="small" sx={{ bgcolor: map[e], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function semaforoColor(pct: number) {
  if (pct <= 1.5) return '#22c55e'
  if (pct <= 2.0) return '#f59e0b'
  return '#ef4444'
}

// ─── Tab 0: Scrap & Mermas ────────────────────────────────────────────────────
function ScrapTab() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs */}
      <Grid container spacing={2}>
        {[
          { label: 'Scrap Mes',    value: '2,840 kg', sub: '$48.2M COP',  color: '#ef4444' },
          { label: 'Scrap Rate',   value: '2.1%',     sub: 'del total prod', color: '#f97316' },
          { label: 'Meta Scrap',   value: '< 1.5%',   sub: 'objetivo mes', color: '#16a34a' },
          { label: 'Brecha',       value: '0.6 pp',   sub: 'por encima meta', color: '#dc2626' },
        ].map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Card sx={{ border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 26, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: 11, mt: 0.3 }}>{k.sub}</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 10, mt: 0.3, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla scrap */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Registros de Scrap</Typography>
        <TableContainer component={Paper} sx={{ border: '1px solid #1e3a5f', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {['Fecha', 'OP', 'Producto', 'Tipo', 'Causa', 'Cantidad', 'Costo Est.', 'Operario', 'Reprocesable'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {scrapRows.map((row, i) => (
                <TableRow key={i} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 12 }}>{row.fecha}</TableCell>
                  <TableCell sx={{ color: '#60a5fa', fontFamily: 'monospace', borderColor: '#1e3a5f', fontSize: 12 }}>{row.op}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', fontSize: 12 }}>{row.producto}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}><TipoScrapChip t={row.tipo} /></TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 12 }}>{row.causa}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f', fontSize: 12 }}>{row.cantidad} kg</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f', fontSize: 12, whiteSpace: 'nowrap' }}>
                    ${row.costo.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f', fontSize: 12 }}>{row.operario}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Chip label={row.reprocesable ? 'SÍ' : 'NO'} size="small"
                      sx={{ bgcolor: row.reprocesable ? '#16a34a22' : '#dc262622',
                        color: row.reprocesable ? '#22c55e' : '#ef4444',
                        fontWeight: 700, fontSize: 10 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Tendencia 6 meses */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Tendencia Scrap Rate — Últimos 6 Meses</Typography>
        <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130 }}>
            {tendencia6m.map((t) => {
              const barH = (t.rate / 3.5) * 110
              return (
                <Box key={t.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <Typography sx={{ color: semaforoColor(t.rate), fontWeight: 900, fontSize: 14, mb: 0.5 }}>{t.rate}%</Typography>
                  <Box sx={{
                    width: '70%', height: `${barH}px`,
                    bgcolor: semaforoColor(t.rate), opacity: 0.8,
                    borderRadius: '4px 4px 0 0', transition: 'all 0.3s',
                  }} />
                  <Box sx={{ width: '100%', height: 2, bgcolor: '#1e3a5f', mt: 0.5 }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.5, fontWeight: 600 }}>{t.mes}</Typography>
                </Box>
              )
            })}
          </Box>
          {/* Meta line */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Box sx={{ width: 20, height: 2, bgcolor: '#22c55e', borderTop: '2px dashed #22c55e' }} />
            <Typography sx={{ color: '#22c55e', fontSize: 11 }}>Meta: 1.5%</Typography>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}

// ─── Tab 1: Reprocesos ────────────────────────────────────────────────────────
function ReprocesosTab() {
  const [form, setForm] = useState({ op: '', cantidad: '', descripcion: '', operario: '', tiempo: '' })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs */}
      <Grid container spacing={2}>
        {[
          { label: 'Unidades Reprocesadas Mes', value: '840',     color: MES_COLOR },
          { label: 'Costo Reproceso Mes',       value: '$12.4M',  color: '#f97316' },
          { label: 'Tasa de Reproceso',         value: '0.8%',    color: '#d97706' },
        ].map((k) => (
          <Grid size={{ xs: 12, md: 4 }} key={k.label}>
            <Card sx={{ border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '14px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 30, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.5, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla reprocesos */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Órdenes de Reproceso</Typography>
        <TableContainer component={Paper} sx={{ border: '1px solid #1e3a5f', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                {['OP Original', 'Producto', 'Cantidad', 'Causa', 'Estado', 'Fecha'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {reprocRows.map((row, i) => (
                <TableRow key={i} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#60a5fa', fontFamily: 'monospace', borderColor: '#1e3a5f', fontSize: 12 }}>{row.opOrigen}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', fontSize: 12 }}>{row.producto}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f', fontSize: 12 }}>{row.cantidad} uds</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 12 }}>{row.causa}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}><EstadoReprocChip e={row.estado} /></TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 12 }}>{row.fecha}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Formulario registro */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Registrar Orden de Reproceso</Typography>
        <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2, p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>OP de Origen</InputLabel>
                <Select value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })}
                  sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' }, '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                  {reprocRows.map((r) => <MenuItem key={r.opOrigen} value={r.opOrigen}>{r.opOrigen}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField fullWidth size="small" label="Cantidad" type="number"
                value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                sx={{ '& input': { color: '#e2e8f0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Operario responsable"
                value={form.operario} onChange={(e) => setForm({ ...form, operario: e.target.value })}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                sx={{ '& input': { color: '#e2e8f0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Tiempo estimado (hrs)" type="number"
                value={form.tiempo} onChange={(e) => setForm({ ...form, tiempo: e.target.value })}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                sx={{ '& input': { color: '#e2e8f0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Descripción del trabajo" multiline rows={2}
                value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                sx={{ '& textarea': { color: '#e2e8f0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: 2 }}>
                Registrar Reproceso
              </Button>
            </Grid>
          </Grid>
        </Card>
      </Box>
    </Box>
  )
}

// ─── Tab 2: Lean Tools ────────────────────────────────────────────────────────
function LeanTab() {
  const [andonState, setAndonState] = useState<'VERDE' | 'AMARILLO' | 'ROJO'>('VERDE')
  const andonColors: Record<string, string> = { VERDE: '#22c55e', AMARILLO: '#f59e0b', ROJO: '#ef4444' }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={2}>

        {/* Andon */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircleOutlined sx={{ color: MES_COLOR }} />
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Sistema Andon</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                {(['VERDE', 'AMARILLO', 'ROJO'] as const).map((s) => (
                  <Box key={s} sx={{
                    width: 64, height: 64, borderRadius: '50%',
                    bgcolor: andonState === s ? andonColors[s] : `${andonColors[s]}33`,
                    border: `3px solid ${andonColors[s]}`,
                    boxShadow: andonState === s ? `0 0 24px ${andonColors[s]}88` : 'none',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </Box>
              <Typography sx={{ color: andonColors[andonState], fontWeight: 900, fontSize: 18, textAlign: 'center', mb: 2 }}>
                ESTADO: {andonState}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                {(['VERDE', 'AMARILLO', 'ROJO'] as const).map((s) => (
                  <Button key={s} size="small" onClick={() => setAndonState(s)}
                    sx={{ bgcolor: `${andonColors[s]}22`, color: andonColors[s], border: `1px solid ${andonColors[s]}55`,
                      fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: `${andonColors[s]}33` } }}>
                    {s}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Kaizen */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmojiObjects sx={{ color: '#f59e0b' }} />
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Eventos Kaizen Activos</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {kaizens.map((k) => (
                  <Box key={k.nombre}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Box>
                        <Typography sx={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{k.nombre}</Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 10 }}>{k.area} · {k.lider}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: k.avance >= 80 ? '#22c55e' : k.avance >= 50 ? '#f59e0b' : '#94a3b8', fontWeight: 900, fontSize: 14 }}>
                          {k.avance}%
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 10 }}>{k.dias}d rest.</Typography>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={k.avance}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#1e3a5f',
                        '& .MuiLinearProgress-bar': { bgcolor: k.avance >= 80 ? '#22c55e' : k.avance >= 50 ? '#f59e0b' : MES_COLOR } }} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 5S */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: '#22c55e' }} />
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Auditoría 5S</Typography>
                </Box>
                <Typography sx={{ color: '#64748b', fontSize: 11 }}>Última: 15/06/2024</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {cincoS.map((s, i) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444']
                  return (
                    <Box key={s.s}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                        <Typography sx={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{s.s}</Typography>
                        <Typography sx={{ color: colors[i], fontWeight: 900, fontSize: 13 }}>{s.pct}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={s.pct}
                        sx={{ height: 8, borderRadius: 4, bgcolor: '#1e3a5f',
                          '& .MuiLinearProgress-bar': { bgcolor: colors[i] } }} />
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* SMED */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Warning sx={{ color: MES_COLOR }} />
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>SMED — Tiempos de Changeover</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Referencia', 'Antes', 'Después', 'Reducción', 'Objetivo'].map((h) => (
                        <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 10, borderColor: '#1e3a5f', p: '4px 8px' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {smedRows.map((row) => (
                      <TableRow key={row.referencia} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                        <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f', fontSize: 11, p: '4px 8px' }}>{row.referencia}</TableCell>
                        <TableCell sx={{ color: '#ef4444', fontWeight: 700, borderColor: '#1e3a5f', fontSize: 11, p: '4px 8px' }}>{row.antes} min</TableCell>
                        <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f', fontSize: 11, p: '4px 8px' }}>{row.despues} min</TableCell>
                        <TableCell sx={{ color: MES_COLOR, fontWeight: 900, borderColor: '#1e3a5f', fontSize: 12, p: '4px 8px' }}>{row.reduccion}%</TableCell>
                        <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f', fontSize: 11, p: '4px 8px' }}>{row.objetivo} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  )
}

// ─── Tab 3: Análisis ──────────────────────────────────────────────────────────
function AnalisisTab() {
  const maxKg = Math.max(...causasScrap.map((c) => c.kg))
  const barColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']
  const sparkMax = Math.max(...sparkline)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Pareto causas */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Pareto de Causas de Scrap</Typography>
        <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {causasScrap.map((c, i) => (
              <Box key={c.causa}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{c.causa}</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ color: barColors[i], fontWeight: 900, fontSize: 13 }}>{c.kg} kg</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>{c.pct}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 22, bgcolor: '#0a1628', borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${(c.kg / maxKg) * 100}%`, bgcolor: barColors[i], opacity: 0.85, borderRadius: 1 }} />
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>

      {/* Scrap por línea */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Scrap por Línea de Producción</Typography>
        <TableContainer component={Paper} sx={{ border: '1px solid #1e3a5f' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Línea', 'Kg Scrap', '% Rate', 'Costo', 'Estado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {lineasScrap.map((l) => (
                <TableRow key={l.linea} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', fontSize: 13 }}>{l.linea}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f' }}>{l.kg} kg</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Typography sx={{ color: semaforoColor(l.pct), fontWeight: 900, fontSize: 14 }}>{l.pct}%</Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>
                    ${l.costo.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: semaforoColor(l.pct) }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Sparkline tendencia diaria */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Tendencia Diaria Scrap Rate — Últimas 2 Semanas</Typography>
        <Card sx={{ border: '1px solid #1e3a5f', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80 }}>
            {sparkline.map((v, i) => {
              const h = (v / sparkMax) * 70
              return (
                <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: 9, mb: 0.3 }}>{v}%</Typography>
                  <Box sx={{ width: '70%', height: `${h}px`, bgcolor: semaforoColor(v), opacity: 0.8, borderRadius: '3px 3px 0 0' }} />
                </Box>
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 1 }}>
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>07/Jun</Typography>
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>20/Jun</Typography>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MESScrap() {
  const [tab, setTab] = useState(0)

  const tabLabels = ['Scrap & Mermas', 'Reprocesos', 'Lean Tools', 'Análisis']
  const tabIcons = [<DeleteSweep />, <Autorenew />, <EmojiObjects />, <Analytics />]

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: `${MES_COLOR}22`, border: `1px solid ${MES_COLOR}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: MES_COLOR,
          }}>
            <DeleteSweep fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>
              MES — Scrap & Lean Manufacturing
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
              ICOLTRANS · Scrap · Reprocesos · Lean Tools · Análisis de Desperdicios
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ bgcolor: '#1e3a5f', mb: 3 }} />

        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{
          mb: 1,
          '& .MuiTab-root': { color: '#64748b', fontWeight: 600, textTransform: 'none', fontSize: 14 },
          '& .Mui-selected': { color: MES_COLOR },
          '& .MuiTabs-indicator': { bgcolor: MES_COLOR },
        }}>
          {tabLabels.map((label, i) => (
            <Tab key={label} label={label} icon={tabIcons[i]} iconPosition="start" />
          ))}
        </Tabs>

        <Divider sx={{ bgcolor: '#1e3a5f', mb: 1 }} />

        <TabPanel value={tab} index={0}><ScrapTab /></TabPanel>
        <TabPanel value={tab} index={1}><ReprocesosTab /></TabPanel>
        <TabPanel value={tab} index={2}><LeanTab /></TabPanel>
        <TabPanel value={tab} index={3}><AnalisisTab /></TabPanel>
      </Box>
    </Layout>
  )
}
