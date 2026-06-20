// QMS Module - Indicadores
import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Typography, Chip, Button, Card, CardContent, Grid,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Stack, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Tooltip, alpha, Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import VerifiedIcon from '@mui/icons-material/Verified'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import SpeedIcon from '@mui/icons-material/Speed'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'

const QMS_COLOR = '#059669'
const QMS_COLOR_DARK = '#047857'

interface Indicador {
  id: string
  nombre: string
  proceso: string
  valor: string
  meta: string
  unidad: string
  semaforo: 'GREEN' | 'YELLOW' | 'RED'
  variacion: number
  sparkline: number[]
}

interface Medicion {
  indicador: string
  periodo: string
  valor: string
  meta: string
  cumple: boolean
  variacion: string
  registradoPor: string
  obs: string
}

const INDICADORES_DATA: Indicador[] = [
  {
    id: 'IND-001',
    nombre: 'OTIF - Transporte',
    proceso: 'Transporte Nacional',
    valor: '94.2',
    meta: '95',
    unidad: '%',
    semaforo: 'YELLOW',
    variacion: -0.8,
    sparkline: [92, 94, 91, 95, 93, 94],
  },
  {
    id: 'IND-002',
    nombre: 'Índice de Rechazo',
    proceso: 'Recepción/Almacenamiento',
    valor: '0.8',
    meta: '< 1',
    unidad: '%',
    semaforo: 'GREEN',
    variacion: -0.2,
    sparkline: [1.2, 1.0, 0.9, 1.1, 0.8, 0.8],
  },
  {
    id: 'IND-003',
    nombre: 'Satisfacción Cliente',
    proceso: 'Gestión Comercial',
    valor: '4.3',
    meta: '4.5',
    unidad: '/5',
    semaforo: 'YELLOW',
    variacion: 0.1,
    sparkline: [4.1, 4.2, 4.0, 4.3, 4.2, 4.3],
  },
  {
    id: 'IND-004',
    nombre: 'NC Cerradas en Plazo',
    proceso: 'Gestión de Calidad',
    valor: '87',
    meta: '90',
    unidad: '%',
    semaforo: 'YELLOW',
    variacion: 2,
    sparkline: [80, 83, 85, 82, 85, 87],
  },
  {
    id: 'IND-005',
    nombre: 'Efectividad CAPA',
    proceso: 'Mejora Continua',
    valor: '78',
    meta: '85',
    unidad: '%',
    semaforo: 'RED',
    variacion: -3,
    sparkline: [82, 80, 81, 79, 81, 78],
  },
  {
    id: 'IND-006',
    nombre: 'Proveedores Aprobados',
    proceso: 'Compras',
    valor: '92',
    meta: '90',
    unidad: '%',
    semaforo: 'GREEN',
    variacion: 1,
    sparkline: [88, 89, 90, 91, 91, 92],
  },
  {
    id: 'IND-007',
    nombre: 'Accidentes SST',
    proceso: 'SST',
    valor: '0',
    meta: '0',
    unidad: 'accidentes',
    semaforo: 'GREEN',
    variacion: 0,
    sparkline: [0, 1, 0, 0, 0, 0],
  },
  {
    id: 'IND-008',
    nombre: 'Costo No Calidad',
    proceso: 'Gestión de Calidad',
    valor: '$12.4M',
    meta: '< $15M',
    unidad: 'COP',
    semaforo: 'GREEN',
    variacion: -5,
    sparkline: [14, 13, 15, 13, 12, 12],
  },
]

const MEDICIONES_DATA: Medicion[] = [
  { indicador: 'OTIF - Transporte', periodo: '2026-05', valor: '94.2%', meta: '95%', cumple: false, variacion: '-0.8%', registradoPor: 'Ana García', obs: 'Demoras en zona norte' },
  { indicador: 'Índice de Rechazo', periodo: '2026-05', valor: '0.8%', meta: '<1%', cumple: true, variacion: '-0.2%', registradoPor: 'Carlos Ruiz', obs: '' },
  { indicador: 'Satisfacción Cliente', periodo: '2026-05', valor: '4.3/5', meta: '4.5/5', cumple: false, variacion: '+0.1', registradoPor: 'María López', obs: 'Mejora en comunicación' },
  { indicador: 'NC Cerradas en Plazo', periodo: '2026-05', valor: '87%', meta: '90%', cumple: false, variacion: '+2%', registradoPor: 'Pedro Silva', obs: '' },
  { indicador: 'Efectividad CAPA', periodo: '2026-05', valor: '78%', meta: '85%', cumple: false, variacion: '-3%', registradoPor: 'Juan Pérez', obs: 'Requiere refuerzo' },
  { indicador: 'Proveedores Aprobados', periodo: '2026-05', valor: '92%', meta: '90%', cumple: true, variacion: '+1%', registradoPor: 'Ana García', obs: '' },
  { indicador: 'Accidentes SST', periodo: '2026-05', valor: '0', meta: '0', cumple: true, variacion: '0', registradoPor: 'RRHH', obs: '' },
  { indicador: 'Costo No Calidad', periodo: '2026-05', valor: '$12.4M', meta: '<$15M', cumple: true, variacion: '-5%', registradoPor: 'Financiero', obs: '' },
  { indicador: 'OTIF - Transporte', periodo: '2026-04', valor: '93.4%', meta: '95%', cumple: false, variacion: '-1.6%', registradoPor: 'Ana García', obs: '' },
  { indicador: 'Índice de Rechazo', periodo: '2026-04', valor: '1.0%', meta: '<1%', cumple: false, variacion: '+0.1%', registradoPor: 'Carlos Ruiz', obs: 'Revisión proceso' },
]

const semaforoColor: Record<string, string> = {
  GREEN: '#059669',
  YELLOW: '#F59E0B',
  RED: '#EF4444',
}

const maxSparkline = (arr: number[]) => Math.max(...arr) || 1

export default function QMSIndicadores() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [openMedicion, setOpenMedicion] = useState(false)
  const [periodo, setPeriodo] = useState('2026-06')

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Stack direction="row" alignItems="center" gap={2}>
            <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: QMS_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SpeedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                Indicadores de Calidad
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Motor de medición y seguimiento de KPIs del SGC
              </Typography>
            </Box>
            <Chip
              label="QMS"
              size="small"
              sx={{ background: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, borderRadius: '8px' }}
            />
          </Stack>
          <Stack direction="row" gap={1} alignItems="center">
            <TextField
              type="month"
              size="small"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              sx={{ width: 160 }}
              label="Período"
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}
            >
              Nuevo Indicador
            </Button>
          </Stack>
        </Stack>

        {/* Period selector chips */}
        <Stack direction="row" gap={1} mb={3}>
          {['MES', 'TRIMESTRE', 'AÑO'].map(p => (
            <Chip
              key={p}
              label={p}
              size="small"
              clickable
              sx={{ fontWeight: 600, fontSize: 11, bgcolor: alpha(QMS_COLOR, 0.1), color: QMS_COLOR }}
            />
          ))}
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}
        >
          <Tab label="Tablero de KPIs" />
          <Tab label="Registro de Mediciones" />
          <Tab label="Metas" />
        </Tabs>

        {/* Tab 0: Tablero de KPIs */}
        {tab === 0 && (
          <Grid container spacing={2}>
            {INDICADORES_DATA.map(ind => {
              const color = semaforoColor[ind.semaforo]
              const spark = ind.sparkline
              const maxS = maxSparkline(spark)
              return (
                <Grid key={ind.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      border: '2px solid',
                      borderColor: alpha(color, 0.4),
                      borderRadius: '14px',
                      p: 2,
                      height: '100%',
                      background: alpha(color, 0.03),
                    }}
                  >
                    {/* Semáforo dot */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize={10} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {ind.proceso}
                      </Typography>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                    </Stack>

                    <Typography variant="body2" fontWeight={700} color="text.primary" mb={1.5} lineHeight={1.3}>
                      {ind.nombre}
                    </Typography>

                    {/* Value vs Target */}
                    <Stack direction="row" alignItems="baseline" gap={0.5} mb={0.5}>
                      <Typography variant="h5" fontWeight={800} color={color}>
                        {ind.valor}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={10}>{ind.unidad}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" fontSize={11} mb={1.5} display="block">
                      Meta: {ind.meta} {ind.unidad}
                    </Typography>

                    {/* Sparkline */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 32, mb: 1.5 }}>
                      {spark.map((v, i) => (
                        <Box
                          key={i}
                          sx={{
                            flex: 1,
                            height: `${(v / maxS) * 100}%`,
                            bgcolor: i === spark.length - 1 ? color : alpha(color, 0.4),
                            borderRadius: '2px 2px 0 0',
                            minHeight: 3,
                          }}
                        />
                      ))}
                    </Box>

                    {/* Variation */}
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      {ind.variacion > 0
                        ? <TrendingUpIcon sx={{ fontSize: 14, color: '#059669' }} />
                        : ind.variacion < 0
                        ? <TrendingDownIcon sx={{ fontSize: 14, color: '#EF4444' }} />
                        : null}
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        fontSize={11}
                        color={ind.variacion > 0 ? '#059669' : ind.variacion < 0 ? '#EF4444' : 'text.secondary'}
                      >
                        {ind.variacion > 0 ? '+' : ''}{ind.variacion}% vs período anterior
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        )}

        {/* Tab 1: Registro de Mediciones */}
        {tab === 1 && (
          <Box>
            <Stack direction="row" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setOpenMedicion(true)}
                sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}
              >
                Registrar Medición
              </Button>
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', bgcolor: alpha(QMS_COLOR, 0.04) } }}>
                    <TableCell>Indicador</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Meta</TableCell>
                    <TableCell>Cumple</TableCell>
                    <TableCell>Var%</TableCell>
                    <TableCell>Registrado por</TableCell>
                    <TableCell>Observaciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MEDICIONES_DATA.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{row.indicador}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.periodo}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={700}>{row.valor}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{row.meta}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          label={row.cumple ? 'SÍ' : 'NO'}
                          size="small"
                          sx={{ fontSize: 10, height: 20, fontWeight: 700, color: '#fff', bgcolor: row.cumple ? '#059669' : '#EF4444' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color={row.variacion.startsWith('+') ? '#059669' : row.variacion.startsWith('-') ? '#EF4444' : 'text.secondary'}
                        >
                          {row.variacion}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{row.registradoPor}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{row.obs || '—'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Metas */}
        {tab === 2 && (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', bgcolor: alpha(QMS_COLOR, 0.04) } }}>
                  <TableCell>Indicador</TableCell>
                  <TableCell>Proceso</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Meta 2026</TableCell>
                  <TableCell>Meta Q1</TableCell>
                  <TableCell>Meta Q2</TableCell>
                  <TableCell>Meta Q3</TableCell>
                  <TableCell>Meta Q4</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {INDICADORES_DATA.map(ind => (
                  <TableRow key={ind.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{ind.nombre}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{ind.proceso}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{ind.unidad}</Typography></TableCell>
                    <TableCell><Typography variant="body2" fontWeight={700} color={QMS_COLOR}>{ind.meta}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{ind.meta}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{ind.meta}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{ind.meta}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{ind.meta}</Typography></TableCell>
                    <TableCell>
                      <Tooltip title="Editar meta">
                        <IconButton size="small" sx={{ color: QMS_COLOR }}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog: Nuevo Indicador */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
            Crear Nuevo Indicador
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Código" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField label="Nombre del Indicador" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Proceso Asociado" fullWidth size="small" select defaultValue="">
                  {['Transporte Nacional', 'Gestión de Calidad', 'Recepción/Almacenamiento', 'Gestión Comercial'].map(p =>
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  )}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Unidad de Medida" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Frecuencia" fullWidth size="small" select defaultValue="">
                  {['MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'].map(f =>
                    <MenuItem key={f} value={f}>{f}</MenuItem>
                  )}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Meta" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Responsable" fullWidth size="small" defaultValue="" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB' }}>
            <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
            <Button
              variant="contained"
              onClick={() => setOpenDialog(false)}
              sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Registrar Medición */}
        <Dialog open={openMedicion} onClose={() => setOpenMedicion(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
            Registrar Medición
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Indicador" fullWidth size="small" select defaultValue="">
                  {INDICADORES_DATA.map(ind => <MenuItem key={ind.id} value={ind.id}>{ind.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Período" type="month" fullWidth size="small" InputLabelProps={{ shrink: true }} defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Valor Medido" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Observaciones" fullWidth size="small" multiline rows={2} defaultValue="" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB' }}>
            <Button onClick={() => setOpenMedicion(false)} color="inherit">Cancelar</Button>
            <Button
              variant="contained"
              onClick={() => setOpenMedicion(false)}
              sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}
            >
              Registrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
