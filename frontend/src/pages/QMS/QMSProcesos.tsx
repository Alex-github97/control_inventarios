// QMS Module - Procesos
import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Typography, Chip, Button, Card, CardContent, Grid,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Stack, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Tooltip, alpha,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import VerifiedIcon from '@mui/icons-material/Verified'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import MapIcon from '@mui/icons-material/Map'

const QMS_COLOR = '#059669'
const QMS_COLOR_DARK = '#047857'

interface Proceso {
  codigo: string
  nombre: string
  tipo: string
  responsable: string
  norma: string
  estado: string
}

interface Procedimiento {
  codigo: string
  nombre: string
  proceso: string
  version: string
  estado: string
  vigencia: string
}

interface ProcesoVisual {
  nombre: string
  responsable: string
  estado: string
}

const PROCESOS_DATA: Proceso[] = [
  { codigo: 'PE-001', nombre: 'Planeación Estratégica', tipo: 'ESTRATÉGICO', responsable: 'Gerencia', norma: 'ISO 9001', estado: 'ACTIVO' },
  { codigo: 'PE-002', nombre: 'Gestión Comercial', tipo: 'ESTRATÉGICO', responsable: 'Dir. Comercial', norma: 'ISO 9001', estado: 'ACTIVO' },
  { codigo: 'PM-001', nombre: 'Recepción y Almacenamiento', tipo: 'MISIONAL', responsable: 'Jefe WMS', norma: 'ISO 28000', estado: 'ACTIVO' },
  { codigo: 'PM-002', nombre: 'Transporte Nacional', tipo: 'MISIONAL', responsable: 'Jefe TMS', norma: 'ISO 28000', estado: 'ACTIVO' },
  { codigo: 'PA-001', nombre: 'Gestión de RRHH', tipo: 'APOYO', responsable: 'Dir. RRHH', norma: 'ISO 45001', estado: 'ACTIVO' },
  { codigo: 'PE-003', nombre: 'Auditoría Interna', tipo: 'EVALUACIÓN', responsable: 'Coord. Calidad', norma: 'ISO 9001', estado: 'ACTIVO' },
]

const PROCEDIMIENTOS_DATA: Procedimiento[] = [
  { codigo: 'PR-WMS-001', nombre: 'Recepción de mercancía', proceso: 'Recepción y Almacenamiento', version: '3.0', estado: 'VIGENTE', vigencia: '2027-01-01' },
  { codigo: 'PR-TMS-001', nombre: 'Despacho de carga', proceso: 'Transporte Nacional', version: '2.1', estado: 'VIGENTE', vigencia: '2026-12-31' },
  { codigo: 'PR-CAL-001', nombre: 'Control de NC', proceso: 'Gestión de Calidad', version: '4.0', estado: 'VIGENTE', vigencia: '2027-06-01' },
  { codigo: 'PR-CAL-002', nombre: 'Auditoría Interna', proceso: 'Auditoría Interna', version: '2.0', estado: 'EN REVISIÓN', vigencia: '2026-09-30' },
  { codigo: 'PR-RRHH-001', nombre: 'Selección de personal', proceso: 'Gestión de RRHH', version: '1.5', estado: 'VIGENTE', vigencia: '2027-03-15' },
]

const estadoColor: Record<string, string> = {
  ACTIVO: '#059669',
  INACTIVO: '#6B7280',
  VIGENTE: '#059669',
  'EN REVISIÓN': '#F59E0B',
  OBSOLETO: '#EF4444',
}

const tipoColor: Record<string, string> = {
  ESTRATÉGICO: '#1E3A5F',
  MISIONAL: '#059669',
  APOYO: '#4B5563',
  EVALUACIÓN: '#D97706',
}

const MAPA_VISUAL: Record<string, { color: string; bg: string; procesos: ProcesoVisual[] }> = {
  'PROCESOS ESTRATÉGICOS': {
    color: '#fff',
    bg: '#1E3A5F',
    procesos: [
      { nombre: 'Planeación Estratégica', responsable: 'Gerencia', estado: 'ACTIVO' },
      { nombre: 'Gestión Comercial', responsable: 'Dir. Comercial', estado: 'ACTIVO' },
      { nombre: 'Gestión de Calidad', responsable: 'Coord. Calidad', estado: 'ACTIVO' },
    ],
  },
  'PROCESOS MISIONALES': {
    color: '#fff',
    bg: '#047857',
    procesos: [
      { nombre: 'Recepción/Almacenamiento', responsable: 'Jefe WMS', estado: 'ACTIVO' },
      { nombre: 'Transporte Nacional', responsable: 'Jefe TMS', estado: 'ACTIVO' },
      { nombre: 'Distribución Local', responsable: 'Jefe Distribución', estado: 'ACTIVO' },
    ],
  },
  'PROCESOS DE APOYO': {
    color: '#fff',
    bg: '#374151',
    procesos: [
      { nombre: 'RRHH', responsable: 'Dir. RRHH', estado: 'ACTIVO' },
      { nombre: 'Tecnología', responsable: 'Dir. TI', estado: 'ACTIVO' },
      { nombre: 'Financiero', responsable: 'Dir. Financiero', estado: 'ACTIVO' },
      { nombre: 'Compras', responsable: 'Jefe Compras', estado: 'ACTIVO' },
      { nombre: 'Mantenimiento', responsable: 'Jefe Mant.', estado: 'ACTIVO' },
    ],
  },
  'PROCESOS DE EVALUACIÓN': {
    color: '#1F2937',
    bg: '#FDE68A',
    procesos: [
      { nombre: 'Auditoría Interna', responsable: 'Coord. Calidad', estado: 'ACTIVO' },
      { nombre: 'Medición y Análisis', responsable: 'Analista Calidad', estado: 'ACTIVO' },
      { nombre: 'Mejora Continua', responsable: 'Dir. Calidad', estado: 'ACTIVO' },
    ],
  },
}

const TIPOS = ['ESTRATÉGICO', 'MISIONAL', 'APOYO', 'EVALUACIÓN']

export default function QMSProcesos() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [filterTipo, setFilterTipo] = useState<string>('TODOS')

  const form = {
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: '',
    procesoPadre: '',
    responsable: '',
    objetivo: '',
    alcance: '',
    norma: '',
  }

  const filteredProcesos = filterTipo === 'TODOS'
    ? PROCESOS_DATA
    : PROCESOS_DATA.filter(p => p.tipo === filterTipo)

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Stack direction="row" alignItems="center" gap={2}>
            <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: QMS_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccountTreeIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                Mapa de Procesos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestión y caracterización de procesos del SGC
              </Typography>
            </Box>
            <Chip
              label="QMS"
              size="small"
              sx={{ background: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, borderRadius: '8px' }}
            />
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}
          >
            Nuevo Proceso
          </Button>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { minWidth: 140, fontWeight: 600 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}
        >
          <Tab icon={<MapIcon fontSize="small" />} iconPosition="start" label="Mapa Visual" />
          <Tab icon={<AccountTreeIcon fontSize="small" />} iconPosition="start" label="Lista de Procesos" />
          <Tab icon={<DescriptionIcon fontSize="small" />} iconPosition="start" label="Procedimientos" />
        </Tabs>

        {/* Tab 0: Mapa Visual */}
        {tab === 0 && (
          <Stack gap={2}>
            {Object.entries(MAPA_VISUAL).map(([categoria, config]) => (
              <Paper
                key={categoria}
                elevation={0}
                sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}
              >
                <Box sx={{ px: 3, py: 1.5, background: config.bg }}>
                  <Typography variant="subtitle2" fontWeight={800} color={config.color} letterSpacing={1} fontSize={11}>
                    {categoria}
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    {config.procesos.map(proc => (
                      <Grid key={proc.nombre} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <Card
                          elevation={0}
                          sx={{
                            border: '1px solid',
                            borderColor: alpha(config.bg, 0.3),
                            borderRadius: '10px',
                            p: 0,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: config.bg, boxShadow: `0 0 0 2px ${alpha(config.bg, 0.2)}` },
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" mb={0.5}>
                              {proc.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                              {proc.responsable}
                            </Typography>
                            <Chip
                              label={proc.estado}
                              size="small"
                              sx={{ fontSize: 9, height: 18, bgcolor: alpha(estadoColor[proc.estado] || QMS_COLOR, 0.15), color: estadoColor[proc.estado] || QMS_COLOR, fontWeight: 700 }}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Tab 1: Lista de Procesos */}
        {tab === 1 && (
          <Box>
            <Stack direction="row" gap={1} mb={2} flexWrap="wrap">
              {['TODOS', ...TIPOS].map(tipo => (
                <Chip
                  key={tipo}
                  label={tipo}
                  size="small"
                  clickable
                  onClick={() => setFilterTipo(tipo)}
                  sx={{
                    fontWeight: 600,
                    fontSize: 11,
                    bgcolor: filterTipo === tipo ? QMS_COLOR : alpha(QMS_COLOR, 0.08),
                    color: filterTipo === tipo ? '#fff' : 'text.secondary',
                    '&:hover': { bgcolor: filterTipo === tipo ? QMS_COLOR_DARK : alpha(QMS_COLOR, 0.15) },
                  }}
                />
              ))}
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', bgcolor: alpha(QMS_COLOR, 0.04) } }}>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Norma ISO</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProcesos.map(row => (
                    <TableRow key={row.codigo} hover>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700} color={QMS_COLOR}>{row.codigo}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{row.nombre}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          label={row.tipo}
                          size="small"
                          sx={{ fontSize: 9, height: 20, fontWeight: 600, color: '#fff', bgcolor: tipoColor[row.tipo] || '#6B7280' }}
                        />
                      </TableCell>
                      <TableCell><Typography variant="body2">{row.responsable}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.norma}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          label={row.estado}
                          size="small"
                          sx={{ fontSize: 10, height: 20, fontWeight: 600, color: '#fff', bgcolor: estadoColor[row.estado] || '#6B7280' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="Ver"><IconButton size="small" sx={{ color: QMS_COLOR }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Editar"><IconButton size="small" sx={{ color: '#3B82F6' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Inactivar"><IconButton size="small" sx={{ color: '#EF4444' }}><BlockIcon fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Procedimientos */}
        {tab === 2 && (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', bgcolor: alpha(QMS_COLOR, 0.04) } }}>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Proceso</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha Vigencia</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PROCEDIMIENTOS_DATA.map(row => (
                  <TableRow key={row.codigo} hover>
                    <TableCell>
                      <Typography variant="caption" fontWeight={700} color={QMS_COLOR}>{row.codigo}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{row.nombre}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{row.proceso}</Typography></TableCell>
                    <TableCell>
                      <Chip label={`v${row.version}`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.estado}
                        size="small"
                        sx={{ fontSize: 10, height: 20, fontWeight: 600, color: '#fff', bgcolor: estadoColor[row.estado] || '#6B7280' }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2">{row.vigencia}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Ver"><IconButton size="small" sx={{ color: QMS_COLOR }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Editar"><IconButton size="small" sx={{ color: '#3B82F6' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog: Nuevo Proceso */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
            Registrar Nuevo Proceso
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Código" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField label="Nombre del Proceso" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción" fullWidth size="small" multiline rows={2} defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Tipo" fullWidth size="small" select defaultValue="">
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Proceso Padre" fullWidth size="small" select defaultValue="">
                  {PROCESOS_DATA.map(p => <MenuItem key={p.codigo} value={p.codigo}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Responsable" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Norma ISO" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Objetivo" fullWidth size="small" multiline rows={2} defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Alcance" fullWidth size="small" multiline rows={2} defaultValue="" />
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
              Guardar Proceso
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
