import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Grid, Card, CardContent, Divider, LinearProgress,
  TextField, MenuItem, Button, Select, FormControl, InputLabel,
} from '@mui/material'
import {
  Science, BarChart, Report, BugReport, CheckCircle, Warning,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'
const CARD_BG   = '#0F1E35'
const DARK_BG   = '#060C1A'

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultadoInsp = 'APROBADO' | 'RECHAZADO' | 'CONDICIONAL'
type SeveridadNC   = 'MAYOR' | 'MENOR' | 'CRÍTICA'
type EstadoNC      = 'ABIERTA' | 'EN CAPA' | 'CERRADA'

interface Inspeccion {
  orden: string; lote: string; tipo: 'INICIO' | 'PROCESO' | 'FINAL' | 'LIBERACIÓN'
  inspector: string; fecha: string; muestra: number; defectos: number; resultado: ResultadoInsp
}

interface NoConformidad {
  codigo: string; descripcion: string; op: string; linea: string
  severidad: SeveridadNC; estado: EstadoNC; dias: number
}

interface DefectoPareto {
  nombre: string; freq: number; pct: number; cumPct: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const inspecciones: Inspeccion[] = [
  { orden: 'OP-2024-0812', lote: 'LT-4421', tipo: 'INICIO',     inspector: 'Luis Peña',      fecha: '20/06/2024 07:15', muestra: 50, defectos: 0, resultado: 'APROBADO' },
  { orden: 'OP-2024-0813', lote: 'LT-4422', tipo: 'PROCESO',    inspector: 'Ana Torres',     fecha: '20/06/2024 08:30', muestra: 30, defectos: 1, resultado: 'CONDICIONAL' },
  { orden: 'OP-2024-0814', lote: 'LT-4423', tipo: 'FINAL',      inspector: 'Carlos Ruiz',    fecha: '20/06/2024 09:00', muestra: 80, defectos: 0, resultado: 'APROBADO' },
  { orden: 'OP-2024-0815', lote: 'LT-4424', tipo: 'LIBERACIÓN', inspector: 'María García',   fecha: '20/06/2024 09:45', muestra: 100, defectos: 0, resultado: 'APROBADO' },
  { orden: 'OP-2024-0816', lote: 'LT-4425', tipo: 'PROCESO',    inspector: 'Pedro López',    fecha: '20/06/2024 10:10', muestra: 30, defectos: 4, resultado: 'RECHAZADO' },
  { orden: 'OP-2024-0817', lote: 'LT-4426', tipo: 'INICIO',     inspector: 'Luis Peña',      fecha: '20/06/2024 10:50', muestra: 50, defectos: 0, resultado: 'APROBADO' },
  { orden: 'OP-2024-0818', lote: 'LT-4427', tipo: 'FINAL',      inspector: 'Ana Torres',     fecha: '20/06/2024 11:20', muestra: 80, defectos: 2, resultado: 'RECHAZADO' },
  { orden: 'OP-2024-0819', lote: 'LT-4428', tipo: 'PROCESO',    inspector: 'Carlos Ruiz',    fecha: '20/06/2024 12:00', muestra: 30, defectos: 0, resultado: 'APROBADO' },
  { orden: 'OP-2024-0820', lote: 'LT-4429', tipo: 'LIBERACIÓN', inspector: 'María García',   fecha: '20/06/2024 13:15', muestra: 100, defectos: 3, resultado: 'RECHAZADO' },
  { orden: 'OP-2024-0821', lote: 'LT-4430', tipo: 'INICIO',     inspector: 'Pedro López',    fecha: '20/06/2024 14:00', muestra: 50, defectos: 0, resultado: 'APROBADO' },
]

const spcPuntos = [10.2, 10.4, 9.9, 10.1, 10.3, 9.8, 10.5, 10.2, 10.6, 10.1, 9.7, 10.2, 10.3, 10.0, 10.1, 10.4, 10.8, 10.2, 9.9, 10.1]
const UCL = 10.7; const LCL = 9.6; const CL = 10.15

const noConformidades: NoConformidad[] = [
  { codigo: 'NC-2024-041', descripcion: 'Dimensión fuera de tolerancia en pieza A',   op: 'OP-2024-0790', linea: 'L-1', severidad: 'MAYOR',   estado: 'ABIERTA',  dias: 8  },
  { codigo: 'NC-2024-042', descripcion: 'Contaminación partículas metálicas lote B',  op: 'OP-2024-0795', linea: 'L-2', severidad: 'CRÍTICA', estado: 'EN CAPA',  dias: 12 },
  { codigo: 'NC-2024-043', descripcion: 'Peso de producto fuera de rango mínimo',     op: 'OP-2024-0801', linea: 'L-3', severidad: 'MENOR',   estado: 'ABIERTA',  dias: 3  },
  { codigo: 'NC-2024-044', descripcion: 'Defecto superficial en empaque primario',    op: 'OP-2024-0805', linea: 'L-1', severidad: 'MENOR',   estado: 'CERRADA',  dias: 15 },
  { codigo: 'NC-2024-045', descripcion: 'Viscosidad fuera de especificación lote D', op: 'OP-2024-0808', linea: 'L-4', severidad: 'MAYOR',   estado: 'EN CAPA',  dias: 6  },
  { codigo: 'NC-2024-046', descripcion: 'Temperatura proceso excede límite superior', op: 'OP-2024-0811', linea: 'L-2', severidad: 'CRÍTICA', estado: 'ABIERTA',  dias: 2  },
]

const defectos: DefectoPareto[] = [
  { nombre: 'Dimensión fuera de rango', freq: 34, pct: 32, cumPct: 32 },
  { nombre: 'Peso incorrecto',          freq: 28, pct: 26, cumPct: 58 },
  { nombre: 'Defecto superficial',      freq: 22, pct: 21, cumPct: 79 },
  { nombre: 'Contaminación',            freq: 12, pct: 11, cumPct: 90 },
  { nombre: 'Empaque dañado',           freq: 10, pct:  9, cumPct: 99 },
]

const causasRaiz = [
  { defecto: 'Dimensión fuera de rango', causa: 'Desgaste de herramienta de corte', accion: 'Cambio preventivo cada 500 piezas — en curso' },
  { defecto: 'Peso incorrecto',          causa: 'Calibración deficiente de báscula', accion: 'Calibración diaria 06:00 am — implementado' },
  { defecto: 'Defecto superficial',      causa: 'Contaminación en molde de inyección', accion: 'Limpieza de moldes cada turno — en revisión' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

function ResultadoChip({ r }: { r: ResultadoInsp }) {
  const map: Record<ResultadoInsp, string> = { APROBADO: '#16a34a', RECHAZADO: '#dc2626', CONDICIONAL: '#d97706' }
  return <Chip label={r} size="small" sx={{ bgcolor: map[r], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function SeveridadChip({ s }: { s: SeveridadNC }) {
  const map: Record<SeveridadNC, string> = { MAYOR: '#ea580c', MENOR: '#2563eb', 'CRÍTICA': '#dc2626' }
  return <Chip label={s} size="small" sx={{ bgcolor: map[s], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function EstadoNCChip({ e }: { e: EstadoNC }) {
  const map: Record<EstadoNC, string> = { ABIERTA: '#dc2626', 'EN CAPA': '#d97706', CERRADA: '#16a34a' }
  return <Chip label={e} size="small" sx={{ bgcolor: map[e], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function TipoChip({ t }: { t: string }) {
  const map: Record<string, string> = { INICIO: '#7c3aed', PROCESO: MES_COLOR, FINAL: '#16a34a', 'LIBERACIÓN': '#ea580c' }
  return <Chip label={t} size="small" sx={{ bgcolor: map[t] || '#475569', color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

// ─── Tab 0: Inspecciones ──────────────────────────────────────────────────────
function InspeccionesTab() {
  const [form, setForm] = useState({ op: '', tipo: '', muestra: '', defectos: '', resultado: '', obs: '' })

  const kpis = [
    { label: 'Inspecciones hoy', value: '28', color: MES_COLOR },
    { label: 'Aprobadas',        value: '24', color: '#16a34a' },
    { label: 'Rechazadas',       value: '3',  color: '#dc2626' },
    { label: 'Condicionales',    value: '1',  color: '#d97706' },
    { label: 'First Pass Yield', value: '93.8%', color: '#7c3aed' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs */}
      <Grid container spacing={2}>
        {kpis.map((k) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={k.label}>
            <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: 11, mt: 0.5, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla inspecciones */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Registro de Inspecciones del Día</Typography>
        <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: '1px solid #1e3a5f', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {['N° Orden', 'Lote', 'Tipo', 'Inspector', 'Fecha', 'Tam. Muestra', 'Defectos', 'Resultado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {inspecciones.map((row) => (
                <TableRow key={row.orden} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#60a5fa', fontWeight: 700, borderColor: '#1e3a5f', fontFamily: 'monospace', fontSize: 12 }}>{row.orden}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 12 }}>{row.lote}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}><TipoChip t={row.tipo} /></TableCell>
                  <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f', fontSize: 12 }}>{row.inspector}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 11, whiteSpace: 'nowrap' }}>{row.fecha}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f', textAlign: 'center', fontSize: 12 }}>{row.muestra}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f', textAlign: 'center' }}>
                    <Typography sx={{ color: row.defectos > 0 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 13 }}>{row.defectos}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}><ResultadoChip r={row.resultado} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Formulario rápido */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Registro Rápido de Inspección</Typography>
        <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1e3a5f', borderRadius: 2, p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Orden de Producción</InputLabel>
                <Select value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })}
                  sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' }, '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                  {inspecciones.map((i) => <MenuItem key={i.orden} value={i.orden}>{i.orden}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Inspección</InputLabel>
                <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' }, '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                  {['INICIO', 'PROCESO', 'FINAL', 'LIBERACIÓN'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField fullWidth size="small" label="Tam. Muestra" type="number"
                value={form.muestra} onChange={(e) => setForm({ ...form, muestra: e.target.value })}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                sx={{ '& input': { color: '#e2e8f0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }} />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField fullWidth size="small" label="Defectos" type="number"
                value={form.defectos} onChange={(e) => setForm({ ...form, defectos: e.target.value })}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                sx={{ '& input': { color: '#e2e8f0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Resultado</InputLabel>
                <Select value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                  sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' }, '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                  {['APROBADO', 'RECHAZADO', 'CONDICIONAL'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth size="small" label="Observaciones" multiline rows={2}
                value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                sx={{ '& textarea': { color: '#e2e8f0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a5f' } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: 2 }}>
                Registrar Inspección
              </Button>
            </Grid>
          </Grid>
        </Card>
      </Box>
    </Box>
  )
}

// ─── Tab 1: SPC ───────────────────────────────────────────────────────────────
function SPCTab() {
  const [variable, setVariable] = useState('Peso')
  const vars = ['Peso', 'Temperatura', 'Dimensión', 'Viscosidad']

  const min = Math.min(...spcPuntos); const max = Math.max(...spcPuntos)
  const rango = max - min + 0.2

  const toY = (val: number) => {
    const containerH = 180
    return ((val - (min - 0.1)) / rango) * containerH
  }

  const uclY = toY(UCL); const lclY = toY(LCL); const clY = toY(CL)

  const mediciones = spcPuntos.slice(-10).map((v, i) => ({
    num: i + 11, valor: v,
    desv: (v - CL).toFixed(3),
    estado: (v > UCL || v < LCL) ? 'FUERA' : 'EN CONTROL',
  }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs SPC */}
      <Grid container spacing={2}>
        {[
          { label: 'Cp', value: '1.42', color: '#16a34a', desc: 'Capacidad proceso' },
          { label: 'Cpk', value: '1.38', color: '#16a34a', desc: 'Capacidad centrada' },
          { label: 'Sigma', value: '3.8σ', color: MES_COLOR, desc: 'Nivel sigma' },
          { label: '% Fuera control', value: '2.1%', color: '#ef4444', desc: '1 de 20 puntos' },
        ].map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 30, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{k.label}</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 11 }}>{k.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Selector variable */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ color: '#94a3b8', fontWeight: 600 }}>Variable de control:</Typography>
        {vars.map((v) => (
          <Button key={v} size="small" onClick={() => setVariable(v)}
            variant={variable === v ? 'contained' : 'outlined'}
            sx={{
              bgcolor: variable === v ? MES_COLOR : 'transparent',
              borderColor: MES_COLOR, color: variable === v ? '#fff' : MES_COLOR,
              fontWeight: 700, textTransform: 'none',
              '&:hover': { bgcolor: `${MES_COLOR}22` },
            }}>{v}</Button>
        ))}
      </Box>

      {/* Carta de control CSS */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          Carta X-bar — {variable}
        </Typography>
        <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1e3a5f', borderRadius: 2, p: 2 }}>
          {/* Leyenda */}
          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            {[
              { label: `UCL = ${UCL}`, color: '#ef4444' },
              { label: `CL = ${CL}`, color: '#22c55e' },
              { label: `LCL = ${LCL}`, color: '#ef4444' },
              { label: 'En control', color: MES_COLOR },
              { label: 'Fuera control', color: '#ef4444' },
            ].map((l) => (
              <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 16, height: 3, bgcolor: l.color, borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>{l.label}</Typography>
              </Box>
            ))}
          </Box>

          {/* Área de la carta */}
          <Box sx={{ position: 'relative', height: 200, bgcolor: '#060C1A', borderRadius: 1, px: 2, py: 1, overflow: 'hidden' }}>
            {/* UCL */}
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: uclY, height: 1, bgcolor: '#ef4444', opacity: 0.8 }} />
            <Typography sx={{ position: 'absolute', right: 4, bottom: uclY + 2, color: '#ef4444', fontSize: 9, fontWeight: 700 }}>UCL</Typography>

            {/* LCL */}
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: lclY, height: 1, bgcolor: '#ef4444', opacity: 0.8 }} />
            <Typography sx={{ position: 'absolute', right: 4, bottom: lclY + 2, color: '#ef4444', fontSize: 9, fontWeight: 700 }}>LCL</Typography>

            {/* CL */}
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: clY, height: 1, bgcolor: '#22c55e', opacity: 0.8,
              borderTop: '1px dashed #22c55e' }} />
            <Typography sx={{ position: 'absolute', right: 4, bottom: clY + 2, color: '#22c55e', fontSize: 9, fontWeight: 700 }}>CL</Typography>

            {/* Puntos */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: '2px', position: 'relative', zIndex: 1 }}>
              {spcPuntos.map((v, i) => {
                const fuera = v > UCL || v < LCL
                const barH = Math.max(4, toY(v))
                return (
                  <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <Box sx={{ fontSize: 9, color: fuera ? '#ef4444' : '#94a3b8', mb: 0.3, fontWeight: fuera ? 900 : 400 }}>
                      {v}
                    </Box>
                    <Box sx={{
                      width: '80%', height: `${barH}px`,
                      bgcolor: fuera ? '#ef4444' : MES_COLOR,
                      opacity: fuera ? 1 : 0.75,
                      borderRadius: '3px 3px 0 0',
                      border: fuera ? '1px solid #ef4444' : 'none',
                      transition: 'all 0.2s',
                    }} />
                  </Box>
                )
              })}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>Últimas 20 mediciones — {variable}</Typography>
          </Box>
        </Card>
      </Box>

      {/* Tabla últimas 10 mediciones */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Últimas 10 Mediciones</Typography>
        <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: '1px solid #1e3a5f' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Valor', 'Desviación de CL', 'Estado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {mediciones.map((m) => (
                <TableRow key={m.num} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f' }}>{m.num}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 700, borderColor: '#1e3a5f' }}>{m.valor}</TableCell>
                  <TableCell sx={{ color: parseFloat(m.desv) >= 0 ? '#60a5fa' : '#f97316', fontWeight: 700, borderColor: '#1e3a5f' }}>
                    {parseFloat(m.desv) >= 0 ? '+' : ''}{m.desv}
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Chip label={m.estado} size="small"
                      sx={{ bgcolor: m.estado === 'EN CONTROL' ? '#16a34a22' : '#dc262622',
                        color: m.estado === 'EN CONTROL' ? '#22c55e' : '#ef4444',
                        fontWeight: 700, fontSize: 10, border: `1px solid ${m.estado === 'EN CONTROL' ? '#22c55e44' : '#ef444444'}` }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

// ─── Tab 2: No Conformidades ──────────────────────────────────────────────────
function NoConformidadesTab() {
  const [capaStates, setCapaStates] = useState<Record<string, boolean>>({})

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Resumen mes */}
      <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${MES_COLOR}33`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Resumen del Mes</Typography>
          <Grid container spacing={3}>
            {[
              { label: 'NCs Totales',   value: '18', color: MES_COLOR },
              { label: 'Cerradas',      value: '12', color: '#16a34a' },
              { label: 'Abiertas',      value: '6',  color: '#dc2626' },
              { label: 'Tasa de cierre', value: '67%', color: '#d97706' },
            ].map((k) => (
              <Grid size={{ xs: 6, md: 3 }} key={k.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 36, lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, mt: 0.5 }}>{k.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Cards NC */}
      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>No Conformidades Abiertas / En CAPA</Typography>
      <Grid container spacing={2}>
        {noConformidades.map((nc) => (
          <Grid size={{ xs: 12, md: 6 }} key={nc.codigo}>
            <Card sx={{
              bgcolor: CARD_BG,
              border: `1px solid ${nc.severidad === 'CRÍTICA' ? '#dc2626' : nc.severidad === 'MAYOR' ? '#ea580c' : '#1e3a5f'}44`,
              borderRadius: 2,
            }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography sx={{ color: '#60a5fa', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{nc.codigo}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <SeveridadChip s={nc.severidad} />
                    <EstadoNCChip e={nc.estado} />
                  </Box>
                </Box>
                <Typography sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, mb: 1 }}>{nc.descripcion}</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>OP: <span style={{ color: '#e2e8f0' }}>{nc.op}</span></Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Línea: <span style={{ color: '#e2e8f0' }}>{nc.linea}</span></Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Días abierta: <span style={{ color: nc.dias > 10 ? '#ef4444' : '#f59e0b' }}>{nc.dias} días</span></Typography>
                </Box>
                {nc.estado !== 'CERRADA' && (
                  <Button size="small" variant={capaStates[nc.codigo] ? 'contained' : 'outlined'}
                    onClick={() => setCapaStates((prev) => ({ ...prev, [nc.codigo]: !prev[nc.codigo] }))}
                    sx={{
                      borderColor: MES_COLOR, color: capaStates[nc.codigo] ? '#fff' : MES_COLOR,
                      bgcolor: capaStates[nc.codigo] ? MES_COLOR : 'transparent',
                      fontWeight: 700, textTransform: 'none', fontSize: 11,
                      '&:hover': { bgcolor: `${MES_COLOR}22` },
                    }}>
                    {capaStates[nc.codigo] ? '✓ CAPA Generada' : 'Generar CAPA'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

// ─── Tab 3: Defectología ──────────────────────────────────────────────────────
function DefectologiaTab() {
  const maxFreq = Math.max(...defectos.map((d) => d.freq))
  const barColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Pareto horizontal */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Diagrama de Pareto — Tipos de Defecto</Typography>
        <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1e3a5f', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {defectos.map((d, i) => {
              const barW = (d.freq / maxFreq) * 100
              return (
                <Box key={d.nombre}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{d.nombre}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ color: barColors[i], fontWeight: 900, fontSize: 13 }}>{d.freq}</Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: 12, minWidth: 40 }}>{d.pct}%</Typography>
                      <Typography sx={{ color: '#64748b', fontSize: 11, minWidth: 60 }}>acum: {d.cumPct}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ position: 'relative', height: 22, bgcolor: '#0a1628', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%', width: `${barW}%`, bgcolor: barColors[i], opacity: 0.85, borderRadius: 1,
                      transition: 'width 0.4s ease',
                    }} />
                    {/* Acumulado overlay */}
                    <Box sx={{
                      position: 'absolute', top: '50%', left: `${d.cumPct}%`, transform: 'translateX(-50%) translateY(-50%)',
                      width: 2, height: '100%', bgcolor: '#fff', opacity: 0.4,
                    }} />
                  </Box>
                </Box>
              )
            })}
          </Box>
          {/* Línea acumulada simulada */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                <Typography key={p} sx={{ color: '#334155', fontSize: 9 }}>{p}%</Typography>
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Box sx={{ width: 20, height: 2, bgcolor: '#fff', opacity: 0.4, borderTop: '2px dashed #fff' }} />
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>Línea de frecuencia acumulada</Typography>
          </Box>
        </Card>
      </Box>

      {/* Tabla Pareto */}
      <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: '1px solid #1e3a5f' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['#', 'Tipo de Defecto', 'Frecuencia', 'Porcentaje', '% Acumulado'].map((h) => (
                <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {defectos.map((d, i) => (
              <TableRow key={d.nombre} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                <TableCell sx={{ borderColor: '#1e3a5f' }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: barColors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 11 }}>
                    {i + 1}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', fontSize: 13 }}>{d.nombre}</TableCell>
                <TableCell sx={{ color: barColors[i], fontWeight: 900, fontSize: 14, borderColor: '#1e3a5f' }}>{d.freq}</TableCell>
                <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f' }}>{d.pct}%</TableCell>
                <TableCell sx={{ borderColor: '#1e3a5f' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={d.cumPct}
                      sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#1e3a5f', '& .MuiLinearProgress-bar': { bgcolor: '#7c3aed' } }} />
                    <Typography sx={{ color: '#7c3aed', fontSize: 12, fontWeight: 700, minWidth: 36 }}>{d.cumPct}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Causas raíz */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Top 3 Causas Raíz y Acciones Correctivas</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {causasRaiz.map((c, i) => (
            <Card key={i} sx={{ bgcolor: CARD_BG, border: `1px solid ${barColors[i]}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '14px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: barColors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                    {i + 1}
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{c.defecto}</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.3 }}>Causa: {c.causa}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <CheckCircle sx={{ fontSize: 14, color: '#22c55e' }} />
                      <Typography sx={{ color: '#22c55e', fontSize: 12 }}>{c.accion}</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MESCalidad() {
  const [tab, setTab] = useState(0)

  const tabLabels = ['Inspecciones', 'SPC', 'No Conformidades', 'Defectología']
  const tabIcons = [<CheckCircle />, <BarChart />, <Report />, <BugReport />]

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', bgcolor: DARK_BG, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: `${MES_COLOR}22`, border: `1px solid ${MES_COLOR}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: MES_COLOR,
          }}>
            <Science fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>
              MES — Control de Calidad
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
              ICOLTRANS · Inspecciones · SPC · No Conformidades · Defectología
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

        <TabPanel value={tab} index={0}><InspeccionesTab /></TabPanel>
        <TabPanel value={tab} index={1}><SPCTab /></TabPanel>
        <TabPanel value={tab} index={2}><NoConformidadesTab /></TabPanel>
        <TabPanel value={tab} index={3}><DefectologiaTab /></TabPanel>
      </Box>
    </Layout>
  )
}
