import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
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
  Avatar,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Security,
  Search,
  Download,
  ExpandMore,
  ExpandLess,
  Circle,
  FilterList,
  Visibility,
  Edit,
  DeleteForever,
  CloudDownload,
  Draw,
  CheckCircle,
  Cancel,
  AddCircle,
  NewReleases,
  AccessTime,
  Computer,
  Person,
  Article,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { exportarExcel } from '@/utils/exportar'
import toast from 'react-hot-toast'

const DMS_COLOR = '#0E7490'

// ─── Types ────────────────────────────────────────────────────────────────────

type Accion =
  | 'CREACION'
  | 'VISUALIZACION'
  | 'DESCARGA'
  | 'MODIFICACION'
  | 'ELIMINACION'
  | 'FIRMA'
  | 'APROBACION'
  | 'RECHAZO'
  | 'VERSION_NUEVA'

interface AuditoriaRow {
  id: string
  accion: Accion
  documento: string
  usuario: string
  ip: string
  fechaHora: string
  dispositivo: string
  detalles: string
  area: string
  tamaño?: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AUDITORIA_ROWS: AuditoriaRow[] = [
  {
    id: 'AUD-2026-001',
    accion: 'CREACION',
    documento: 'Contrato Marco Almacenes Éxito 2026',
    usuario: 'Ana Milena Torres',
    ip: '192.168.1.45',
    fechaHora: '20/06/2026 08:14:32',
    dispositivo: 'Chrome 124 / Windows 11',
    detalles: 'Documento creado en borrador. Tamaño: 2.4 MB. Categoría: Contratos Comerciales.',
    area: 'Comercial',
    tamaño: '2.4 MB',
  },
  {
    id: 'AUD-2026-002',
    accion: 'VISUALIZACION',
    documento: 'Política de Seguridad Vial v2.0',
    usuario: 'Carlos Rodríguez Pérez',
    ip: '192.168.1.78',
    fechaHora: '20/06/2026 08:22:10',
    dispositivo: 'Firefox 125 / macOS',
    detalles: 'Documento visualizado en visor web. Duración de sesión: 4 min 32 seg.',
    area: 'SST',
  },
  {
    id: 'AUD-2026-003',
    accion: 'DESCARGA',
    documento: 'Certificado BASC 2026',
    usuario: 'María José Herrera',
    ip: '10.0.0.23',
    fechaHora: '20/06/2026 08:35:47',
    dispositivo: 'Edge 124 / Windows 10',
    detalles: 'Descarga en formato PDF original. Marca de agua aplicada. Registro de descarga #DL-4521.',
    area: 'Calidad',
    tamaño: '890 KB',
  },
  {
    id: 'AUD-2026-004',
    accion: 'MODIFICACION',
    documento: 'Manual de Procedimientos TMS v1.4',
    usuario: 'Jorge Alberto Gómez',
    ip: '192.168.2.101',
    fechaHora: '20/06/2026 09:01:15',
    dispositivo: 'Chrome 124 / Windows 11',
    detalles: 'Modificación de sección 3.2: Protocolo de despacho. Campos modificados: contenido, estado.',
    area: 'Operaciones',
  },
  {
    id: 'AUD-2026-005',
    accion: 'FIRMA',
    documento: 'Acuerdo de Confidencialidad Proveedor Bogotá',
    usuario: 'Luisa Fernanda Muñoz',
    ip: '172.16.0.55',
    fechaHora: '20/06/2026 09:18:33',
    dispositivo: 'Safari / iPhone 15',
    detalles: 'Firma electrónica aplicada. Certificado: CN-2026-LFM. Hash SHA-256 registrado. IP verificada.',
    area: 'Jurídico',
  },
  {
    id: 'AUD-2026-006',
    accion: 'APROBACION',
    documento: 'Procedimiento de Carga y Descarga v5.2',
    usuario: 'Ricardo Andrés Sánchez',
    ip: '192.168.1.200',
    fechaHora: '20/06/2026 09:45:00',
    dispositivo: 'Chrome 124 / Windows 11',
    detalles: 'Documento aprobado en flujo de revisión. Nivel: Jefe de Área. Comentario: "Aprobado sin observaciones".',
    area: 'Operaciones',
  },
  {
    id: 'AUD-2026-007',
    accion: 'VERSION_NUEVA',
    documento: 'Reglamento Interno de Trabajo',
    usuario: 'Sandra Patricia López',
    ip: '10.0.1.88',
    fechaHora: '20/06/2026 10:12:44',
    dispositivo: 'Chrome 123 / Windows 10',
    detalles: 'Nueva versión v2.0 creada a partir de v1.0. Versión anterior archivada automáticamente.',
    area: 'RRHH',
  },
  {
    id: 'AUD-2026-008',
    accion: 'RECHAZO',
    documento: 'Formato Evaluación de Desempeño 2026',
    usuario: 'Andrés Felipe Castro',
    ip: '192.168.3.44',
    fechaHora: '20/06/2026 10:30:21',
    dispositivo: 'Edge 124 / Windows 11',
    detalles: 'Documento rechazado en flujo de aprobación. Motivo: "Requiere ajuste en sección de competencias".',
    area: 'RRHH',
  },
  {
    id: 'AUD-2026-009',
    accion: 'DESCARGA',
    documento: 'SOAT Camión Kenworth TT-984',
    usuario: 'Diana Carolina Ruiz',
    ip: '192.168.1.67',
    fechaHora: '20/06/2026 10:55:08',
    dispositivo: 'Firefox 125 / Ubuntu',
    detalles: 'Descarga solicitada por módulo FMS. Integración automática. Sin marca de agua (uso interno).',
    area: 'Flota',
    tamaño: '1.2 MB',
  },
  {
    id: 'AUD-2026-010',
    accion: 'CREACION',
    documento: 'Procedimiento SST-045 Trabajo en Alturas',
    usuario: 'Héctor Manuel Vargas',
    ip: '172.16.1.33',
    fechaHora: '20/06/2026 11:20:15',
    dispositivo: 'Chrome 124 / Windows 11',
    detalles: 'Documento creado en borrador. Categoría: SST / Procedimientos operativos. Requiere aprobación Jefe SST.',
    area: 'SST',
    tamaño: '3.1 MB',
  },
  {
    id: 'AUD-2026-011',
    accion: 'VISUALIZACION',
    documento: 'Licencia Conducción Carlos Ramírez',
    usuario: 'Sistema TMS',
    ip: '10.0.0.1',
    fechaHora: '20/06/2026 11:35:44',
    dispositivo: 'Servicio Automatizado / API v2',
    detalles: 'Consulta automática desde módulo TMS. Verificación de vigencia previo a asignación de viaje #VJ-8834.',
    area: 'Sistema',
  },
  {
    id: 'AUD-2026-012',
    accion: 'MODIFICACION',
    documento: 'Contrato Proveedor Transportes Rápidos SAS',
    usuario: 'Gloria Inés Morales',
    ip: '192.168.2.88',
    fechaHora: '20/06/2026 12:04:22',
    dispositivo: 'Chrome 124 / Windows 11',
    detalles: 'Actualización de cláusula 8: Tarifas y condiciones. Versión anterior respaldada. Requiere nueva firma.',
    area: 'Jurídico',
  },
  {
    id: 'AUD-2026-013',
    accion: 'FIRMA',
    documento: 'Acta de Entrega Mercancía — Almacenes La 14',
    usuario: 'Pedro Julio Martínez',
    ip: '192.168.4.12',
    fechaHora: '20/06/2026 12:45:11',
    dispositivo: 'Chrome 124 / Android 14',
    detalles: 'Firma digital desde dispositivo móvil. POD registrado. Coordenadas GPS: 4.7110, -74.0721.',
    area: 'Operaciones',
  },
  {
    id: 'AUD-2026-014',
    accion: 'ELIMINACION',
    documento: 'Borrador Cotización Descartada — Maicao',
    usuario: 'Valentina Ospina',
    ip: '10.0.2.15',
    fechaHora: '20/06/2026 13:10:55',
    dispositivo: 'Safari / macOS Sonoma',
    detalles: 'Documento movido a papelera. Retención: 90 días. Motivo: cotización no aprobada por cliente.',
    area: 'Comercial',
  },
  {
    id: 'AUD-2026-015',
    accion: 'APROBACION',
    documento: 'Manual de Mantenimiento Preventivo Flota',
    usuario: 'Camilo Augusto Jiménez',
    ip: '192.168.1.155',
    fechaHora: '20/06/2026 13:28:39',
    dispositivo: 'Edge 124 / Windows 11',
    detalles: 'Aprobación final nivel Gerencia. Documento listo para publicación. Notificaciones enviadas a 12 usuarios.',
    area: 'Flota',
  },
]

const ACCIONES_CONFIG: Record<Accion, { label: string; color: string; icon: React.ReactNode }> = {
  CREACION: { label: 'Creación', color: '#16a34a', icon: <AddCircle fontSize="small" /> },
  VISUALIZACION: { label: 'Visualización', color: '#6b7280', icon: <Visibility fontSize="small" /> },
  DESCARGA: { label: 'Descarga', color: '#2563eb', icon: <CloudDownload fontSize="small" /> },
  MODIFICACION: { label: 'Modificación', color: '#ea580c', icon: <Edit fontSize="small" /> },
  ELIMINACION: { label: 'Eliminación', color: '#dc2626', icon: <DeleteForever fontSize="small" /> },
  FIRMA: { label: 'Firma', color: '#0d9488', icon: <Draw fontSize="small" /> },
  APROBACION: { label: 'Aprobación', color: '#15803d', icon: <CheckCircle fontSize="small" /> },
  RECHAZO: { label: 'Rechazo', color: '#b91c1c', icon: <Cancel fontSize="small" /> },
  VERSION_NUEVA: { label: 'Nueva Versión', color: '#7c3aed', icon: <NewReleases fontSize="small" /> },
}

const EVENTOS_STREAM = [
  { accion: 'VISUALIZACION' as Accion, texto: 'Carlos R. visualizó "Política SST"', hora: 'hace 10 seg' },
  { accion: 'FIRMA' as Accion, texto: 'Luisa M. firmó "Acuerdo Confidencialidad"', hora: 'hace 45 seg' },
  { accion: 'DESCARGA' as Accion, texto: 'María H. descargó "Certificado BASC"', hora: 'hace 1 min' },
  { accion: 'APROBACION' as Accion, texto: 'Ricardo S. aprobó "Procedimiento Carga"', hora: 'hace 2 min' },
  { accion: 'CREACION' as Accion, texto: 'Ana T. creó "Contrato Éxito 2026"', hora: 'hace 3 min' },
]

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{ borderRadius: 2, borderTop: `3px solid ${color}` }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), color }}>{icon}</Avatar>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMSAuditoria() {
  const [search, setSearch] = useState('')
  const [accionFilter, setAccionFilter] = useState<string>('TODAS')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [streamEvents, setStreamEvents] = useState(EVENTOS_STREAM)
  const [streamTick, setStreamTick] = useState(0)

  // Simulate live stream
  useEffect(() => {
    const interval = setInterval(() => {
      setStreamTick(t => t + 1)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const allEvents = [
      { accion: 'MODIFICACION' as Accion, texto: 'Jorge G. modificó "Manual TMS"', hora: 'ahora' },
      { accion: 'VERSION_NUEVA' as Accion, texto: 'Sandra L. creó nueva versión de "RIT"', hora: 'ahora' },
      { accion: 'RECHAZO' as Accion, texto: 'Andrés C. rechazó "Evaluación Desempeño"', hora: 'ahora' },
      { accion: 'FIRMA' as Accion, texto: 'Pedro M. firmó "Acta Entrega La 14"', hora: 'ahora' },
      { accion: 'DESCARGA' as Accion, texto: 'TMS descargó "Licencia Carlos Ramírez"', hora: 'ahora' },
    ]
    setStreamEvents(prev => {
      const next = [allEvents[streamTick % allEvents.length], ...prev.slice(0, 4)]
      return next
    })
  }, [streamTick])

  const filtered = AUDITORIA_ROWS.filter(r => {
    const matchSearch =
      r.documento.toLowerCase().includes(search.toLowerCase()) ||
      r.usuario.toLowerCase().includes(search.toLowerCase())
    const matchAccion = accionFilter === 'TODAS' || r.accion === accionFilter
    return matchSearch && matchAccion
  })

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
              <Security sx={{ color: DMS_COLOR, fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700}>
                Auditoría DMS
              </Typography>
              <Chip
                label="INMUTABLE — Registro permanente e inalterable"
                size="small"
                sx={{ bgcolor: alpha('#dc2626', 0.1), color: '#dc2626', fontWeight: 700, fontSize: '0.65rem' }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Trazabilidad completa de todas las acciones sobre documentos del sistema
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            sx={{ borderColor: DMS_COLOR, color: DMS_COLOR }}
            onClick={() => alert('Exportando log de auditoría...')}
          >
            Exportar Log
          </Button>
        </Stack>

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard label="Acciones hoy" value="47" icon={<Article />} color={DMS_COLOR} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard label="Acciones este mes" value="1,243" icon={<AccessTime />} color="#7c3aed" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard label="Usuarios activos hoy" value="18" icon={<Person />} color="#059669" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard label="Descargas hoy" value="12" icon={<CloudDownload />} color="#2563eb" />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Main audit table */}
          <Grid size={{ xs: 12, md: 9 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ pb: 0 }}>
                {/* Filters */}
                <Stack direction="row" gap={2} mb={2} flexWrap="wrap">
                  <TextField
                    size="small"
                    placeholder="Buscar por documento o usuario..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    sx={{ minWidth: 280, flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Acción</InputLabel>
                    <Select
                      value={accionFilter}
                      label="Acción"
                      onChange={e => setAccionFilter(e.target.value)}
                    >
                      <MenuItem value="TODAS">Todas</MenuItem>
                      {Object.entries(ACCIONES_CONFIG).map(([key, cfg]) => (
                        <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} defaultValue="2026-06-20" />
                  <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} defaultValue="2026-06-20" />
                </Stack>

                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.06), whiteSpace: 'nowrap' } }}>
                        <TableCell>ID</TableCell>
                        <TableCell>Acción</TableCell>
                        <TableCell>Documento</TableCell>
                        <TableCell>Usuario</TableCell>
                        <TableCell>IP</TableCell>
                        <TableCell>Fecha/Hora</TableCell>
                        <TableCell>Dispositivo</TableCell>
                        <TableCell align="center">Detalles</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map(row => {
                        const cfg = ACCIONES_CONFIG[row.accion]
                        const isExpanded = expandedRow === row.id
                        return (
                          <React.Fragment key={row.id}>
                            <TableRow
                              hover
                              sx={{
                                '& td': { py: 1, fontSize: '0.78rem' },
                                bgcolor: isExpanded ? alpha(DMS_COLOR, 0.04) : 'inherit',
                              }}
                            >
                              <TableCell>
                                <Typography variant="caption" fontFamily="monospace" fontWeight={600} color={DMS_COLOR}>
                                  {row.id}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={cfg.label}
                                  size="small"
                                  icon={cfg.icon as any}
                                  sx={{
                                    bgcolor: alpha(cfg.color, 0.12),
                                    color: cfg.color,
                                    fontWeight: 600,
                                    fontSize: '0.65rem',
                                    '& .MuiChip-icon': { color: cfg.color },
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 220 }}>
                                <Typography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {row.documento}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" alignItems="center" gap={0.5}>
                                  <Person sx={{ fontSize: 14, color: 'text.disabled' }} />
                                  <span>{row.usuario}</span>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" fontFamily="monospace">{row.ip}</Typography>
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.fechaHora}</TableCell>
                              <TableCell sx={{ maxWidth: 160 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                                  {row.dispositivo}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title={isExpanded ? 'Cerrar detalle' : 'Ver detalle completo'}>
                                  <IconButton
                                    size="small"
                                    onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                                    sx={{ color: DMS_COLOR }}
                                  >
                                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                                <Collapse in={isExpanded} unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: alpha(DMS_COLOR, 0.04), borderLeft: `4px solid ${cfg.color}` }}>
                                    <Typography variant="caption" fontWeight={700} color={cfg.color} display="block" mb={1}>
                                      DETALLE COMPLETO DEL EVENTO
                                    </Typography>
                                    <Grid container spacing={2}>
                                      <Grid size={{ xs: 12, md: 8 }}>
                                        <Typography variant="body2">{row.detalles}</Typography>
                                      </Grid>
                                      <Grid size={{ xs: 12, md: 4 }}>
                                        <Stack gap={0.5}>
                                          <Typography variant="caption" color="text.secondary">
                                            <strong>Área:</strong> {row.area}
                                          </Typography>
                                          {row.tamaño && (
                                            <Typography variant="caption" color="text.secondary">
                                              <strong>Tamaño:</strong> {row.tamaño}
                                            </Typography>
                                          )}
                                          <Typography variant="caption" color="text.secondary">
                                            <strong>Registro:</strong> {row.id}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            <strong>Hash:</strong>{' '}
                                            <span style={{ fontFamily: 'monospace' }}>
                                              {btoa(row.id).substring(0, 16)}...
                                            </span>
                                          </Typography>
                                        </Stack>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Box>
                <Box sx={{ py: 1.5, borderTop: '1px solid', borderColor: 'divider', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Mostrando {filtered.length} de {AUDITORIA_ROWS.length} registros · Orden: más reciente primero
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Live event stream panel */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ borderRadius: 2, position: 'sticky', top: 16 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" gap={1} mb={2}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#16a34a',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                        '50%': { opacity: 0.5, transform: 'scale(1.4)' },
                      },
                    }}
                  />
                  <Typography variant="subtitle2" fontWeight={700}>Últimos Eventos</Typography>
                  <Chip label="EN VIVO" size="small" sx={{ ml: 'auto', bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontSize: '0.6rem', fontWeight: 700 }} />
                </Stack>
                <Stack gap={1.5}>
                  {streamEvents.map((ev, idx) => {
                    const cfg = ACCIONES_CONFIG[ev.accion]
                    return (
                      <Box
                        key={idx}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: alpha(cfg.color, 0.06),
                          borderLeft: `3px solid ${cfg.color}`,
                          opacity: 1 - idx * 0.12,
                          transition: 'all 0.5s ease',
                        }}
                      >
                        <Stack direction="row" alignItems="center" gap={0.5} mb={0.5}>
                          <Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>
                          <Chip
                            label={cfg.label}
                            size="small"
                            sx={{ bgcolor: 'transparent', color: cfg.color, fontWeight: 700, fontSize: '0.6rem', height: 18, px: 0 }}
                          />
                        </Stack>
                        <Typography variant="caption" display="block" color="text.primary" sx={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                          {ev.texto}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                          {idx === 0 ? ev.hora : EVENTOS_STREAM[idx]?.hora ?? ev.hora}
                        </Typography>
                      </Box>
                    )
                  })}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                  <Computer sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                  Actualización automática cada 4 seg
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
