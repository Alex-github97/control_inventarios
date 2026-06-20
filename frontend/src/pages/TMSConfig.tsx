import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Grid, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  alpha, Switch, FormControlLabel, InputAdornment,
} from '@mui/material'
import {
  Settings, Add, Edit, Delete, Map, DirectionsBus, LinkOutlined,
  OpenInNew, Save, LocationOn,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const TMS_COLOR = '#0369A1'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Zona {
  id: number
  nombre: string
  descripcion: string
  ciudades: string[]
  activa: boolean
}

interface TipoServicio {
  id: number
  nombre: string
  codigo: string
  descripcion: string
  activo: boolean
}

interface Parametros {
  horas_max_conduccion: number
  descanso_min_horas: number
  dias_alerta_docs: number
  otif_tolerancia_min: number
  costo_km_ref: number
  empresa_defecto: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_ZONAS_INIT: Zona[] = [
  { id: 1, nombre: 'Zona Centro', descripcion: 'Región central del país', ciudades: ['Bogotá', 'Soacha', 'Facatativá', 'Zipaquirá', 'Chía'], activa: true },
  { id: 2, nombre: 'Zona Antioquia', descripcion: 'Departamento de Antioquia', ciudades: ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro', 'Turbo'], activa: true },
  { id: 3, nombre: 'Zona Valle', descripcion: 'Valle del Cauca y Cauca', ciudades: ['Cali', 'Buenaventura', 'Palmira', 'Cartago', 'Tuluá'], activa: true },
  { id: 4, nombre: 'Zona Caribe', descripcion: 'Costa Caribe colombiana', ciudades: ['Barranquilla', 'Cartagena', 'Santa Marta', 'Montería', 'Sincelejo'], activa: true },
  { id: 5, nombre: 'Zona Eje Cafetero', descripcion: 'Eje Cafetero y Risaralda', ciudades: ['Manizales', 'Pereira', 'Armenia'], activa: false },
  { id: 6, nombre: 'Zona Santanderes', descripcion: 'Santander y Norte de Santander', ciudades: ['Bucaramanga', 'Cúcuta', 'Barrancabermeja'], activa: true },
  { id: 7, nombre: 'Zona Llanos', descripcion: 'Llanos Orientales', ciudades: ['Villavicencio', 'Yopal', 'Acacías'], activa: true },
]

const MOCK_TIPOS_INIT: TipoServicio[] = [
  { id: 1, nombre: 'Transporte Carga Seca', codigo: 'TCS', descripcion: 'Transporte de mercancía seca en camión estándar', activo: true },
  { id: 2, nombre: 'Transporte Refrigerado', codigo: 'TRF', descripcion: 'Transporte con cadena de frío', activo: true },
  { id: 3, nombre: 'Carga Peligrosa', codigo: 'CPG', descripcion: 'Transporte de mercancías peligrosas', activo: true },
  { id: 4, nombre: 'Mensajería Express', codigo: 'MEX', descripcion: 'Entrega en menos de 24 horas', activo: true },
  { id: 5, nombre: 'Distribución Urbana', codigo: 'DUR', descripcion: 'Distribución en zonas urbanas con vehículos pequeños', activo: true },
  { id: 6, nombre: 'Carga Sobredimensionada', codigo: 'CSO', descripcion: 'Carga extra grande con permisos especiales', activo: false },
]

const MOCK_PARAMS_INIT: Parametros = {
  horas_max_conduccion: 8,
  descanso_min_horas: 11,
  dias_alerta_docs: 30,
  otif_tolerancia_min: 60,
  costo_km_ref: 2500,
  empresa_defecto: 'ICOLTRANS',
}

const EMPRESAS = ['ICOLTRANS', 'Filial Norte', 'Filial Sur', 'Operadora Logística']

export default function TMSConfig() {
  const [tab, setTab] = useState(0)

  // Zonas state
  const [zonas, setZonas] = useState<Zona[]>(MOCK_ZONAS_INIT)
  const [openZona, setOpenZona] = useState(false)
  const [editZona, setEditZona] = useState<Zona | null>(null)
  const [zonaForm, setZonaForm] = useState({ nombre: '', descripcion: '', ciudades: [] as string[], activa: true })
  const [nuevaCiudad, setNuevaCiudad] = useState('')

  // Tipos state
  const [tipos, setTipos] = useState<TipoServicio[]>(MOCK_TIPOS_INIT)
  const [openTipo, setOpenTipo] = useState(false)
  const [editTipo, setEditTipo] = useState<TipoServicio | null>(null)
  const [tipoForm, setTipoForm] = useState({ nombre: '', codigo: '', descripcion: '', activo: true })

  // Params state
  const [params, setParams] = useState<Parametros>(MOCK_PARAMS_INIT)

  // ── Zona handlers ──
  function openNuevaZona() {
    setEditZona(null)
    setZonaForm({ nombre: '', descripcion: '', ciudades: [], activa: true })
    setOpenZona(true)
  }
  function openEditarZona(z: Zona) {
    setEditZona(z)
    setZonaForm({ nombre: z.nombre, descripcion: z.descripcion, ciudades: [...z.ciudades], activa: z.activa })
    setOpenZona(true)
  }
  function guardarZona() {
    if (!zonaForm.nombre) { toast.error('Ingrese el nombre de la zona'); return }
    if (editZona) {
      setZonas(zs => zs.map(z => z.id === editZona.id ? { ...z, ...zonaForm } : z))
      toast.success('Zona actualizada')
    } else {
      setZonas(zs => [...zs, { id: Date.now(), ...zonaForm }])
      toast.success('Zona creada')
    }
    setOpenZona(false)
  }
  function eliminarZona(id: number) {
    setZonas(zs => zs.filter(z => z.id !== id))
    toast.success('Zona eliminada')
  }
  function agregarCiudad() {
    if (!nuevaCiudad.trim()) return
    setZonaForm(f => ({ ...f, ciudades: [...f.ciudades, nuevaCiudad.trim()] }))
    setNuevaCiudad('')
  }
  function quitarCiudad(c: string) {
    setZonaForm(f => ({ ...f, ciudades: f.ciudades.filter(x => x !== c) }))
  }

  // ── Tipo handlers ──
  function openNuevoTipo() {
    setEditTipo(null)
    setTipoForm({ nombre: '', codigo: '', descripcion: '', activo: true })
    setOpenTipo(true)
  }
  function openEditarTipo(t: TipoServicio) {
    setEditTipo(t)
    setTipoForm({ nombre: t.nombre, codigo: t.codigo, descripcion: t.descripcion, activo: t.activo })
    setOpenTipo(true)
  }
  function guardarTipo() {
    if (!tipoForm.nombre || !tipoForm.codigo) { toast.error('Complete nombre y código'); return }
    if (editTipo) {
      setTipos(ts => ts.map(t => t.id === editTipo.id ? { ...t, ...tipoForm } : t))
      toast.success('Tipo de servicio actualizado')
    } else {
      setTipos(ts => [...ts, { id: Date.now(), ...tipoForm }])
      toast.success('Tipo de servicio creado')
    }
    setOpenTipo(false)
  }
  function eliminarTipo(id: number) {
    setTipos(ts => ts.filter(t => t.id !== id))
    toast.success('Tipo eliminado')
  }

  function guardarParametros() {
    toast.success('Parámetros guardados exitosamente')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <Box sx={{ bgcolor: alpha(TMS_COLOR, 0.1), borderRadius: 2, p: 1, display: 'flex' }}>
            <Settings sx={{ color: TMS_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#0F172A">Configuración TMS</Typography>
            <Typography variant="body2" color="text.secondary">Zonas, tipos de servicio, rutas y parámetros del sistema</Typography>
          </Box>
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
            <Tab label="Zonas" />
            <Tab label="Tipos de Servicio" />
            <Tab label="Rutas Base" />
            <Tab label="Parámetros" />
          </Tabs>

          {/* ── Tab 0: Zonas ── */}
          {tab === 0 && (
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="flex-end" mb={2}>
                <Button variant="contained" startIcon={<Add />} onClick={openNuevaZona} sx={{ bgcolor: TMS_COLOR }}>
                  Nueva Zona
                </Button>
              </Stack>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Nombre</b></TableCell>
                      <TableCell><b>Descripción</b></TableCell>
                      <TableCell><b>Ciudades</b></TableCell>
                      <TableCell align="center"><b>Activa</b></TableCell>
                      <TableCell><b>Acciones</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {zonas.map(z => (
                      <TableRow key={z.id} hover>
                        <TableCell><b>{z.nombre}</b></TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{z.descripcion}</TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.5} flexWrap="wrap">
                            {z.ciudades.slice(0, 3).map(c => (
                              <Chip key={c} label={c} size="small" variant="outlined" />
                            ))}
                            {z.ciudades.length > 3 && (
                              <Chip label={`+${z.ciudades.length - 3} más`} size="small" sx={{ bgcolor: alpha(TMS_COLOR, 0.1), color: TMS_COLOR }} />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Switch size="small" checked={z.activa} onChange={() => { setZonas(zs => zs.map(x => x.id === z.id ? { ...x, activa: !x.activa } : x)); toast.success('Estado actualizado') }} sx={{ '& .MuiSwitch-thumb': { bgcolor: z.activa ? TMS_COLOR : undefined } }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row">
                            <IconButton size="small" onClick={() => openEditarZona(z)}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => eliminarZona(z.id)} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 1: Tipos de Servicio ── */}
          {tab === 1 && (
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="flex-end" mb={2}>
                <Button variant="contained" startIcon={<Add />} onClick={openNuevoTipo} sx={{ bgcolor: TMS_COLOR }}>
                  Nuevo Tipo
                </Button>
              </Stack>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Nombre</b></TableCell>
                      <TableCell><b>Código</b></TableCell>
                      <TableCell><b>Descripción</b></TableCell>
                      <TableCell align="center"><b>Activo</b></TableCell>
                      <TableCell><b>Acciones</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tipos.map(t => (
                      <TableRow key={t.id} hover>
                        <TableCell><b>{t.nombre}</b></TableCell>
                        <TableCell>
                          <Chip label={t.codigo} size="small" sx={{ bgcolor: alpha(TMS_COLOR, 0.1), color: TMS_COLOR, fontWeight: 700, fontFamily: 'monospace' }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{t.descripcion}</TableCell>
                        <TableCell align="center">
                          <Switch size="small" checked={t.activo} onChange={() => { setTipos(ts => ts.map(x => x.id === t.id ? { ...x, activo: !x.activo } : x)); toast.success('Estado actualizado') }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row">
                            <IconButton size="small" onClick={() => openEditarTipo(t)}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => eliminarTipo(t.id)} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 2: Rutas Base ── */}
          {tab === 2 && (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <Paper elevation={0} sx={{ p: 4, border: `2px dashed ${alpha(TMS_COLOR, 0.3)}`, borderRadius: 3, textAlign: 'center', maxWidth: 400 }}>
                <Box sx={{ bgcolor: alpha(TMS_COLOR, 0.1), borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                  <Map sx={{ color: TMS_COLOR, fontSize: 36 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} mb={1}>Gestión de Rutas Base</Typography>
                <Typography fontSize={13} color="text.secondary" mb={3}>
                  Las rutas se gestionan desde el módulo de Rutas del TMS. Haga clic para acceder a la gestión completa de rutas.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<OpenInNew />}
                  onClick={() => toast.success('Redirigiendo a /tms/rutas...')}
                  sx={{ bgcolor: TMS_COLOR }}
                >
                  Ir a Módulo de Rutas
                </Button>
                <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5} mt={2}>
                  <LinkOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography fontSize={11} color="text.secondary">/tms/rutas</Typography>
                </Stack>
              </Paper>
            </Box>
          )}

          {/* ── Tab 3: Parámetros ── */}
          {tab === 3 && (
            <Box sx={{ p: 3 }}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, maxWidth: 600 }}>
                <Typography variant="h6" fontWeight={700} mb={3} color="#0F172A">Parámetros Generales del TMS</Typography>
                <Stack gap={2.5}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Horas máximas de conducción diaria"
                        type="number" fullWidth
                        value={params.horas_max_conduccion}
                        onChange={e => setParams(p => ({ ...p, horas_max_conduccion: Number(e.target.value) }))}
                        InputProps={{ endAdornment: <InputAdornment position="end">h</InputAdornment> }}
                        helperText="Límite legal de conducción"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Tiempo mínimo de descanso entre turnos"
                        type="number" fullWidth
                        value={params.descanso_min_horas}
                        onChange={e => setParams(p => ({ ...p, descanso_min_horas: Number(e.target.value) }))}
                        InputProps={{ endAdornment: <InputAdornment position="end">h</InputAdornment> }}
                        helperText="Horas mínimas de descanso"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Días para alertar vencimiento de documentos"
                        type="number" fullWidth
                        value={params.dias_alerta_docs}
                        onChange={e => setParams(p => ({ ...p, dias_alerta_docs: Number(e.target.value) }))}
                        InputProps={{ endAdornment: <InputAdornment position="end">días</InputAdornment> }}
                        helperText="Alerta anticipada de vencimiento"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="OTIF - Tolerancia de retraso"
                        type="number" fullWidth
                        value={params.otif_tolerancia_min}
                        onChange={e => setParams(p => ({ ...p, otif_tolerancia_min: Number(e.target.value) }))}
                        InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                        helperText="Minutos de tolerancia para OT"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Costo por km de referencia"
                        type="number" fullWidth
                        value={params.costo_km_ref}
                        onChange={e => setParams(p => ({ ...p, costo_km_ref: Number(e.target.value) }))}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        helperText="Costo base por kilómetro (COP)"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select label="Empresa por defecto" fullWidth
                        value={params.empresa_defecto}
                        onChange={e => setParams(p => ({ ...p, empresa_defecto: e.target.value }))}
                        helperText="Empresa predeterminada del HCM"
                      >
                        {EMPRESAS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                      </TextField>
                    </Grid>
                  </Grid>
                  <Box>
                    <Button variant="contained" startIcon={<Save />} onClick={guardarParametros} sx={{ bgcolor: TMS_COLOR }}>
                      Guardar Parámetros
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          )}
        </Paper>

        {/* ── Dialog Zona ── */}
        <Dialog open={openZona} onClose={() => setOpenZona(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editZona ? 'Editar Zona' : 'Nueva Zona'}</DialogTitle>
          <DialogContent>
            <Stack gap={2} mt={1}>
              <TextField label="Nombre *" value={zonaForm.nombre} onChange={e => setZonaForm(f => ({ ...f, nombre: e.target.value }))} />
              <TextField label="Descripción" value={zonaForm.descripcion} onChange={e => setZonaForm(f => ({ ...f, descripcion: e.target.value }))} />
              <Box>
                <Typography fontSize={13} fontWeight={600} mb={1}>Ciudades</Typography>
                <Stack direction="row" gap={1} mb={1}>
                  <TextField size="small" placeholder="Agregar ciudad..." value={nuevaCiudad} onChange={e => setNuevaCiudad(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregarCiudad()} fullWidth />
                  <Button variant="outlined" onClick={agregarCiudad} sx={{ borderColor: TMS_COLOR, color: TMS_COLOR }}>Agregar</Button>
                </Stack>
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  {zonaForm.ciudades.map(c => (
                    <Chip key={c} label={c} size="small" onDelete={() => quitarCiudad(c)} />
                  ))}
                </Stack>
              </Box>
              <FormControlLabel
                control={<Switch checked={zonaForm.activa} onChange={e => setZonaForm(f => ({ ...f, activa: e.target.checked }))} />}
                label="Zona activa"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenZona(false)}>Cancelar</Button>
            <Button variant="contained" onClick={guardarZona} sx={{ bgcolor: TMS_COLOR }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Dialog Tipo de Servicio ── */}
        <Dialog open={openTipo} onClose={() => setOpenTipo(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editTipo ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}</DialogTitle>
          <DialogContent>
            <Stack gap={2} mt={1}>
              <TextField label="Nombre *" value={tipoForm.nombre} onChange={e => setTipoForm(f => ({ ...f, nombre: e.target.value }))} />
              <TextField
                label="Código *"
                value={tipoForm.codigo}
                onChange={e => setTipoForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                inputProps={{ style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
                helperText="Se convierte a mayúsculas automáticamente"
              />
              <TextField label="Descripción" multiline rows={2} value={tipoForm.descripcion} onChange={e => setTipoForm(f => ({ ...f, descripcion: e.target.value }))} />
              <FormControlLabel
                control={<Switch checked={tipoForm.activo} onChange={e => setTipoForm(f => ({ ...f, activo: e.target.checked }))} />}
                label="Activo"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTipo(false)}>Cancelar</Button>
            <Button variant="contained" onClick={guardarTipo} sx={{ bgcolor: TMS_COLOR }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
