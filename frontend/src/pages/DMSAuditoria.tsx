import React, { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Security,
  Search,
  Download,
  ExpandMore,
  ExpandLess,
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
  Print,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { exportarExcel } from '@/utils/exportar'
import toast from 'react-hot-toast'

const DMS_COLOR = '#0E7490'

// ─── Config de acciones ─────────────────────────────────────────────────────────

const ACCIONES_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREACION:      { label: 'Creación',      color: '#16a34a', icon: <AddCircle fontSize="small" /> },
  VISUALIZACION: { label: 'Visualización', color: '#6b7280', icon: <Visibility fontSize="small" /> },
  DESCARGA:      { label: 'Descarga',      color: '#2563eb', icon: <CloudDownload fontSize="small" /> },
  MODIFICACION:  { label: 'Modificación',  color: '#ea580c', icon: <Edit fontSize="small" /> },
  ELIMINACION:   { label: 'Eliminación',   color: '#dc2626', icon: <DeleteForever fontSize="small" /> },
  FIRMA:         { label: 'Firma',         color: '#0d9488', icon: <Draw fontSize="small" /> },
  APROBACION:    { label: 'Aprobación',    color: '#15803d', icon: <CheckCircle fontSize="small" /> },
  RECHAZO:       { label: 'Rechazo',       color: '#b91c1c', icon: <Cancel fontSize="small" /> },
  VERSION_NUEVA: { label: 'Nueva Versión', color: '#7c3aed', icon: <NewReleases fontSize="small" /> },
  IMPRESION:     { label: 'Impresión',     color: '#9333ea', icon: <Print fontSize="small" /> },
}
const cfgAccion = (a: string) => ACCIONES_CONFIG[a] ?? { label: a, color: '#6b7280', icon: <Article fontSize="small" /> }

interface AuditApi {
  id: number
  documento_id?: number | null
  version_id?: number | null
  usuario_id?: number | null
  accion: string
  detalle?: string | null
  ip_origen?: string | null
  user_agent?: string | null
  created_at?: string | null
}

const fmtFechaHora = (s?: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const esHoy = (s?: string | null): boolean => {
  if (!s) return false
  const d = new Date(s); const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}
const esEsteMes = (s?: string | null): boolean => {
  if (!s) return false
  const d = new Date(s); const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}

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
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const { data: audit = [], isLoading } = useQuery<AuditApi[]>({
    queryKey: ['dms-auditoria'],
    queryFn: () => apiClient.get('/dms/auditoria', { params: { limit: 300 } }).then((r) => r.data),
    refetchInterval: 15000,
  })
  const { data: usuarios = [] } = useQuery<any[]>({
    queryKey: ['usuarios-map'],
    queryFn: () => apiClient.get('/usuarios/').then((r) => r.data),
  })
  const { data: documentos = [] } = useQuery<any[]>({
    queryKey: ['dms-docs-map'],
    queryFn: () => apiClient.get('/dms/documentos', { params: { per_page: 200 } }).then((r) => r.data),
  })

  const userMap = useMemo(() => {
    const m = new Map<number, string>()
    usuarios.forEach((u) => m.set(u.id, `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.username || `Usuario #${u.id}`))
    return m
  }, [usuarios])
  const docMap = useMemo(() => {
    const m = new Map<number, string>()
    documentos.forEach((d) => m.set(d.id, d.nombre))
    return m
  }, [documentos])

  const rows = useMemo(() => audit.map((a) => ({
    id: a.id,
    codigo: `AUD-${String(a.id).padStart(6, '0')}`,
    accion: a.accion,
    documento: a.documento_id ? (docMap.get(a.documento_id) || `Documento #${a.documento_id}`) : '—',
    usuario: a.usuario_id ? (userMap.get(a.usuario_id) || `Usuario #${a.usuario_id}`) : 'Sistema',
    ip: a.ip_origen || '—',
    fechaHora: fmtFechaHora(a.created_at),
    dispositivo: a.user_agent || '—',
    detalles: a.detalle || 'Sin detalle registrado.',
    createdAt: a.created_at,
  })), [audit, docMap, userMap])

  const kpis = useMemo(() => {
    const hoy = audit.filter((a) => esHoy(a.created_at))
    const mes = audit.filter((a) => esEsteMes(a.created_at))
    const usuariosHoy = new Set(hoy.map((a) => a.usuario_id).filter(Boolean))
    const descargasHoy = hoy.filter((a) => a.accion === 'DESCARGA').length
    return { hoy: hoy.length, mes: mes.length, usuariosHoy: usuariosHoy.size, descargasHoy }
  }, [audit])

  const filtered = rows.filter((r) => {
    const s = search.toLowerCase()
    const matchSearch = r.documento.toLowerCase().includes(s) || r.usuario.toLowerCase().includes(s)
    const matchAccion = accionFilter === 'TODAS' || r.accion === accionFilter
    return matchSearch && matchAccion
  })

  const stream = rows.slice(0, 6)

  const exportar = () => {
    if (!filtered.length) { toast.error('No hay registros para exportar'); return }
    exportarExcel({
      archivo: 'auditoria_dms',
      titulo: 'Auditoría DMS',
      filas: filtered.map((r) => ({ registro: r.codigo, accion: cfgAccion(r.accion).label, documento: r.documento, usuario: r.usuario, ip: r.ip, fecha_hora: r.fechaHora, dispositivo: r.dispositivo, detalle: r.detalles })),
      color: DMS_COLOR,
    })
    toast.success('Log exportado')
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
              <Security sx={{ color: DMS_COLOR, fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700}>Auditoría DMS</Typography>
              <Chip label="INMUTABLE — Registro permanente e inalterable" size="small" sx={{ bgcolor: alpha('#dc2626', 0.1), color: '#dc2626', fontWeight: 700, fontSize: '0.65rem' }} />
            </Stack>
            <Typography variant="body2" color="text.secondary">Trazabilidad completa de todas las acciones sobre documentos del sistema</Typography>
          </Box>
          <Button variant="outlined" startIcon={<Download />} sx={{ borderColor: DMS_COLOR, color: DMS_COLOR }} onClick={exportar}>Exportar Log</Button>
        </Stack>

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Acciones hoy" value={kpis.hoy} icon={<Article />} color={DMS_COLOR} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Acciones este mes" value={kpis.mes.toLocaleString('es-CO')} icon={<AccessTime />} color="#7c3aed" /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Usuarios activos hoy" value={kpis.usuariosHoy} icon={<Person />} color="#059669" /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Descargas hoy" value={kpis.descargasHoy} icon={<CloudDownload />} color="#2563eb" /></Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Main audit table */}
          <Grid size={{ xs: 12, md: 9 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ pb: 0 }}>
                {/* Filters */}
                <Stack direction="row" gap={2} mb={2} flexWrap="wrap">
                  <TextField size="small" placeholder="Buscar por documento o usuario..." value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }} sx={{ minWidth: 280, flex: 1 }} />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Acción</InputLabel>
                    <Select value={accionFilter} label="Acción" onChange={(e) => setAccionFilter(e.target.value)}>
                      <MenuItem value="TODAS">Todas</MenuItem>
                      {Object.entries(ACCIONES_CONFIG).map(([key, cfg]) => <MenuItem key={key} value={key}>{cfg.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>

                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.06), whiteSpace: 'nowrap' } }}>
                        <TableCell>Registro</TableCell>
                        <TableCell>Acción</TableCell>
                        <TableCell>Documento</TableCell>
                        <TableCell>Usuario</TableCell>
                        <TableCell>IP</TableCell>
                        <TableCell>Fecha/Hora</TableCell>
                        <TableCell align="center">Detalles</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress size={26} /></TableCell></TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          {rows.length === 0 ? 'Aún no hay eventos de auditoría registrados.' : 'No hay registros con los filtros aplicados.'}
                        </TableCell></TableRow>
                      ) : filtered.map((row) => {
                        const cfg = cfgAccion(row.accion)
                        const isExpanded = expandedRow === row.id
                        return (
                          <React.Fragment key={row.id}>
                            <TableRow hover sx={{ '& td': { py: 1, fontSize: '0.78rem' }, bgcolor: isExpanded ? alpha(DMS_COLOR, 0.04) : 'inherit' }}>
                              <TableCell><Typography variant="caption" fontFamily="monospace" fontWeight={600} color={DMS_COLOR}>{row.codigo}</Typography></TableCell>
                              <TableCell>
                                <Chip label={cfg.label} size="small" icon={cfg.icon as any}
                                  sx={{ bgcolor: alpha(cfg.color, 0.12), color: cfg.color, fontWeight: 600, fontSize: '0.65rem', '& .MuiChip-icon': { color: cfg.color } }} />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 240 }}>
                                <Typography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.documento}</Typography>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" alignItems="center" gap={0.5}>
                                  <Person sx={{ fontSize: 14, color: 'text.disabled' }} />
                                  <span>{row.usuario}</span>
                                </Stack>
                              </TableCell>
                              <TableCell><Typography variant="caption" fontFamily="monospace">{row.ip}</Typography></TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.fechaHora}</TableCell>
                              <TableCell align="center">
                                <Tooltip title={isExpanded ? 'Cerrar detalle' : 'Ver detalle completo'}>
                                  <IconButton size="small" onClick={() => setExpandedRow(isExpanded ? null : row.id)} sx={{ color: DMS_COLOR }}>
                                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                                <Collapse in={isExpanded} unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: alpha(DMS_COLOR, 0.04), borderLeft: `4px solid ${cfg.color}` }}>
                                    <Typography variant="caption" fontWeight={700} color={cfg.color} display="block" mb={1}>DETALLE COMPLETO DEL EVENTO</Typography>
                                    <Grid container spacing={2}>
                                      <Grid size={{ xs: 12, md: 8 }}><Typography variant="body2">{row.detalles}</Typography></Grid>
                                      <Grid size={{ xs: 12, md: 4 }}>
                                        <Stack gap={0.5}>
                                          <Typography variant="caption" color="text.secondary"><strong>Dispositivo:</strong> {row.dispositivo}</Typography>
                                          <Typography variant="caption" color="text.secondary"><strong>Registro:</strong> {row.codigo}</Typography>
                                          <Typography variant="caption" color="text.secondary"><strong>Hash:</strong>{' '}<span style={{ fontFamily: 'monospace' }}>{btoa(row.codigo).substring(0, 16)}...</span></Typography>
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
                  <Typography variant="caption" color="text.secondary">Mostrando {filtered.length} de {rows.length} registros · Orden: más reciente primero</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Live event stream panel */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ borderRadius: 2, position: 'sticky', top: 16 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" gap={1} mb={2}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a', animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(1.4)' } } }} />
                  <Typography variant="subtitle2" fontWeight={700}>Últimos Eventos</Typography>
                  <Chip label="EN VIVO" size="small" sx={{ ml: 'auto', bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontSize: '0.6rem', fontWeight: 700 }} />
                </Stack>
                <Stack gap={1.5}>
                  {stream.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">Sin eventos recientes.</Typography>
                  ) : stream.map((ev, idx) => {
                    const cfg = cfgAccion(ev.accion)
                    return (
                      <Box key={ev.id} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(cfg.color, 0.06), borderLeft: `3px solid ${cfg.color}`, opacity: 1 - idx * 0.1, transition: 'all 0.5s ease' }}>
                        <Stack direction="row" alignItems="center" gap={0.5} mb={0.5}>
                          <Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>
                          <Chip label={cfg.label} size="small" sx={{ bgcolor: 'transparent', color: cfg.color, fontWeight: 700, fontSize: '0.6rem', height: 18, px: 0 }} />
                        </Stack>
                        <Typography variant="caption" display="block" color="text.primary" sx={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                          {ev.usuario} · {ev.documento}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>{ev.fechaHora}</Typography>
                      </Box>
                    )
                  })}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                  <Computer sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                  Actualización automática cada 15 seg
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
