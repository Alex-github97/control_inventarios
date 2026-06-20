import React, { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  alpha,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material'
import {
  Description,
  Add,
  Search,
  Visibility,
  History,
  AccountTree,
  Draw,
  CheckCircle,
  Cancel,
  Schedule,
  FilterList,
  RestoreFromTrash,
  FolderOpen,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Estado config ────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  BORRADOR:    { label: 'Borrador',    bg: '#F3F4F6',              color: '#6B7280' },
  EN_REVISION: { label: 'En Revisión', bg: alpha('#D97706', 0.12), color: '#D97706' },
  APROBADO:    { label: 'Aprobado',    bg: alpha('#2563EB', 0.12), color: '#2563EB' },
  PUBLICADO:   { label: 'Publicado',   bg: alpha('#16A34A', 0.12), color: '#16A34A' },
  OBSOLETO:    { label: 'Obsoleto',    bg: alpha('#DC2626', 0.12), color: '#DC2626' },
  ARCHIVADO:   { label: 'Archivado',   bg: alpha('#92400E', 0.12), color: '#92400E' },
}

function EstadoChip({ estado, onClick }: { estado: string; onClick?: () => void }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <Chip
      label={cfg.label}
      size="small"
      onClick={onClick}
      sx={{ fontSize: 10, fontWeight: 700, bgcolor: cfg.bg, color: cfg.color, cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { opacity: 0.85 } : {} }}
    />
  )
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const TODOS_ESTADOS = ['BORRADOR', 'EN_REVISION', 'APROBADO', 'PUBLICADO', 'OBSOLETO', 'ARCHIVADO']

interface Documento {
  id: number
  codigo: string
  nombre: string
  categoria: string
  estado: string
  version: string
  vigenciaDesde: string
  vigenciaHasta: string
  vigente: boolean
  propietario: string
}

const DOCUMENTOS: Documento[] = [
  { id: 1,  codigo: 'CON-2026-001', nombre: 'Contrato Marco de Distribución Nacional',      categoria: 'Contratos',   estado: 'PUBLICADO',   version: 'v3.1', vigenciaDesde: '01/01/2026', vigenciaHasta: '31/12/2026', vigente: true,  propietario: 'Ana Gómez' },
  { id: 2,  codigo: 'POL-2026-002', nombre: 'Política de Seguridad Vial y PESV',            categoria: 'Políticas',   estado: 'EN_REVISION', version: 'v2.0', vigenciaDesde: '01/03/2026', vigenciaHasta: '28/02/2027', vigente: true,  propietario: 'Luis Torres' },
  { id: 3,  codigo: 'MAN-2026-003', nombre: 'Manual de Procedimientos Logísticos',          categoria: 'Manuales',    estado: 'APROBADO',    version: 'v1.4', vigenciaDesde: '15/02/2026', vigenciaHasta: '14/02/2027', vigente: true,  propietario: 'Mg. Rosa Díaz' },
  { id: 4,  codigo: 'ACU-2026-004', nombre: 'Acuerdo Confidencialidad Proveedor Alpha',     categoria: 'Acuerdos',    estado: 'BORRADOR',    version: 'v1.0', vigenciaDesde: '—',          vigenciaHasta: '—',          vigente: false, propietario: 'Carlos Mora' },
  { id: 5,  codigo: 'PRO-2026-005', nombre: 'Procedimiento Carga y Descarga de Mercancía', categoria: 'Procedimientos', estado: 'PUBLICADO', version: 'v5.2', vigenciaDesde: '01/04/2026', vigenciaHasta: '31/03/2027', vigente: true,  propietario: 'Pedro Ríos' },
  { id: 6,  codigo: 'REG-2025-006', nombre: 'Reglamento Interno de Trabajo 2025',          categoria: 'Reglamentos', estado: 'OBSOLETO',    version: 'v1.0', vigenciaDesde: '01/01/2025', vigenciaHasta: '31/12/2025', vigente: false, propietario: 'RRHH General' },
  { id: 7,  codigo: 'CER-2026-007', nombre: 'Certificado BASC Operador Económico',         categoria: 'Certificados', estado: 'PUBLICADO',  version: 'v1.0', vigenciaDesde: '01/05/2026', vigenciaHasta: '30/04/2027', vigente: true,  propietario: 'Calidad' },
  { id: 8,  codigo: 'FOR-2026-008', nombre: 'Formato de Inspección Pre-Operacional',       categoria: 'Formatos',    estado: 'ARCHIVADO',   version: 'v4.0', vigenciaDesde: '01/06/2025', vigenciaHasta: '31/05/2026', vigente: false, propietario: 'Flota' },
  { id: 9,  codigo: 'CON-2026-009', nombre: 'Contrato Laboral Conductor Tipo C',           categoria: 'Contratos',   estado: 'PUBLICADO',   version: 'v2.3', vigenciaDesde: '01/06/2026', vigenciaHasta: '31/05/2027', vigente: true,  propietario: 'RRHH Legal' },
  { id: 10, codigo: 'INF-2026-010', nombre: 'Informe de Gestión Primer Semestre',          categoria: 'Informes',    estado: 'EN_REVISION', version: 'v1.0', vigenciaDesde: '—',          vigenciaHasta: '—',          vigente: false, propietario: 'Gerencia' },
  { id: 11, codigo: 'PLI-2026-011', nombre: 'Póliza Seguro Responsabilidad Civil',         categoria: 'Pólizas',     estado: 'PUBLICADO',   version: 'v1.0', vigenciaDesde: '01/01/2026', vigenciaHasta: '31/12/2026', vigente: true,  propietario: 'Finanzas' },
  { id: 12, codigo: 'NOR-2026-012', nombre: 'Norma Interna de Uso de Equipos',             categoria: 'Normas',      estado: 'BORRADOR',    version: 'v1.0', vigenciaDesde: '—',          vigenciaHasta: '—',          vigente: false, propietario: 'TI' },
]

const VERSIONES_MOCK = [
  { num: 'v3.1', fecha: '15/06/2026', usuario: 'Ana Gómez',    comentario: 'Actualización de cláusulas de responsabilidad' },
  { num: 'v3.0', fecha: '01/03/2026', usuario: 'Luis Torres',  comentario: 'Revisión general y ajuste de tarifas' },
  { num: 'v2.1', fecha: '10/01/2026', usuario: 'Rosa Díaz',    comentario: 'Correcciones menores de redacción' },
  { num: 'v2.0', fecha: '01/01/2026', usuario: 'Carlos Mora',  comentario: 'Versión renovada para 2026' },
  { num: 'v1.0', fecha: '15/06/2025', usuario: 'Ana Gómez',    comentario: 'Versión inicial del documento' },
]

const FIRMANTES_MOCK = [
  { nombre: 'Ing. Roberto Sánchez', rol: 'Gerente General',       estado: 'FIRMADO',   fecha: '14/06/2026' },
  { nombre: 'Dra. Andrea Castro',   rol: 'Directora Jurídica',    estado: 'PENDIENTE', fecha: '—' },
  { nombre: 'Cta. María López',     rol: 'Contadora Principal',   estado: 'PENDIENTE', fecha: '—' },
]

const FLUJO_MOCK = [
  { etapa: 'Creación',           usuario: 'Carlos Mora',     fecha: '10/06/2026', estado: 'COMPLETADO' },
  { etapa: 'Revisión Técnica',   usuario: 'Luis Torres',     fecha: '12/06/2026', estado: 'COMPLETADO' },
  { etapa: 'Revisión Jurídica',  usuario: 'Dra. Andrea',     fecha: '—',          estado: 'EN_CURSO'   },
  { etapa: 'Aprobación Gerencia',usuario: 'Ing. Roberto',    fecha: '—',          estado: 'PENDIENTE'  },
  { etapa: 'Publicación',        usuario: 'Sistema DMS',     fecha: '—',          estado: 'PENDIENTE'  },
]

// ─── Dialog: Ver Documento ────────────────────────────────────────────────────

function DialogVerDocumento({ doc, open, onClose }: { doc: Documento | null; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState(0)
  if (!doc) return null
  const cfg = ESTADO_CONFIG[doc.estado] ?? { label: doc.estado, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography fontWeight={700} fontSize={16}>{doc.nombre}</Typography>
            <Typography fontSize={12} color="text.secondary" fontFamily="monospace">{doc.codigo}</Typography>
          </Box>
          <EstadoChip estado={doc.estado} />
        </Stack>
      </DialogTitle>
      <Box sx={{ borderBottom: '1px solid #E5E7EB', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: 12, minHeight: 40 } }}>
          <Tab label="Información" />
          <Tab label="Versiones" />
          <Tab label="Firmas" />
          <Tab label="Flujo" />
        </Tabs>
      </Box>
      <DialogContent sx={{ p: 3 }}>
        {tab === 0 && (
          <Grid container spacing={2}>
            {[
              ['Código', doc.codigo], ['Categoría', doc.categoria], ['Estado', doc.estado],
              ['Versión', doc.version], ['Propietario', doc.propietario],
              ['Vigencia desde', doc.vigenciaDesde], ['Vigencia hasta', doc.vigenciaHasta],
            ].map(([label, value]) => (
              <Grid key={label} size={{ xs: 12, sm: 6 }}>
                <Typography fontSize={11} color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>{label}</Typography>
                <Typography fontSize={13} mt={0.25}>{value}</Typography>
              </Grid>
            ))}
          </Grid>
        )}
        {tab === 1 && (
          <Stack spacing={1.5}>
            {VERSIONES_MOCK.map((v) => (
              <Box key={v.num} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label={v.num} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR }} />
                  <Box>
                    <Typography fontSize={12} fontWeight={600}>{v.comentario}</Typography>
                    <Typography fontSize={11} color="text.secondary">{v.usuario} · {v.fecha}</Typography>
                  </Box>
                </Stack>
                <Tooltip title="Restaurar versión">
                  <IconButton size="small" sx={{ color: 'text.disabled' }}><RestoreFromTrash sx={{ fontSize: 18 }} /></IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        )}
        {tab === 2 && (
          <Stack spacing={2}>
            {FIRMANTES_MOCK.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: f.estado === 'FIRMADO' ? alpha('#16A34A', 0.15) : '#F3F4F6', color: f.estado === 'FIRMADO' ? '#16A34A' : '#9CA3AF' }}>
                  {f.estado === 'FIRMADO' ? <CheckCircle sx={{ fontSize: 20 }} /> : <Schedule sx={{ fontSize: 20 }} />}
                </Avatar>
                <Box flex={1}>
                  <Typography fontSize={13} fontWeight={600}>{f.nombre}</Typography>
                  <Typography fontSize={11} color="text.secondary">{f.rol}</Typography>
                </Box>
                <Box textAlign="right">
                  <Chip label={f.estado === 'FIRMADO' ? 'Firmado' : 'Pendiente'} size="small"
                    sx={{ fontSize: 10, fontWeight: 700, bgcolor: f.estado === 'FIRMADO' ? alpha('#16A34A', 0.1) : '#F3F4F6', color: f.estado === 'FIRMADO' ? '#16A34A' : '#9CA3AF' }} />
                  {f.fecha !== '—' && <Typography fontSize={10} color="text.disabled" mt={0.25}>{f.fecha}</Typography>}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
        {tab === 3 && (
          <Stack spacing={1}>
            {FLUJO_MOCK.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: f.estado === 'COMPLETADO' ? alpha('#16A34A', 0.12) : f.estado === 'EN_CURSO' ? alpha(DMS_COLOR, 0.12) : '#F3F4F6',
                  }}>
                    {f.estado === 'COMPLETADO'
                      ? <CheckCircle sx={{ fontSize: 18, color: '#16A34A' }} />
                      : f.estado === 'EN_CURSO'
                      ? <Schedule sx={{ fontSize: 18, color: DMS_COLOR }} />
                      : <Cancel sx={{ fontSize: 18, color: '#D1D5DB' }} />
                    }
                  </Box>
                  {i < FLUJO_MOCK.length - 1 && <Box sx={{ width: 2, height: 20, bgcolor: '#E5E7EB', my: 0.25 }} />}
                </Box>
                <Box sx={{ py: 0.75 }}>
                  <Typography fontSize={13} fontWeight={600}>{f.etapa}</Typography>
                  <Typography fontSize={11} color="text.secondary">{f.usuario} {f.fecha !== '—' ? `· ${f.fecha}` : ''}</Typography>
                </Box>
                <Box ml="auto">
                  <Chip
                    label={f.estado === 'COMPLETADO' ? 'Completado' : f.estado === 'EN_CURSO' ? 'En curso' : 'Pendiente'}
                    size="small"
                    sx={{ fontSize: 10, fontWeight: 700,
                      bgcolor: f.estado === 'COMPLETADO' ? alpha('#16A34A', 0.1) : f.estado === 'EN_CURSO' ? alpha(DMS_COLOR, 0.1) : '#F3F4F6',
                      color: f.estado === 'COMPLETADO' ? '#16A34A' : f.estado === 'EN_CURSO' ? DMS_COLOR : '#9CA3AF',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Nuevo Documento (Stepper 3 pasos) ───────────────────────────────

const PASOS = ['Información básica', 'Metadatos', 'Archivo y vigencia']

function DialogNuevoDocumento({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [paso, setPaso] = useState(0)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo Documento</DialogTitle>
      <DialogContent>
        <Stepper activeStep={paso} sx={{ mb: 3 }}>
          {PASOS.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 12 } }}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {paso === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Código" size="small" fullWidth placeholder="CON-2026-XXX" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Nombre" size="small" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select label="Categoría" defaultValue="">
                  <MenuItem value="contratos">Contratos</MenuItem>
                  <MenuItem value="vehiculos">Vehículos</MenuItem>
                  <MenuItem value="conductores">Conductores</MenuItem>
                  <MenuItem value="financiero">Financiero</MenuItem>
                  <MenuItem value="rrhh">RR.HH.</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" defaultValue="">
                  <MenuItem value="contrato">Contrato</MenuItem>
                  <MenuItem value="politica">Política</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="formato">Formato</MenuItem>
                  <MenuItem value="certificado">Certificado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Carpeta</InputLabel>
                <Select label="Carpeta" defaultValue="">
                  <MenuItem value="corp">Documentos Corporativos</MenuItem>
                  <MenuItem value="vehiculos">Vehículos</MenuItem>
                  <MenuItem value="conductores">Conductores</MenuItem>
                  <MenuItem value="financiero">Financiero</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Descripción" size="small" fullWidth multiline rows={2} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel control={<Switch size="small" />} label={<Typography fontSize={13}>Documento confidencial</Typography>} />
            </Grid>
          </Grid>
        )}

        {paso === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Número de contrato / referencia" size="small" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Cliente o proveedor" size="small" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Placa vehículo (si aplica)" size="small" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Propietario / Responsable" size="small" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Área responsable</InputLabel>
                <Select label="Área responsable" defaultValue="">
                  <MenuItem value="comercial">Comercial</MenuItem>
                  <MenuItem value="operaciones">Operaciones</MenuItem>
                  <MenuItem value="rrhh">RR.HH.</MenuItem>
                  <MenuItem value="juridico">Jurídico</MenuItem>
                  <MenuItem value="finanzas">Finanzas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Monto (si aplica)" size="small" fullWidth type="number" />
            </Grid>
          </Grid>
        )}

        {paso === 2 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Fecha de vigencia — Desde" size="small" fullWidth type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Fecha de vigencia — Hasta" size="small" fullWidth type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  border: `2px dashed ${alpha(DMS_COLOR, 0.4)}`,
                  borderRadius: '12px',
                  p: 3,
                  textAlign: 'center',
                  bgcolor: alpha(DMS_COLOR, 0.03),
                  cursor: 'pointer',
                }}
              >
                <FolderOpen sx={{ fontSize: 36, color: alpha(DMS_COLOR, 0.5), mb: 1 }} />
                <Typography fontSize={13} color={DMS_COLOR} fontWeight={600}>Seleccionar archivo</Typography>
                <Typography fontSize={11} color="text.secondary" mt={0.25}>PDF, DOCX, XLSX — máx 20MB</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={2}>
                <FormControlLabel control={<Switch size="small" />} label={<Typography fontSize={13}>Requiere firma digital</Typography>} />
                <FormControlLabel control={<Switch size="small" />} label={<Typography fontSize={13}>Requiere aprobación</Typography>} />
              </Stack>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        {paso > 0 && <Button onClick={() => setPaso((p) => p - 1)}>Anterior</Button>}
        {paso < 2
          ? <Button variant="contained" onClick={() => setPaso((p) => p + 1)} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>Siguiente</Button>
          : <Button variant="contained" onClick={onClose} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>Guardar</Button>
        }
      </DialogActions>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DMSDocumentos() {
  const [busqueda, setBusqueda] = useState('')
  const [estadosFiltro, setEstadosFiltro] = useState<string[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [verDoc, setVerDoc] = useState<Documento | null>(null)
  const [versionesDoc, setVersionesDoc] = useState<Documento | null>(null)

  const toggleEstado = (e: string) => setEstadosFiltro((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])

  const filtered = DOCUMENTOS.filter((d) => {
    const matchBusqueda = busqueda === '' || d.nombre.toLowerCase().includes(busqueda.toLowerCase()) || d.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado = estadosFiltro.length === 0 || estadosFiltro.includes(d.estado)
    const matchCat = categoriaFiltro === '' || d.categoria === categoriaFiltro
    return matchBusqueda && matchEstado && matchCat
  })

  const categorias = Array.from(new Set(DOCUMENTOS.map((d) => d.categoria)))

  return (
    <Layout title="DMS — Documentos">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(DMS_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Description sx={{ color: DMS_COLOR, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontSize={20} fontWeight={800}>Gestión de Documentos</Typography>
              <Typography fontSize={12} color="text.secondary">Repositorio centralizado de documentos empresariales</Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNuevoOpen(true)}
            sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px', fontSize: 13 }}
          >
            Nuevo Documento
          </Button>
        </Stack>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ fontSize: 18, color: 'text.disabled', mr: 0.5 }} /> }}
              sx={{ minWidth: 260 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Categoría</InputLabel>
              <Select label="Categoría" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {categorias.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />
              {TODOS_ESTADOS.map((e) => {
                const cfg = ESTADO_CONFIG[e]
                const activo = estadosFiltro.includes(e)
                return (
                  <Chip
                    key={e}
                    label={cfg.label}
                    size="small"
                    onClick={() => toggleEstado(e)}
                    sx={{
                      fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      bgcolor: activo ? cfg.bg : '#F9FAFB',
                      color: activo ? cfg.color : '#9CA3AF',
                      border: `1px solid ${activo ? cfg.color : '#E5E7EB'}`,
                    }}
                  />
                )
              })}
            </Box>
          </Stack>
        </Paper>

        {/* ── Tabla ─────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1.25, bgcolor: '#FAFAFA' } }}>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell>Vigencia</TableCell>
                  <TableCell>Propietario</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>
                      No se encontraron documentos con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : filtered.map((doc) => (
                  <TableRow key={doc.id} hover sx={{ '& td': { fontSize: 12, py: 1 } }}>
                    <TableCell sx={{ fontWeight: 700, color: DMS_COLOR, fontFamily: 'monospace', fontSize: 11 }}>{doc.codigo}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography fontSize={12} noWrap fontWeight={500}>{doc.nombre}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={11} color="text.secondary">{doc.categoria}</Typography>
                    </TableCell>
                    <TableCell>
                      <EstadoChip
                        estado={doc.estado}
                        onClick={doc.estado === 'BORRADOR' ? () => {} : undefined}
                      />
                      {doc.estado === 'BORRADOR' && (
                        <Typography fontSize={10} color={DMS_COLOR} mt={0.25} sx={{ cursor: 'pointer' }}>
                          → Enviar a revisión
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={doc.version} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(DMS_COLOR, 0.08), color: DMS_COLOR, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={doc.vigente ? 'Vigente' : 'Vencido'}
                        size="small"
                        sx={{ fontSize: 10, height: 20, fontWeight: 700,
                          bgcolor: doc.vigente ? alpha('#16A34A', 0.1) : alpha('#DC2626', 0.1),
                          color: doc.vigente ? '#16A34A' : '#DC2626',
                        }}
                      />
                      {doc.vigenciaHasta !== '—' && (
                        <Typography fontSize={10} color="text.disabled" mt={0.25}>hasta {doc.vigenciaHasta}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{doc.propietario}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25} justifyContent="center">
                        <Tooltip title="Ver documento"><IconButton size="small" onClick={() => setVerDoc(doc)}><Visibility sx={{ fontSize: 16, color: DMS_COLOR }} /></IconButton></Tooltip>
                        <Tooltip title="Ver versiones"><IconButton size="small" onClick={() => setVersionesDoc(doc)}><History sx={{ fontSize: 16, color: '#6B7280' }} /></IconButton></Tooltip>
                        <Tooltip title="Ver flujo"><IconButton size="small"><AccountTree sx={{ fontSize: 16, color: '#6B7280' }} /></IconButton></Tooltip>
                        <Tooltip title="Firmar"><IconButton size="small"><Draw sx={{ fontSize: 16, color: '#2563EB' }} /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #F3F4F6' }}>
            <Typography fontSize={12} color="text.secondary">
              {filtered.length} de {DOCUMENTOS.length} documentos
            </Typography>
          </Box>
        </Paper>

      </Box>

      {/* Dialogs */}
      <DialogNuevoDocumento open={nuevoOpen} onClose={() => setNuevoOpen(false)} />
      <DialogVerDocumento doc={verDoc} open={!!verDoc} onClose={() => setVerDoc(null)} />

      {/* Dialog versiones independiente */}
      <Dialog open={!!versionesDoc} onClose={() => setVersionesDoc(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Versiones — {versionesDoc?.nombre}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} mt={1}>
            {VERSIONES_MOCK.map((v) => (
              <Box key={v.num} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label={v.num} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR }} />
                  <Box>
                    <Typography fontSize={12} fontWeight={600}>{v.comentario}</Typography>
                    <Typography fontSize={11} color="text.secondary">{v.usuario} · {v.fecha}</Typography>
                  </Box>
                </Stack>
                <Tooltip title="Restaurar esta versión">
                  <IconButton size="small"><RestoreFromTrash sx={{ fontSize: 18, color: 'text.disabled' }} /></IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setVersionesDoc(null)} sx={{ color: 'text.secondary' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Layout>
  )
}
