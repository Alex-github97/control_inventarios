import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Paper,
  alpha,
  Grid,
  Avatar,
  Button,
  TextField,
  Divider,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Tooltip,
  IconButton,
  Alert,
} from '@mui/material'
import {
  Settings,
  Storage,
  Security,
  Notifications,
  Category,
  CheckCircle,
  Cancel,
  CloudQueue,
  Business,
  Language,
  AccessTime,
  Description,
  Add,
  DeleteOutline,
  OpenInNew,
  NotificationsActive,
  Email,
  PhoneAndroid,
  WhatsApp,
  Lock,
  Visibility,
  Edit,
  Draw,
  ThumbUp,
  FolderOpen,
  Tune,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const EXTENSIONES_INICIALES = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP']

const PROVEEDORES_STORAGE = [
  { id: 'local', nombre: 'Almacenamiento Local', descripcion: 'Servidor on-premise ICOLTRANS', color: DMS_COLOR, activo: true, icon: <Storage /> },
  { id: 'aws', nombre: 'AWS S3', descripcion: 'Amazon Simple Storage Service', color: '#FF9900', activo: false, icon: <CloudQueue /> },
  { id: 'azure', nombre: 'Azure Blob Storage', descripcion: 'Microsoft Azure Cloud Storage', color: '#0078D4', activo: false, icon: <CloudQueue /> },
  { id: 'gcs', nombre: 'Google Cloud Storage', descripcion: 'Google Cloud Platform', color: '#4285F4', activo: false, icon: <CloudQueue /> },
]

const CARPETAS_USO = [
  { carpeta: '/contratos/comercial/', documentos: 127, tamaño: '892 MB' },
  { carpeta: '/expedientes/hcm/', documentos: 234, tamaño: '641 MB' },
  { carpeta: '/flota/documentos/', documentos: 89, tamaño: '312 MB' },
  { carpeta: '/tms/poded/', documentos: 567, tamaño: '287 MB' },
  { carpeta: '/calidad/procedimientos/', documentos: 56, tamaño: '198 MB' },
]

const ROLES_PERMISOS = [
  { rol: 'Administrador DMS', ver: true, descargar: true, crear: true, aprobar: true, firmar: true },
  { rol: 'Gerente / Director', ver: true, descargar: true, crear: true, aprobar: true, firmar: true },
  { rol: 'Coordinador', ver: true, descargar: true, crear: true, aprobar: false, firmar: true },
  { rol: 'Analista / Profesional', ver: true, descargar: true, crear: true, aprobar: false, firmar: false },
  { rol: 'Operativo', ver: true, descargar: false, crear: false, aprobar: false, firmar: false },
  { rol: 'Cliente Externo', ver: true, descargar: false, crear: false, aprobar: false, firmar: false },
]

// ─── TabPanel ─────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  )
}

// ─── Tab 1: General ───────────────────────────────────────────────────────────

function TabGeneral() {
  const [maxFileSize, setMaxFileSize] = useState<number>(50)
  const [autoCodigo, setAutoCodigo] = useState(true)
  const [extensiones, setExtensiones] = useState(EXTENSIONES_INICIALES)
  const [newExt, setNewExt] = useState('')

  const addExt = () => {
    if (newExt && !extensiones.includes(newExt.toUpperCase())) {
      setExtensiones(prev => [...prev, newExt.toUpperCase()])
      setNewExt('')
    }
  }

  return (
    <Stack gap={3}>
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Información de la Organización</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label="Nombre en el DMS" defaultValue="ICOLTRANS — Sistema Documental" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Zona horaria</InputLabel>
                <Select defaultValue="America/Bogota" label="Zona horaria">
                  <MenuItem value="America/Bogota">América/Bogotá (UTC-5)</MenuItem>
                  <MenuItem value="America/Caracas">América/Caracas (UTC-4)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Idioma</InputLabel>
                <Select defaultValue="es_CO" label="Idioma">
                  <MenuItem value="es_CO">Español (Colombia)</MenuItem>
                  <MenuItem value="es_ES">Español (España)</MenuItem>
                  <MenuItem value="en_US">English (US)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label="NIT de la organización" defaultValue="860.502.609-0" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Código de Documentos</Typography>
          <FormControlLabel
            control={<Switch checked={autoCodigo} onChange={e => setAutoCodigo(e.target.checked)} sx={{ '& .Mui-checked': { color: DMS_COLOR } }} />}
            label="Código automático habilitado"
          />
          <Box sx={{ mt: 2, p: 2, bgcolor: alpha(DMS_COLOR, 0.06), borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Formato del código automático:
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Chip label="Prefijo" sx={{ bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 700 }} />
              <Typography variant="body2" fontWeight={700}>DOC</Typography>
              <Chip label="Año" sx={{ bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', fontWeight: 700 }} />
              <Typography variant="body2" fontWeight={700}>2026</Typography>
              <Chip label="Secuencial" sx={{ bgcolor: alpha('#059669', 0.1), color: '#059669', fontWeight: 700 }} />
              <Typography variant="body2" fontWeight={700}>000001</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Ejemplo: <strong>DOC-2026-000001</strong>
            </Typography>
          </Box>
          {autoCodigo && (
            <Grid container spacing={2} mt={1}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Prefijo" defaultValue="DOC" inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Separador" defaultValue="-" inputProps={{ maxLength: 3 }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Dígitos secuenciales" defaultValue="6" type="number" />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Límites de Archivo</Typography>
          <Box mb={1}>
            <Stack direction="row" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Tamaño máximo por archivo</Typography>
              <Typography variant="body2" fontWeight={700} color={DMS_COLOR}>{maxFileSize} MB</Typography>
            </Stack>
            <Slider
              value={maxFileSize}
              onChange={(_, v) => setMaxFileSize(v as number)}
              min={5}
              max={500}
              step={5}
              marks={[{ value: 5, label: '5' }, { value: 100, label: '100' }, { value: 250, label: '250' }, { value: 500, label: '500 MB' }]}
              sx={{ color: DMS_COLOR }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Configuración actual: máximo {maxFileSize} MB por documento. Aplica a todos los tipos de archivo.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Extensiones Permitidas</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
            {extensiones.map(ext => (
              <Chip
                key={ext}
                label={ext}
                onDelete={() => setExtensiones(prev => prev.filter(e => e !== ext))}
                deleteIcon={<DeleteOutline />}
                sx={{ bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 700 }}
              />
            ))}
          </Stack>
          <Stack direction="row" gap={1}>
            <TextField
              size="small"
              placeholder="Nueva extensión (ej: TIFF)"
              value={newExt}
              onChange={e => setNewExt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExt()}
              sx={{ flex: 1, maxWidth: 200 }}
              inputProps={{ maxLength: 10 }}
            />
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={addExt} sx={{ borderColor: DMS_COLOR, color: DMS_COLOR }}>
              Agregar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Button variant="contained" sx={{ alignSelf: 'flex-start', bgcolor: DMS_COLOR }}>
        Guardar configuración general
      </Button>
    </Stack>
  )
}

// ─── Tab 2: Almacenamiento ─────────────────────────────────────────────────────

function TabAlmacenamiento() {
  return (
    <Stack gap={3}>
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Proveedor de Almacenamiento</Typography>
          <Grid container spacing={2}>
            {PROVEEDORES_STORAGE.map(prov => (
              <Grid key={prov.id} size={{ xs: 12, sm: 6 }}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `2px solid ${prov.activo ? prov.color : '#e2e8f0'}`,
                    bgcolor: prov.activo ? alpha(prov.color, 0.04) : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: prov.color, bgcolor: alpha(prov.color, 0.04) },
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <Avatar sx={{ bgcolor: prov.activo ? alpha(prov.color, 0.15) : 'grey.100', color: prov.activo ? prov.color : 'text.disabled' }}>
                      {prov.icon}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="subtitle2" fontWeight={700}>{prov.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{prov.descripcion}</Typography>
                    </Box>
                    {prov.activo ? (
                      <Chip label="Activo" size="small" sx={{ bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontWeight: 700, fontSize: '0.65rem' }} />
                    ) : (
                      <Chip label="No configurado" size="small" sx={{ bgcolor: 'grey.100', color: 'text.disabled', fontSize: '0.65rem' }} />
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={700}>Uso de Almacenamiento</Typography>
            <Typography variant="body2" fontWeight={700} color={DMS_COLOR}>2.4 GB / 50 GB</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={4.8}
            sx={{ height: 12, borderRadius: 6, mb: 1, bgcolor: alpha(DMS_COLOR, 0.12), '& .MuiLinearProgress-bar': { bgcolor: DMS_COLOR, borderRadius: 6 } }}
          />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">4.8% utilizado</Typography>
            <Typography variant="caption" color="text.secondary">47.6 GB disponibles</Typography>
          </Stack>

          <Typography variant="subtitle2" fontWeight={700} mt={3} mb={1}>Carpetas con mayor uso</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.06) } }}>
                  <TableCell>Carpeta</TableCell>
                  <TableCell align="right">Documentos</TableCell>
                  <TableCell align="right">Tamaño</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CARPETAS_USO.map((row, i) => (
                  <TableRow key={i} hover sx={{ '& td': { py: 0.75, fontSize: '0.78rem' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important' }}>{row.carpeta}</TableCell>
                    <TableCell align="right">{row.documentos}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{row.tamaño}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}

// ─── Tab 3: Seguridad ─────────────────────────────────────────────────────────

function TabSeguridad() {
  const [toggles, setToggles] = useState({
    marcaAgua: true,
    restriccionDescarga: true,
    cifrado: true,
    autenticacion2fa: false,
  })
  const [retencion, setRetencion] = useState('90')
  const [permisos, setPermisos] = useState(ROLES_PERMISOS)

  const togglePermiso = (rolIdx: number, permiso: string) => {
    setPermisos(prev =>
      prev.map((r, i) => (i === rolIdx ? { ...r, [permiso]: !r[permiso as keyof typeof r] } : r))
    )
  }

  return (
    <Stack gap={3}>
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Configuración de Seguridad</Typography>
          <Stack gap={1}>
            {[
              { key: 'marcaAgua', label: 'Marca de agua en documentos descargados', desc: 'Aplica marca de agua con nombre de usuario y fecha' },
              { key: 'restriccionDescarga', label: 'Restricción de descarga por rol', desc: 'Solo roles con permiso de descarga pueden guardar archivos' },
              { key: 'cifrado', label: 'Cifrado en reposo (AES-256)', desc: 'Todos los documentos almacenados se cifran automáticamente' },
              { key: 'autenticacion2fa', label: 'Autenticación 2FA para firmas electrónicas', desc: 'Requiere código OTP para validar firmas en documentos' },
            ].map(({ key, label, desc }) => (
              <Paper key={key} sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{desc}</Typography>
                  </Box>
                  <Switch
                    checked={toggles[key as keyof typeof toggles]}
                    onChange={e => setToggles(prev => ({ ...prev, [key]: e.target.checked }))}
                    sx={{ '& .Mui-checked': { color: DMS_COLOR }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: DMS_COLOR } }}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1" fontWeight={700}>Control de Acceso por Rol (RBAC)</Typography>
            <Typography variant="caption" color="text.secondary">Permisos documentales</Typography>
          </Stack>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.06), whiteSpace: 'nowrap' } }}>
                  <TableCell>Rol</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver documentos"><Box><Visibility sx={{ fontSize: 16 }} /></Box></Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Descargar"><Box><FolderOpen sx={{ fontSize: 16 }} /></Box></Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Crear"><Box><Edit sx={{ fontSize: 16 }} /></Box></Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Aprobar"><Box><ThumbUp sx={{ fontSize: 16 }} /></Box></Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Firmar"><Box><Draw sx={{ fontSize: 16 }} /></Box></Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permisos.map((row, rolIdx) => (
                  <TableRow key={row.rol} hover sx={{ '& td': { py: 0.5 } }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{row.rol}</TableCell>
                    {(['ver', 'descargar', 'crear', 'aprobar', 'firmar'] as const).map(permiso => (
                      <TableCell key={permiso} align="center">
                        <Checkbox
                          checked={row[permiso]}
                          onChange={() => togglePermiso(rolIdx, permiso)}
                          size="small"
                          sx={{ p: 0.5, '&.Mui-checked': { color: DMS_COLOR } }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Retención de Papelera</Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Días de retención</InputLabel>
            <Select value={retencion} onChange={e => setRetencion(e.target.value)} label="Días de retención">
              <MenuItem value="30">30 días</MenuItem>
              <MenuItem value="60">60 días</MenuItem>
              <MenuItem value="90">90 días</MenuItem>
              <MenuItem value="180">180 días</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Los documentos eliminados se conservan en papelera por {retencion} días antes de eliminarse definitivamente.
          </Typography>
        </CardContent>
      </Card>

      <Button variant="contained" sx={{ alignSelf: 'flex-start', bgcolor: DMS_COLOR }}>
        Guardar configuración de seguridad
      </Button>
    </Stack>
  )
}

// ─── Tab 4: Notificaciones ────────────────────────────────────────────────────

function TabNotificaciones() {
  const [toggles, setToggles] = useState({
    vencimientos: true,
    firmasPendientes: true,
    nuevosDocumentos: true,
    cambiosVersion: false,
    aprobaciones: true,
  })
  const [anticipacion, setAnticipacion] = useState(15)
  const [canal, setCanal] = useState({ email: true, app: true, whatsapp: false })

  return (
    <Stack gap={3}>
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Tipos de Notificaciones</Typography>
          <Stack gap={1}>
            {[
              { key: 'vencimientos', label: 'Documentos próximos a vencer', desc: 'Alertas de vencimiento de licencias, SOAT, contratos, etc.' },
              { key: 'firmasPendientes', label: 'Firmas electrónicas pendientes', desc: 'Cuando un documento requiere tu firma' },
              { key: 'nuevosDocumentos', label: 'Nuevos documentos en carpeta suscrita', desc: 'Notificar cuando se publique en carpetas de mi interés' },
              { key: 'cambiosVersion', label: 'Cambios de versión en documentos seguidos', desc: 'Avisar cuando un documento que sigo tiene nueva versión' },
              { key: 'aprobaciones', label: 'Aprobaciones y rechazos', desc: 'Cuando un documento que creé es aprobado o rechazado' },
            ].map(({ key, label, desc }) => (
              <Paper key={key} sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{desc}</Typography>
                  </Box>
                  <Switch
                    checked={toggles[key as keyof typeof toggles]}
                    onChange={e => setToggles(prev => ({ ...prev, [key]: e.target.checked }))}
                    sx={{ '& .Mui-checked': { color: DMS_COLOR }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: DMS_COLOR } }}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Anticipación de Alertas de Vencimiento</Typography>
          <Stack direction="row" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Alertar con anticipación de:</Typography>
            <Typography variant="body2" fontWeight={700} color={DMS_COLOR}>{anticipacion} días</Typography>
          </Stack>
          <Slider
            value={anticipacion}
            onChange={(_, v) => setAnticipacion(v as number)}
            min={7}
            max={60}
            step={null}
            marks={[
              { value: 7, label: '7d' },
              { value: 15, label: '15d' },
              { value: 30, label: '30d' },
              { value: 60, label: '60d' },
            ]}
            sx={{ color: DMS_COLOR }}
          />
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Canal de Notificaciones</Typography>
          <Grid container spacing={2}>
            {[
              { key: 'email', label: 'Email', desc: 'Correo corporativo', icon: <Email />, color: DMS_COLOR, premium: false },
              { key: 'app', label: 'Notificación en app', desc: 'Centro de notificaciones DMS', icon: <PhoneAndroid />, color: '#7c3aed', premium: false },
              { key: 'whatsapp', label: 'WhatsApp', desc: 'Mensajes directos (premium)', icon: <WhatsApp />, color: '#25D366', premium: true },
            ].map(({ key, label, desc, icon, color, premium }) => (
              <Grid key={key} size={{ xs: 12, sm: 4 }}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `2px solid ${canal[key as keyof typeof canal] ? color : '#e2e8f0'}`,
                    bgcolor: canal[key as keyof typeof canal] ? alpha(color, 0.05) : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: premium ? 0.75 : 1,
                  }}
                  onClick={() => !premium && setCanal(prev => ({ ...prev, [key]: !prev[key as keyof typeof canal] }))}
                >
                  <Stack alignItems="center" gap={1}>
                    <Avatar sx={{ bgcolor: canal[key as keyof typeof canal] ? alpha(color, 0.15) : 'grey.100', color }}>
                      {icon}
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary" textAlign="center">{desc}</Typography>
                    {premium ? (
                      <Chip label="PREMIUM" size="small" sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700, fontSize: '0.6rem' }} />
                    ) : (
                      <Chip
                        label={canal[key as keyof typeof canal] ? 'Activo' : 'Inactivo'}
                        size="small"
                        sx={{
                          bgcolor: canal[key as keyof typeof canal] ? alpha(color, 0.1) : 'grey.100',
                          color: canal[key as keyof typeof canal] ? color : 'text.disabled',
                          fontWeight: 700,
                          fontSize: '0.65rem',
                        }}
                      />
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Button variant="contained" sx={{ alignSelf: 'flex-start', bgcolor: DMS_COLOR }}>
        Guardar preferencias de notificaciones
      </Button>
    </Stack>
  )
}

// ─── Tab 5: Categorías y Tipos ────────────────────────────────────────────────

function TabCategorias() {
  return (
    <Stack gap={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2, borderTop: `3px solid ${DMS_COLOR}` }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color={DMS_COLOR}>12</Typography>
              <Typography variant="body2" color="text.secondary">Categorías activas</Typography>
              <Typography variant="caption" color="text.disabled">Contratos, Políticas, Manuales...</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2, borderTop: '3px solid #7c3aed' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#7c3aed">28</Typography>
              <Typography variant="body2" color="text.secondary">Tipos de documento</Typography>
              <Typography variant="caption" color="text.disabled">Acuerdos, Actas, Certificados...</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2, borderTop: '3px solid #d97706' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#d97706">47</Typography>
              <Typography variant="body2" color="text.secondary">Campos de metadatos</Typography>
              <Typography variant="caption" color="text.disabled">Fecha, N° contrato, Firmante...</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ borderRadius: 2 }}>
        La gestión completa de categorías, tipos de documento y campos de metadatos se realiza en un módulo dedicado.
      </Alert>

      <Card sx={{ borderRadius: 2, p: 1 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>Resumen de categorías configuradas</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.06) } }}>
                  <TableCell>Categoría</TableCell>
                  <TableCell align="center">Tipos</TableCell>
                  <TableCell align="center">Documentos</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { cat: 'Contratos', tipos: 5, docs: 127 },
                  { cat: 'Políticas', tipos: 3, docs: 34 },
                  { cat: 'Procedimientos', tipos: 7, docs: 89 },
                  { cat: 'Manuales', tipos: 4, docs: 23 },
                  { cat: 'Normativa Legal', tipos: 6, docs: 56 },
                  { cat: 'Técnico / Ingeniería', tipos: 3, docs: 41 },
                ].map((row, i) => (
                  <TableRow key={i} hover sx={{ '& td': { py: 0.75, fontSize: '0.8rem' } }}>
                    <TableCell fontWeight={600}>{row.cat}</TableCell>
                    <TableCell align="center">{row.tipos}</TableCell>
                    <TableCell align="center">{row.docs}</TableCell>
                    <TableCell align="center">
                      <Chip label="Activo" size="small" sx={{ bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontSize: '0.62rem', fontWeight: 700 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        endIcon={<OpenInNew />}
        sx={{ alignSelf: 'flex-start', bgcolor: DMS_COLOR }}
        onClick={() => alert('Navegando a /dms/categorias')}
      >
        Ir a gestión completa de categorías
      </Button>
    </Stack>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMSConfig() {
  const [tabValue, setTabValue] = useState(0)

  const tabs = [
    { label: 'General', icon: <Tune /> },
    { label: 'Almacenamiento', icon: <Storage /> },
    { label: 'Seguridad', icon: <Lock /> },
    { label: 'Notificaciones', icon: <NotificationsActive /> },
    { label: 'Categorías y Tipos', icon: <Category /> },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <Settings sx={{ color: DMS_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Configuración del Sistema DMS</Typography>
            <Typography variant="body2" color="text.secondary">
              Ajustes generales, almacenamiento, seguridad y preferencias del módulo documental
            </Typography>
          </Box>
          <Chip label="Administrador" size="small" sx={{ ml: 'auto', bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 700 }} />
        </Stack>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 2, mb: 0 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 56 },
              '& .Mui-selected': { color: DMS_COLOR },
              '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
            }}
          >
            {tabs.map((tab, i) => (
              <Tab
                key={i}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                sx={{ gap: 0.5 }}
              />
            ))}
          </Tabs>
        </Paper>

        <TabPanel value={tabValue} index={0}><TabGeneral /></TabPanel>
        <TabPanel value={tabValue} index={1}><TabAlmacenamiento /></TabPanel>
        <TabPanel value={tabValue} index={2}><TabSeguridad /></TabPanel>
        <TabPanel value={tabValue} index={3}><TabNotificaciones /></TabPanel>
        <TabPanel value={tabValue} index={4}><TabCategorias /></TabPanel>
      </Box>
    </Layout>
  )
}
