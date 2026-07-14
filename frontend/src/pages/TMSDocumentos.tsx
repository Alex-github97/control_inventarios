import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Chip, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Alert, alpha, Collapse, InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Description, CloudDownload, Visibility, Add, Search,
  CameraAlt, CheckCircle, Schedule, Cancel, ArrowForward,
  ExpandMore, ExpandLess, ArticleOutlined, AssignmentTurnedIn,
  Warning,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'
import { exportarPDF } from '@/utils/exportar'

const TMS_COLOR = '#0369A1'

// ─── Types ────────────────────────────────────────────────────────────────────
type DocEstado = 'PENDIENTE' | 'GENERADO' | 'FIRMADO' | 'RECHAZADO'
type DocTipo = 'REMESA' | 'MANIFIESTO' | 'CUMPLIDO' | 'POD' | 'FACTURA'

interface Documento {
  id: number
  tipo: DocTipo
  numero: string
  fecha_emision: string
  estado: DocEstado
  observaciones?: string
}

interface Viaje {
  codigo: string
  origen: string
  destino: string
  estado: string
  conductor: string
  documentos: Documento[]
}

interface PODRegistro {
  id: number
  codigo_viaje: string
  destino: string
  conductor: string
  receptor_nombre: string
  receptor_documento: string
  lat: number
  lng: number
  fecha_hora: string
  estado: 'REGISTRADO' | 'PENDIENTE'
  observaciones: string
}

interface ViajesPendiente {
  codigo: string
  origen: string
  destino: string
  fecha_programada: string
  docs_faltantes: DocTipo[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_VIAJES: Record<string, Viaje> = {
  'VJ-2024-001': {
    codigo: 'VJ-2024-001', origen: 'Bogotá', destino: 'Medellín',
    estado: 'EN_TRANSITO', conductor: 'Carlos Rodríguez',
    documentos: [
      { id: 1, tipo: 'REMESA', numero: 'REM-001234', fecha_emision: '2024-06-01', estado: 'FIRMADO' },
      { id: 2, tipo: 'MANIFIESTO', numero: 'MAN-000567', fecha_emision: '2024-06-01', estado: 'GENERADO' },
      { id: 3, tipo: 'CUMPLIDO', numero: 'CUM-000089', fecha_emision: '2024-06-02', estado: 'PENDIENTE' },
    ],
  },
  'VJ-2024-002': {
    codigo: 'VJ-2024-002', origen: 'Medellín', destino: 'Cali',
    estado: 'COMPLETADO', conductor: 'Luis Hernández',
    documentos: [
      { id: 4, tipo: 'REMESA', numero: 'REM-001235', fecha_emision: '2024-05-28', estado: 'FIRMADO' },
      { id: 5, tipo: 'MANIFIESTO', numero: 'MAN-000568', fecha_emision: '2024-05-28', estado: 'FIRMADO' },
      { id: 6, tipo: 'POD', numero: 'POD-000023', fecha_emision: '2024-05-30', estado: 'FIRMADO' },
    ],
  },
  'VJ-2024-003': {
    codigo: 'VJ-2024-003', origen: 'Cali', destino: 'Barranquilla',
    estado: 'DEMORADO', conductor: 'Andrés Torres',
    documentos: [
      { id: 7, tipo: 'REMESA', numero: 'REM-001236', fecha_emision: '2024-06-03', estado: 'GENERADO' },
      { id: 8, tipo: 'FACTURA', numero: 'FAC-000345', fecha_emision: '2024-06-03', estado: 'RECHAZADO', observaciones: 'Error en valor declarado' },
    ],
  },
}

const MOCK_PODS: PODRegistro[] = [
  { id: 1, codigo_viaje: 'VJ-2024-002', destino: 'Cali', conductor: 'Luis Hernández', receptor_nombre: 'Juan García', receptor_documento: '12345678', lat: 3.4516, lng: -76.5320, fecha_hora: '2024-05-30 14:35', estado: 'REGISTRADO', observaciones: 'Entrega sin novedad' },
  { id: 2, codigo_viaje: 'VJ-2024-005', destino: 'Bucaramanga', conductor: 'Pedro Martínez', receptor_nombre: '', receptor_documento: '', lat: 0, lng: 0, fecha_hora: '', estado: 'PENDIENTE', observaciones: '' },
  { id: 3, codigo_viaje: 'VJ-2024-006', destino: 'Pereira', conductor: 'Mario López', receptor_nombre: 'Ana Gómez', receptor_documento: '98765432', lat: 4.8133, lng: -75.6961, fecha_hora: '2024-06-04 09:20', estado: 'REGISTRADO', observaciones: 'Leve retraso por tráfico' },
  { id: 4, codigo_viaje: 'VJ-2024-007', destino: 'Cartagena', conductor: 'Felipe Ruiz', receptor_nombre: '', receptor_documento: '', lat: 0, lng: 0, fecha_hora: '', estado: 'PENDIENTE', observaciones: '' },
  { id: 5, codigo_viaje: 'VJ-2024-008', destino: 'Manizales', conductor: 'Sergio Castro', receptor_nombre: 'Rosa Díaz', receptor_documento: '55443322', lat: 5.0703, lng: -75.5138, fecha_hora: '2024-06-05 16:10', estado: 'REGISTRADO', observaciones: '' },
]

const MOCK_PENDIENTES: ViajesPendiente[] = [
  { codigo: 'VJ-2024-001', origen: 'Bogotá', destino: 'Medellín', fecha_programada: '2024-06-02', docs_faltantes: ['CUMPLIDO', 'POD'] },
  { codigo: 'VJ-2024-003', origen: 'Cali', destino: 'Barranquilla', fecha_programada: '2024-06-04', docs_faltantes: ['MANIFIESTO', 'POD', 'CUMPLIDO'] },
  { codigo: 'VJ-2024-009', origen: 'Bogotá', destino: 'Villavicencio', fecha_programada: '2024-06-05', docs_faltantes: ['REMESA'] },
  { codigo: 'VJ-2024-010', origen: 'Medellín', destino: 'Santa Marta', fecha_programada: '2024-06-06', docs_faltantes: ['POD', 'FACTURA'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function estadoDocChip(estado: DocEstado) {
  const map: Record<DocEstado, { label: string; color: 'default' | 'primary' | 'success' | 'error' }> = {
    PENDIENTE: { label: 'Pendiente', color: 'default' },
    GENERADO: { label: 'Generado', color: 'primary' },
    FIRMADO: { label: 'Firmado', color: 'success' },
    RECHAZADO: { label: 'Rechazado', color: 'error' },
  }
  const m = map[estado]
  return <Chip label={m.label} color={m.color} size="small" />
}

function tipoDocIcon(tipo: DocTipo) {
  const icons: Record<DocTipo, React.ReactNode> = {
    REMESA: <ArticleOutlined fontSize="small" />,
    MANIFIESTO: <Description fontSize="small" />,
    CUMPLIDO: <AssignmentTurnedIn fontSize="small" />,
    POD: <CheckCircle fontSize="small" />,
    FACTURA: <ArticleOutlined fontSize="small" />,
  }
  return icons[tipo]
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TMSDocumentos() {
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [viajeSeleccionado, setViajeSeleccionado] = useState<Viaje | null>(null)
  const [openAddDoc, setOpenAddDoc] = useState(false)
  const [openPOD, setOpenPOD] = useState<PODRegistro | null>(null)
  const [openNuevoPOD, setOpenNuevoPOD] = useState(false)
  const [expandedPOD, setExpandedPOD] = useState<number | null>(null)
  const [newDoc, setNewDoc] = useState({ tipo: 'REMESA', numero: '', fecha_emision: '', archivo_url: '', observaciones: '' })
  const [newPOD, setNewPOD] = useState({ receptor_nombre: '', receptor_documento: '', lat: '', lng: '', fecha_hora: '', observaciones: '' })

  function buscarViaje() {
    const v = MOCK_VIAJES[busqueda.toUpperCase().trim()]
    if (v) { setViajeSeleccionado(v); toast.success(`Viaje ${v.codigo} encontrado`) }
    else { toast.error('Viaje no encontrado'); setViajeSeleccionado(null) }
  }

  function guardarDocumento() {
    if (!newDoc.numero || !newDoc.fecha_emision) { toast.error('Complete los campos requeridos'); return }
    toast.success('Documento agregado exitosamente')
    setOpenAddDoc(false)
    setNewDoc({ tipo: 'REMESA', numero: '', fecha_emision: '', archivo_url: '', observaciones: '' })
  }

  function guardarPOD() {
    if (!newPOD.receptor_nombre) { toast.error('Ingrese el nombre del receptor'); return }
    toast.success('POD registrado exitosamente')
    setOpenNuevoPOD(false)
    setNewPOD({ receptor_nombre: '', receptor_documento: '', lat: '', lng: '', fecha_hora: '', observaciones: '' })
  }

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <Box sx={{ bgcolor: alpha(TMS_COLOR, 0.1), borderRadius: 2, p: 1, display: 'flex' }}>
            <Description sx={{ color: TMS_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#0F172A">Gestión Documental TMS</Typography>
            <Typography variant="body2" color="text.secondary">Remesas, Manifiestos, POD y documentos de viaje</Typography>
          </Box>
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
            <Tab label="Documentos por Viaje" />
            <Tab label="POD (Prueba de Entrega)" />
            <Tab label="Pendientes" />
          </Tabs>

          {/* ── Tab 0: Documentos por Viaje ── */}
          {tab === 0 && (
            <Box sx={{ p: 3 }}>
              <Stack direction="row" gap={1} mb={3}>
                <TextField
                  size="small" placeholder="Código de viaje (ej: VJ-2024-001)"
                  value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarViaje()}
                  sx={{ width: 320 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                />
                <Button variant="contained" onClick={buscarViaje} sx={{ bgcolor: TMS_COLOR }}>Buscar</Button>
              </Stack>

              {!viajeSeleccionado && (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Description sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography>Busque un viaje para ver sus documentos</Typography>
                  <Typography variant="caption">Pruebe: VJ-2024-001, VJ-2024-002, VJ-2024-003</Typography>
                </Box>
              )}

              {viajeSeleccionado && (
                <>
                  {/* Viaje header */}
                  <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: alpha(TMS_COLOR, 0.04), border: `1px solid ${alpha(TMS_COLOR, 0.2)}`, borderRadius: 2 }}>
                    <Stack direction="row" flexWrap="wrap" gap={3} alignItems="center">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Código</Typography>
                        <Typography fontWeight={700}>{viajeSeleccionado.codigo}</Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Typography fontWeight={600}>{viajeSeleccionado.origen}</Typography>
                        <ArrowForward fontSize="small" sx={{ color: TMS_COLOR }} />
                        <Typography fontWeight={600}>{viajeSeleccionado.destino}</Typography>
                      </Stack>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Estado</Typography>
                        <Typography fontWeight={600} color={TMS_COLOR}>{viajeSeleccionado.estado}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Conductor</Typography>
                        <Typography fontWeight={600}>{viajeSeleccionado.conductor}</Typography>
                      </Box>
                      <Box sx={{ ml: 'auto' }}>
                        <Button variant="outlined" startIcon={<Add />} onClick={() => setOpenAddDoc(true)} sx={{ borderColor: TMS_COLOR, color: TMS_COLOR }}>
                          Agregar Documento
                        </Button>
                      </Box>
                    </Stack>
                  </Paper>

                  <Grid container spacing={2}>
                    {viajeSeleccionado.documentos.map(doc => (
                      <Grid key={doc.id} size={{ xs: 12, md: 6, lg: 4 }}>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, '&:hover': { borderColor: alpha(TMS_COLOR, 0.4) }, transition: 'border-color 0.15s' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Box sx={{ color: TMS_COLOR }}>{tipoDocIcon(doc.tipo)}</Box>
                              <Typography fontWeight={700} fontSize={13}>{doc.tipo}</Typography>
                            </Stack>
                            {estadoDocChip(doc.estado)}
                          </Stack>
                          <Typography fontSize={13} color="text.secondary">N°: <b>{doc.numero}</b></Typography>
                          <Typography fontSize={12} color="text.secondary">Emisión: {doc.fecha_emision}</Typography>
                          {doc.observaciones && <Typography fontSize={11} color="error.main" mt={0.5}>{doc.observaciones}</Typography>}
                          <Stack direction="row" gap={1} mt={2}>
                            <Button size="small" startIcon={<Visibility fontSize="inherit" />} onClick={() => toast.success(`Abriendo ${doc.numero}`)}>Ver</Button>
                            <Button size="small" startIcon={<CloudDownload fontSize="inherit" />} onClick={() => exportarPDF({
                              archivo: `documento-${doc.numero}`,
                              titulo: `${doc.tipo} ${doc.numero}`,
                              color: TMS_COLOR,
                              columnas: [{ key: 'campo', header: 'Campo' }, { key: 'valor', header: 'Valor' }],
                              filas: [
                                { campo: 'Tipo', valor: doc.tipo },
                                { campo: 'Número', valor: doc.numero },
                                { campo: 'Estado', valor: doc.estado },
                                { campo: 'Fecha de emisión', valor: doc.fecha_emision },
                                { campo: 'Observaciones', valor: doc.observaciones || '—' },
                              ],
                            })}>Descargar</Button>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </Box>
          )}

          {/* ── Tab 1: POD ── */}
          {tab === 1 && (
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography fontWeight={600}>Pruebas de Entrega</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpenNuevoPOD(true)} sx={{ bgcolor: TMS_COLOR }}>
                  Registrar POD
                </Button>
              </Stack>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Código Viaje</b></TableCell>
                      <TableCell><b>Destino</b></TableCell>
                      <TableCell><b>Conductor</b></TableCell>
                      <TableCell><b>Receptor</b></TableCell>
                      <TableCell><b>Fecha/Hora POD</b></TableCell>
                      <TableCell><b>Estado</b></TableCell>
                      <TableCell><b>Ver</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_PODS.map(pod => (
                      <React.Fragment key={pod.id}>
                        <TableRow hover>
                          <TableCell>{pod.codigo_viaje}</TableCell>
                          <TableCell>{pod.destino}</TableCell>
                          <TableCell>{pod.conductor}</TableCell>
                          <TableCell>{pod.receptor_nombre || '—'}</TableCell>
                          <TableCell>{pod.fecha_hora || '—'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={pod.estado} color={pod.estado === 'REGISTRADO' ? 'success' : 'default'} />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => { setExpandedPOD(expandedPOD === pod.id ? null : pod.id) }}>
                              {expandedPOD === pod.id ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                            <Collapse in={expandedPOD === pod.id}>
                              <Box sx={{ p: 3, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <Grid container spacing={2}>
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Datos del Receptor</Typography>
                                    <Typography fontSize={13}><b>Nombre:</b> {pod.receptor_nombre || 'Sin registrar'}</Typography>
                                    <Typography fontSize={13}><b>Documento:</b> {pod.receptor_documento || '—'}</Typography>
                                    <Typography fontSize={13}><b>GPS:</b> {pod.lat ? `${pod.lat}, ${pod.lng}` : 'Sin coordenadas'}</Typography>
                                    <Typography fontSize={13}><b>Fecha/Hora:</b> {pod.fecha_hora || '—'}</Typography>
                                    {pod.observaciones && <Typography fontSize={13}><b>Observaciones:</b> {pod.observaciones}</Typography>}
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 3 }}>
                                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Firma Digital</Typography>
                                    <Box sx={{ width: 200, height: 100, border: '2px dashed #CBD5E1', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff' }}>
                                      <Typography fontSize={12} color="text.secondary">Firma Digital</Typography>
                                    </Box>
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 3 }}>
                                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Foto Evidencia</Typography>
                                    <Box sx={{ width: 200, height: 150, border: '2px dashed #CBD5E1', borderRadius: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', gap: 0.5 }}>
                                      <CameraAlt sx={{ color: '#94A3B8' }} />
                                      <Typography fontSize={11} color="text.secondary">Sin foto</Typography>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 2: Pendientes ── */}
          {tab === 2 && (
            <Box sx={{ p: 3 }}>
              <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
                <b>Viajes sin documentación completa</b> — Se encontraron {MOCK_PENDIENTES.length} viajes con documentos faltantes.
              </Alert>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Código Viaje</b></TableCell>
                      <TableCell><b>Origen</b></TableCell>
                      <TableCell><b>Destino</b></TableCell>
                      <TableCell><b>Fecha Programada</b></TableCell>
                      <TableCell><b>Documentos Faltantes</b></TableCell>
                      <TableCell><b>Acción</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_PENDIENTES.map(p => (
                      <TableRow key={p.codigo} hover>
                        <TableCell><b>{p.codigo}</b></TableCell>
                        <TableCell>{p.origen}</TableCell>
                        <TableCell>{p.destino}</TableCell>
                        <TableCell>{p.fecha_programada}</TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.5} flexWrap="wrap">
                            {p.docs_faltantes.map(d => (
                              <Chip key={d} label={d} size="small" color="warning" variant="outlined" />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" sx={{ borderColor: TMS_COLOR, color: TMS_COLOR }}
                            onClick={() => { setBusqueda(p.codigo); setTab(0); setTimeout(() => buscarViaje(), 100) }}>
                            Gestionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>

        {/* ── Dialog Agregar Documento ── */}
        <Dialog open={openAddDoc} onClose={() => setOpenAddDoc(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Agregar Documento</DialogTitle>
          <DialogContent>
            <Stack gap={2} mt={1}>
              <TextField select label="Tipo de Documento" value={newDoc.tipo} onChange={e => setNewDoc(d => ({ ...d, tipo: e.target.value }))}>
                {['REMESA', 'MANIFIESTO', 'CUMPLIDO', 'POD', 'FACTURA'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField label="Número *" value={newDoc.numero} onChange={e => setNewDoc(d => ({ ...d, numero: e.target.value }))} />
              <TextField label="Fecha de Emisión *" type="date" value={newDoc.fecha_emision} onChange={e => setNewDoc(d => ({ ...d, fecha_emision: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="URL Archivo" value={newDoc.archivo_url} onChange={e => setNewDoc(d => ({ ...d, archivo_url: e.target.value }))} placeholder="https://..." />
              <TextField label="Observaciones" multiline rows={2} value={newDoc.observaciones} onChange={e => setNewDoc(d => ({ ...d, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDoc(false)}>Cancelar</Button>
            <Button variant="contained" onClick={guardarDocumento} sx={{ bgcolor: TMS_COLOR }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Dialog Registrar POD ── */}
        <Dialog open={openNuevoPOD} onClose={() => setOpenNuevoPOD(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Registrar POD</DialogTitle>
          <DialogContent>
            <Stack gap={2} mt={1}>
              <TextField label="Nombre del Receptor *" value={newPOD.receptor_nombre} onChange={e => setNewPOD(d => ({ ...d, receptor_nombre: e.target.value }))} />
              <TextField label="Documento del Receptor" value={newPOD.receptor_documento} onChange={e => setNewPOD(d => ({ ...d, receptor_documento: e.target.value }))} />
              <Stack direction="row" gap={2}>
                <TextField label="Latitud" value={newPOD.lat} onChange={e => setNewPOD(d => ({ ...d, lat: e.target.value }))} fullWidth />
                <TextField label="Longitud" value={newPOD.lng} onChange={e => setNewPOD(d => ({ ...d, lng: e.target.value }))} fullWidth />
              </Stack>
              <TextField label="Fecha y Hora" type="datetime-local" value={newPOD.fecha_hora} onChange={e => setNewPOD(d => ({ ...d, fecha_hora: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Observaciones" multiline rows={2} value={newPOD.observaciones} onChange={e => setNewPOD(d => ({ ...d, observaciones: e.target.value }))} />
              <Alert severity="info" sx={{ fontSize: 12 }}>La firma digital y fotos de evidencia se capturan desde la app móvil del conductor.</Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNuevoPOD(false)}>Cancelar</Button>
            <Button variant="contained" onClick={guardarPOD} sx={{ bgcolor: TMS_COLOR }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
