import React, { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
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
  Grid,
  Switch,
  FormControlLabel,
  Tooltip,
  Divider,
  Badge,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  DragHandle,
  Description,
  DirectionsCar,
  Person,
  AccountBalance,
  PeopleAlt,
  FolderSpecial,
  CheckCircle,
  Draw,
  TextFields,
  Numbers,
  CalendarMonth,
  List as ListIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Mock data ────────────────────────────────────────────────────────────────

interface MetaField {
  id: number
  etiqueta: string
  tipo: 'texto' | 'numero' | 'fecha' | 'lista'
  obligatorio: boolean
}

interface TipoDoc {
  id: number
  nombre: string
  requiereFirma: boolean
  requiereAprobacion: boolean
  extensiones: string[]
  diasVigencia: number
  campos: MetaField[]
}

interface Categoria {
  id: number
  nombre: string
  codigo: string
  color: string
  icon: React.ReactElement
  tipos: TipoDoc[]
}

const CATEGORIAS: Categoria[] = [
  {
    id: 1, nombre: 'Contratos', codigo: 'CON', color: '#7C3AED',
    icon: <Description />,
    tipos: [
      { id: 101, nombre: 'Contrato Laboral', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'docx'], diasVigencia: 365, campos: [
        { id: 1, etiqueta: 'Número contrato', tipo: 'texto', obligatorio: true },
        { id: 2, etiqueta: 'Nombre empleado', tipo: 'texto', obligatorio: true },
        { id: 3, etiqueta: 'Salario mensual', tipo: 'numero', obligatorio: true },
        { id: 4, etiqueta: 'Fecha inicio', tipo: 'fecha', obligatorio: true },
      ]},
      { id: 102, nombre: 'Contrato Comercial', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'docx'], diasVigencia: 365, campos: [
        { id: 5, etiqueta: 'Número contrato', tipo: 'texto', obligatorio: true },
        { id: 6, etiqueta: 'Cliente / Empresa', tipo: 'texto', obligatorio: true },
        { id: 7, etiqueta: 'Valor contrato', tipo: 'numero', obligatorio: false },
      ]},
      { id: 103, nombre: 'Contrato de Servicios', requiereFirma: true, requiereAprobacion: false, extensiones: ['pdf'], diasVigencia: 180, campos: [] },
      { id: 104, nombre: 'Acuerdo de Confidencialidad (NDA)', requiereFirma: true, requiereAprobacion: false, extensiones: ['pdf', 'docx'], diasVigencia: 730, campos: [] },
      { id: 105, nombre: 'Otrosí / Adición', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf'], diasVigencia: 0, campos: [] },
      { id: 106, nombre: 'Contrato Arrendamiento', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf'], diasVigencia: 365, campos: [] },
      { id: 107, nombre: 'Contrato Marco', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'docx'], diasVigencia: 365, campos: [] },
      { id: 108, nombre: 'Promesa de Compraventa', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf'], diasVigencia: 90, campos: [] },
    ],
  },
  {
    id: 2, nombre: 'Vehículos', codigo: 'VEH', color: '#0E7490',
    icon: <DirectionsCar />,
    tipos: [
      { id: 201, nombre: 'SOAT', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'jpg'], diasVigencia: 365, campos: [
        { id: 10, etiqueta: 'Placa vehículo', tipo: 'texto', obligatorio: true },
        { id: 11, etiqueta: 'Número póliza', tipo: 'texto', obligatorio: true },
        { id: 12, etiqueta: 'Aseguradora', tipo: 'lista', obligatorio: true },
      ]},
      { id: 202, nombre: 'Revisión Técnico-Mecánica (RTM)', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf'], diasVigencia: 730, campos: [] },
      { id: 203, nombre: 'Tarjeta de Propiedad', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'jpg'], diasVigencia: 0, campos: [] },
      { id: 204, nombre: 'Seguro Todo Riesgo', requiereFirma: false, requiereAprobacion: true, extensiones: ['pdf'], diasVigencia: 365, campos: [] },
      { id: 205, nombre: 'Licencia de Tránsito', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'jpg'], diasVigencia: 365, campos: [] },
      { id: 206, nombre: 'Permiso de Operación', requiereFirma: false, requiereAprobacion: true, extensiones: ['pdf'], diasVigencia: 365, campos: [] },
    ],
  },
  {
    id: 3, nombre: 'Conductores', codigo: 'COD', color: '#D97706',
    icon: <Person />,
    tipos: [
      { id: 301, nombre: 'Licencia de Conducción', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'jpg'], diasVigencia: 1825, campos: [
        { id: 20, etiqueta: 'Número licencia', tipo: 'texto', obligatorio: true },
        { id: 21, etiqueta: 'Categoría', tipo: 'lista', obligatorio: true },
        { id: 22, etiqueta: 'Fecha vencimiento', tipo: 'fecha', obligatorio: true },
      ]},
      { id: 302, nombre: 'Examen Médico Ocupacional', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf'], diasVigencia: 365, campos: [] },
      { id: 303, nombre: 'Certificado Capacitación PESV', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf'], diasVigencia: 365, campos: [] },
      { id: 304, nombre: 'Antecedentes Judiciales', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'jpg'], diasVigencia: 90, campos: [] },
      { id: 305, nombre: 'Hoja de Vida', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'docx'], diasVigencia: 0, campos: [] },
    ],
  },
  {
    id: 4, nombre: 'Financiero', codigo: 'FIN', color: '#16A34A',
    icon: <AccountBalance />,
    tipos: [
      { id: 401, nombre: 'Factura de Venta', requiereFirma: false, requiereAprobacion: true, extensiones: ['pdf', 'xml'], diasVigencia: 0, campos: [] },
      { id: 402, nombre: 'Orden de Compra', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'xlsx'], diasVigencia: 0, campos: [] },
      { id: 403, nombre: 'Remesa de Transporte', requiereFirma: true, requiereAprobacion: false, extensiones: ['pdf'], diasVigencia: 0, campos: [] },
      { id: 404, nombre: 'Cuenta de Cobro', requiereFirma: false, requiereAprobacion: true, extensiones: ['pdf', 'docx'], diasVigencia: 0, campos: [] },
      { id: 405, nombre: 'Comprobante de Pago', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'jpg'], diasVigencia: 0, campos: [] },
      { id: 406, nombre: 'Estado de Cuenta', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf', 'xlsx'], diasVigencia: 0, campos: [] },
      { id: 407, nombre: 'Liquidación de Flete', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'xlsx'], diasVigencia: 0, campos: [] },
    ],
  },
  {
    id: 5, nombre: 'RR.HH.', codigo: 'RRH', color: '#DC2626',
    icon: <PeopleAlt />,
    tipos: [
      { id: 501, nombre: 'Colilla de Nómina', requiereFirma: false, requiereAprobacion: false, extensiones: ['pdf'], diasVigencia: 0, campos: [] },
      { id: 502, nombre: 'Incapacidad Médica', requiereFirma: false, requiereAprobacion: true, extensiones: ['pdf', 'jpg'], diasVigencia: 0, campos: [] },
      { id: 503, nombre: 'Solicitud de Vacaciones', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'docx'], diasVigencia: 0, campos: [] },
      { id: 504, nombre: 'Acta de Descargo', requiereFirma: true, requiereAprobacion: false, extensiones: ['pdf', 'docx'], diasVigencia: 0, campos: [] },
      { id: 505, nombre: 'Carta de Terminación', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf'], diasVigencia: 0, campos: [] },
      { id: 506, nombre: 'Certificado Laboral', requiereFirma: true, requiereAprobacion: false, extensiones: ['pdf'], diasVigencia: 90, campos: [] },
      { id: 507, nombre: 'Evaluación de Desempeño', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'xlsx'], diasVigencia: 0, campos: [] },
      { id: 508, nombre: 'Acuerdo de Teletrabajo', requiereFirma: true, requiereAprobacion: true, extensiones: ['pdf', 'docx'], diasVigencia: 365, campos: [] },
      { id: 509, nombre: 'Plan de Capacitación', requiereFirma: false, requiereAprobacion: true, extensiones: ['pdf', 'xlsx'], diasVigencia: 365, campos: [] },
    ],
  },
]

// ─── Tipo field icon ──────────────────────────────────────────────────────────

function TipoFieldIcon({ tipo }: { tipo: string }) {
  switch (tipo) {
    case 'texto':  return <TextFields sx={{ fontSize: 16, color: '#2563EB' }} />
    case 'numero': return <Numbers sx={{ fontSize: 16, color: '#16A34A' }} />
    case 'fecha':  return <CalendarMonth sx={{ fontSize: 16, color: '#D97706' }} />
    case 'lista':  return <ListIcon sx={{ fontSize: 16, color: '#7C3AED' }} />
    default: return <TextFields sx={{ fontSize: 16 }} />
  }
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function DialogNuevaCategoria({ open, onClose }: { open: boolean; onClose: () => void }) {
  const COLORES = ['#0E7490', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#2563EB', '#BE185D', '#374151']
  const [colorSel, setColorSel] = useState('#0E7490')

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva Categoría</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField label="Nombre de la categoría" size="small" fullWidth />
          <TextField label="Código (3 letras)" size="small" fullWidth inputProps={{ maxLength: 3 }} />
          <FormControl size="small" fullWidth>
            <InputLabel>Icono</InputLabel>
            <Select label="Icono" defaultValue="folder">
              <MenuItem value="folder">Carpeta general</MenuItem>
              <MenuItem value="description">Documento</MenuItem>
              <MenuItem value="car">Vehículo</MenuItem>
              <MenuItem value="person">Persona</MenuItem>
              <MenuItem value="finance">Financiero</MenuItem>
            </Select>
          </FormControl>
          <Box>
            <Typography fontSize={12} fontWeight={600} color="text.secondary" mb={1}>Color</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {COLORES.map((c) => (
                <Box
                  key={c}
                  onClick={() => setColorSel(c)}
                  sx={{
                    width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    border: colorSel === c ? `3px solid ${alpha(c, 0.5)}` : '2px solid transparent',
                    outline: colorSel === c ? `2px solid ${c}` : 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}

function DialogNuevoTipo({ open, onClose, categorias }: { open: boolean; onClose: () => void; categorias: string[] }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo Tipo de Documento</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mt={0.5}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Nombre del tipo" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select label="Categoría" defaultValue="">
                {categorias.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Días de vigencia (0 = sin vencimiento)" size="small" fullWidth type="number" defaultValue={365} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Extensiones permitidas</InputLabel>
              <Select label="Extensiones permitidas" multiple defaultValue={['pdf']} renderValue={(sel) => (sel as string[]).join(', ')}>
                {['pdf', 'docx', 'xlsx', 'jpg', 'png', 'xml'].map((ext) => (
                  <MenuItem key={ext} value={ext}>.{ext}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={3}>
              <FormControlLabel control={<Switch size="small" />} label={<Typography fontSize={13}>Requiere Firma</Typography>} />
              <FormControlLabel control={<Switch size="small" />} label={<Typography fontSize={13}>Requiere Aprobación</Typography>} />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DMSCategorias() {
  const [catSel, setCatSel] = useState<Categoria>(CATEGORIAS[0])
  const [tipoSel, setTipoSel] = useState<TipoDoc>(CATEGORIAS[0].tipos[0])
  const [catOpen, setCatOpen] = useState(false)
  const [tipoOpen, setTipoOpen] = useState(false)

  const TIPO_DATO_LABEL: Record<string, string> = {
    texto: 'Texto', numero: 'Número', fecha: 'Fecha', lista: 'Lista',
  }

  return (
    <Layout title="DMS — Categorías">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(DMS_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderSpecial sx={{ color: DMS_COLOR, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontSize={20} fontWeight={800}>Categorías y Tipos de Documento</Typography>
              <Typography fontSize={12} color="text.secondary">Configuración de categorías, tipos y campos de metadatos</Typography>
            </Box>
          </Stack>
        </Stack>

        {/* ── Three-panel layout ──────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ minHeight: 520 }}>

          {/* Panel izquierdo: Categorías */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography fontSize={13} fontWeight={700}>Categorías</Typography>
                <Button
                  size="small"
                  startIcon={<Add sx={{ fontSize: 14 }} />}
                  onClick={() => setCatOpen(true)}
                  sx={{ fontSize: 11, color: DMS_COLOR, fontWeight: 700, py: 0.25 }}
                >
                  Nueva
                </Button>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
                {CATEGORIAS.map((cat) => {
                  const isSelected = catSel.id === cat.id
                  return (
                    <Box
                      key={cat.id}
                      onClick={() => { setCatSel(cat); setTipoSel(cat.tipos[0]) }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 2, py: 1.25, mx: 0.75, cursor: 'pointer', borderRadius: '10px',
                        bgcolor: isSelected ? alpha(cat.color, 0.1) : 'transparent',
                        '&:hover': { bgcolor: isSelected ? alpha(cat.color, 0.12) : '#F9FAFB' },
                      }}
                    >
                      <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: isSelected ? alpha(cat.color, 0.2) : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {React.cloneElement(cat.icon, { sx: { fontSize: 18, color: isSelected ? cat.color : '#9CA3AF' } })}
                      </Box>
                      <Box flex={1} overflow="hidden">
                        <Typography fontSize={13} fontWeight={isSelected ? 700 : 500} color={isSelected ? cat.color : 'text.primary'} noWrap>
                          {cat.nombre}
                        </Typography>
                        <Typography fontSize={11} color="text.disabled">{cat.codigo}</Typography>
                      </Box>
                      <Badge badgeContent={cat.tipos.length} color="default" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18, bgcolor: isSelected ? alpha(cat.color, 0.15) : '#F3F4F6', color: isSelected ? cat.color : '#6B7280', fontWeight: 700 } }} />
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          </Grid>

          {/* Panel centro: Tipos de documento */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography fontSize={13} fontWeight={700}>Tipos</Typography>
                  <Chip label={catSel.nombre} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(catSel.color, 0.1), color: catSel.color, fontWeight: 700 }} />
                </Stack>
                <Button
                  size="small"
                  startIcon={<Add sx={{ fontSize: 14 }} />}
                  onClick={() => setTipoOpen(true)}
                  sx={{ fontSize: 11, color: DMS_COLOR, fontWeight: 700, py: 0.25 }}
                >
                  Nuevo
                </Button>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
                {catSel.tipos.map((tipo) => {
                  const isSelected = tipoSel?.id === tipo.id
                  return (
                    <Box
                      key={tipo.id}
                      onClick={() => setTipoSel(tipo)}
                      sx={{
                        px: 2, py: 1.25, mx: 0.75, cursor: 'pointer', borderRadius: '10px',
                        bgcolor: isSelected ? alpha(DMS_COLOR, 0.08) : 'transparent',
                        '&:hover': { bgcolor: isSelected ? alpha(DMS_COLOR, 0.1) : '#F9FAFB' },
                      }}
                    >
                      <Typography fontSize={13} fontWeight={isSelected ? 700 : 500} color={isSelected ? DMS_COLOR : 'text.primary'}>
                        {tipo.nombre}
                      </Typography>
                      <Stack direction="row" spacing={0.75} mt={0.5} flexWrap="wrap" gap={0.5}>
                        {tipo.requiereFirma && (
                          <Chip
                            icon={<Draw sx={{ fontSize: 11 }} />}
                            label="Requiere Firma"
                            size="small"
                            sx={{ fontSize: 9, height: 18, fontWeight: 700, bgcolor: alpha('#2563EB', 0.1), color: '#2563EB', '& .MuiChip-icon': { fontSize: 11, color: '#2563EB' } }}
                          />
                        )}
                        {tipo.requiereAprobacion && (
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: 11 }} />}
                            label="Requiere Aprobación"
                            size="small"
                            sx={{ fontSize: 9, height: 18, fontWeight: 700, bgcolor: alpha('#16A34A', 0.1), color: '#16A34A', '& .MuiChip-icon': { fontSize: 11, color: '#16A34A' } }}
                          />
                        )}
                        {tipo.diasVigencia > 0 && (
                          <Chip
                            label={`${tipo.diasVigencia}d vigencia`}
                            size="small"
                            sx={{ fontSize: 9, height: 18, fontWeight: 600, bgcolor: '#F3F4F6', color: '#6B7280' }}
                          />
                        )}
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          </Grid>

          {/* Panel derecho: Campos de metadatos */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography fontSize={13} fontWeight={700}>Campos de Metadatos</Typography>
                  {tipoSel && (
                    <Typography fontSize={11} color="text.secondary" noWrap>{tipoSel.nombre}</Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  startIcon={<Add sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: 11, color: DMS_COLOR, fontWeight: 700, py: 0.25 }}
                >
                  Campo
                </Button>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
                {tipoSel && tipoSel.campos.length > 0 ? (
                  <Stack spacing={1}>
                    {tipoSel.campos.map((campo) => (
                      <Box
                        key={campo.id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px',
                          '&:hover': { borderColor: alpha(DMS_COLOR, 0.4), '& .actions': { opacity: 1 } },
                        }}
                      >
                        {/* Drag handle */}
                        <DragHandle sx={{ fontSize: 18, color: '#D1D5DB', cursor: 'grab' }} />

                        {/* Field type icon */}
                        <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TipoFieldIcon tipo={campo.tipo} />
                        </Box>

                        {/* Info */}
                        <Box flex={1} overflow="hidden">
                          <Typography fontSize={13} fontWeight={600} noWrap>{campo.etiqueta}</Typography>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography fontSize={11} color="text.secondary">{TIPO_DATO_LABEL[campo.tipo]}</Typography>
                            {campo.obligatorio && (
                              <Chip label="Obligatorio" size="small" sx={{ fontSize: 9, height: 16, fontWeight: 700, bgcolor: alpha('#DC2626', 0.08), color: '#DC2626' }} />
                            )}
                          </Stack>
                        </Box>

                        {/* Actions */}
                        <Stack direction="row" spacing={0} className="actions" sx={{ opacity: 0, transition: 'opacity 0.15s' }}>
                          <Tooltip title="Editar"><IconButton size="small"><Edit sx={{ fontSize: 15, color: 'text.disabled' }} /></IconButton></Tooltip>
                          <Tooltip title="Eliminar"><IconButton size="small"><Delete sx={{ fontSize: 15, color: '#DC2626' }} /></IconButton></Tooltip>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', gap: 1 }}>
                    <Description sx={{ fontSize: 40, color: '#D1D5DB' }} />
                    <Typography fontSize={13} color="text.secondary" textAlign="center">
                      {tipoSel
                        ? 'Este tipo de documento no tiene campos de metadatos configurados'
                        : 'Selecciona un tipo de documento'}
                    </Typography>
                    {tipoSel && (
                      <Button size="small" startIcon={<Add />} sx={{ color: DMS_COLOR, fontSize: 12, mt: 1 }}>
                        Agregar primer campo
                      </Button>
                    )}
                  </Box>
                )}
              </Box>

              {/* Selector de tipo de dato (inline form) */}
              {tipoSel && tipoSel.campos.length > 0 && (
                <>
                  <Divider />
                  <Box sx={{ p: 1.5 }}>
                    <Typography fontSize={12} fontWeight={600} color="text.secondary" mb={1}>Agregar nuevo campo</Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField size="small" placeholder="Etiqueta del campo" sx={{ flex: 1, '& input': { fontSize: 12 } }} />
                      <FormControl size="small" sx={{ minWidth: 110 }}>
                        <Select defaultValue="texto" sx={{ fontSize: 12 }}>
                          <MenuItem value="texto" sx={{ fontSize: 12 }}>Texto</MenuItem>
                          <MenuItem value="numero" sx={{ fontSize: 12 }}>Número</MenuItem>
                          <MenuItem value="fecha" sx={{ fontSize: 12 }}>Fecha</MenuItem>
                          <MenuItem value="lista" sx={{ fontSize: 12 }}>Lista</MenuItem>
                        </Select>
                      </FormControl>
                      <Tooltip title="Agregar campo">
                        <IconButton size="small" sx={{ bgcolor: DMS_COLOR, color: '#fff', '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px', width: 34, height: 34 }}>
                          <Add sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <FormControlLabel
                      control={<Switch size="small" />}
                      label={<Typography fontSize={12} color="text.secondary">Campo obligatorio</Typography>}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ── Resumen rápido ──────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
          <Typography fontSize={13} fontWeight={700} mb={2}>Resumen de Configuración</Typography>
          <Grid container spacing={2}>
            {CATEGORIAS.map((cat) => (
              <Grid key={cat.id} size={{ xs: 12, sm: 6, md: 'auto' }} sx={{ flex: 1 }}>
                <Box sx={{ p: 1.5, border: `1px solid ${alpha(cat.color, 0.3)}`, borderRadius: '10px', bgcolor: alpha(cat.color, 0.04) }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    {React.cloneElement(cat.icon, { sx: { fontSize: 16, color: cat.color } })}
                    <Typography fontSize={12} fontWeight={700} color={cat.color}>{cat.nombre}</Typography>
                  </Stack>
                  <Typography fontSize={24} fontWeight={800} color={cat.color}>{cat.tipos.length}</Typography>
                  <Typography fontSize={11} color="text.secondary">tipos de documento</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography fontSize={11} color="text.disabled">
                    {cat.tipos.filter((t) => t.requiereFirma).length} con firma ·{' '}
                    {cat.tipos.filter((t) => t.requiereAprobacion).length} con aprobación
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

      </Box>

      {/* Dialogs */}
      <DialogNuevaCategoria open={catOpen} onClose={() => setCatOpen(false)} />
      <DialogNuevoTipo open={tipoOpen} onClose={() => setTipoOpen(false)} categorias={CATEGORIAS.map((c) => c.nombre)} />

    </Layout>
  )
}
