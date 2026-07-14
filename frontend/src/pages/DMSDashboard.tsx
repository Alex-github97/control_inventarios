import React, { useState, useEffect } from 'react'
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
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Description,
  CheckCircle,
  Warning,
  Schedule,
  Draw,
  Shield,
  FolderOpen,
  AccountCircle,
  Visibility,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Mock data ────────────────────────────────────────────────────────────────

const DOCUMENTOS_RECIENTES = [
  { codigo: 'DOC-2024-001', nombre: 'Contrato Marco Servicios Logísticos', tipo: 'Contrato', estado: 'PUBLICADO', version: 'v3.1', area: 'Comercial', fecha: '15/06/2026' },
  { codigo: 'DOC-2024-002', nombre: 'Política de Seguridad Vial', tipo: 'Política', estado: 'EN_REVISION', version: 'v2.0', area: 'SST', fecha: '14/06/2026' },
  { codigo: 'DOC-2024-003', nombre: 'Manual de Procedimientos TMS', tipo: 'Manual', estado: 'APROBADO', version: 'v1.4', area: 'Operaciones', fecha: '13/06/2026' },
  { codigo: 'DOC-2024-004', nombre: 'Acuerdo de Confidencialidad Proveedor Bogotá', tipo: 'Acuerdo', estado: 'BORRADOR', version: 'v1.0', area: 'Jurídico', fecha: '12/06/2026' },
  { codigo: 'DOC-2024-005', nombre: 'Procedimiento de Carga y Descarga', tipo: 'Procedimiento', estado: 'PUBLICADO', version: 'v5.2', area: 'Operaciones', fecha: '11/06/2026' },
  { codigo: 'DOC-2024-006', nombre: 'Reglamento Interno de Trabajo', tipo: 'Reglamento', estado: 'OBSOLETO', version: 'v1.0', area: 'RRHH', fecha: '10/06/2026' },
  { codigo: 'DOC-2024-007', nombre: 'Certificado BASC 2026', tipo: 'Certificado', estado: 'PUBLICADO', version: 'v1.0', area: 'Calidad', fecha: '09/06/2026' },
  { codigo: 'DOC-2024-008', nombre: 'Formato de Inspección Vehículos', tipo: 'Formato', estado: 'ARCHIVADO', version: 'v4.0', area: 'Flota', fecha: '08/06/2026' },
]

const ALERTAS = [
  { id: 1, tipo: 'vencido', doc: 'SOAT-TK-4521', msg: 'SOAT Tracto Kenworth placa TUL-431 — vencido hace 3 días', nivel: 'error' },
  { id: 2, tipo: 'proximo', doc: 'RTM-2024-087', msg: 'Revisión Técnico-Mecánica vence en 8 días — placa SJC-902', nivel: 'warning' },
  { id: 3, tipo: 'proximo', doc: 'LIC-CON-2234', msg: 'Licencia conductor Pedro Ramírez vence en 15 días', nivel: 'warning' },
  { id: 4, tipo: 'vencido', doc: 'SEG-LOC-001', msg: 'Póliza seguro bodega principal vencida — renovar urgente', nivel: 'error' },
  { id: 5, tipo: 'proximo', doc: 'CERT-ISO-2026', msg: 'Certificación ISO 9001 vence en 28 días — agendar auditoría', nivel: 'warning' },
]

const ACTIVIDAD_RECIENTE = [
  { id: 1, usuario: 'María González', inicial: 'MG', color: '#7C3AED', accion: 'Aprobó', doc: 'Manual de Operaciones v2.1', tiempo: 'Hace 12 min' },
  { id: 2, usuario: 'Carlos Moreno', inicial: 'CM', color: '#0E7490', accion: 'Firmó', doc: 'Contrato Distribución Medellín', tiempo: 'Hace 35 min' },
  { id: 3, usuario: 'Ana Rodríguez', inicial: 'AR', color: '#16A34A', accion: 'Subió', doc: 'SOAT Tracto-Camión placa SBC-112', tiempo: 'Hace 1h' },
  { id: 4, usuario: 'Luis Peña', inicial: 'LP', color: '#D97706', accion: 'Creó', doc: 'Acuerdo Servicio Cliente Éxito S.A.', tiempo: 'Hace 2h' },
  { id: 5, usuario: 'Sandra Torres', inicial: 'ST', color: '#DC2626', accion: 'Rechazó', doc: 'Procedimiento Despacho Urgente v1.0', tiempo: 'Hace 3h' },
  { id: 6, usuario: 'Jhon Vargas', inicial: 'JV', color: '#0891B2', accion: 'Publicó', doc: 'Política de Gestión Ambiental 2026', tiempo: 'Hace 4h' },
]

const CATEGORIAS_CHART = [
  { nombre: 'Contratos', cantidad: 412, pct: 100 },
  { nombre: 'Vehículos', cantidad: 387, pct: 94 },
  { nombre: 'Conductores', cantidad: 298, pct: 72 },
  { nombre: 'RR.HH.', cantidad: 276, pct: 67 },
  { nombre: 'Financiero', cantidad: 254, pct: 62 },
  { nombre: 'Calidad', cantidad: 143, pct: 35 },
  { nombre: 'Operaciones', cantidad: 77, pct: 19 },
]

const WORKFLOWS = [
  { id: 1, nombre: 'Aprobación Contrato Distribución', etapa: 'Revisión Jurídica', progreso: 60, pendiente: 'Dra. Andrea Castro' },
  { id: 2, nombre: 'Actualización Manual Operaciones', etapa: 'Firma Gerencia', progreso: 80, pendiente: 'Ing. Roberto Sánchez' },
  { id: 3, nombre: 'Renovación Póliza Vehículos', etapa: 'Aprobación Finanzas', progreso: 40, pendiente: 'Contador Principal' },
  { id: 4, nombre: 'Certificación Operador BASC', etapa: 'Documentación', progreso: 20, pendiente: 'Área de Calidad' },
]

// ─── Estado chip colors ───────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  BORRADOR:    { label: 'Borrador',    bg: '#F3F4F6', color: '#6B7280' },
  EN_REVISION: { label: 'En Revisión', bg: alpha('#D97706', 0.12), color: '#D97706' },
  APROBADO:    { label: 'Aprobado',    bg: alpha('#2563EB', 0.12), color: '#2563EB' },
  PUBLICADO:   { label: 'Publicado',   bg: alpha('#16A34A', 0.12), color: '#16A34A' },
  OBSOLETO:    { label: 'Obsoleto',    bg: alpha('#DC2626', 0.12), color: '#DC2626' },
  ARCHIVADO:   { label: 'Archivado',   bg: alpha('#92400E', 0.12), color: '#92400E' },
}

function EstadoChip({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ fontSize: 10, fontWeight: 700, bgcolor: cfg.bg, color: cfg.color, border: 'none' }}
    />
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPIProps {
  label: string
  value: string
  icon: React.ReactElement
  color: string
  sublabel?: string
}

function KPICard({ label, value, icon, color, sublabel }: KPIProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        p: 2.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography fontSize={36} fontWeight={800} color={color} lineHeight={1.1}>
            {value}
          </Typography>
          <Typography fontSize={12} color="text.secondary" mt={0.5} fontWeight={600}>
            {label}
          </Typography>
          {sublabel && (
            <Typography fontSize={11} color="text.disabled" mt={0.25}>
              {sublabel}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '11px',
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 22, color } })}
        </Box>
      </Stack>
    </Paper>
  )
}

// ─── Blinking badge ───────────────────────────────────────────────────────────

function LiveBadge() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <Chip
      label="EN VIVO"
      size="small"
      sx={{
        fontSize: 10,
        fontWeight: 800,
        height: 22,
        bgcolor: visible ? alpha(DMS_COLOR, 0.15) : 'transparent',
        color: DMS_COLOR,
        border: `1.5px solid ${DMS_COLOR}`,
        transition: 'background-color 0.4s',
        letterSpacing: '0.05em',
      }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DMSDashboard() {
  return (
    <Layout title="DMS — Dashboard">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '11px',
                bgcolor: alpha(DMS_COLOR, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Description sx={{ color: DMS_COLOR, fontSize: 24 }} />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography fontSize={22} fontWeight={800} color="text.primary">
                  Document Management System
                </Typography>
                <Chip
                  label="DMS"
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 800, height: 22, bgcolor: DMS_COLOR, color: '#fff' }}
                />
                <LiveBadge />
              </Stack>
              <Typography fontSize={12} color="text.secondary">
                Gestión documental empresarial — Icoltrans S.A.S.
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Total Documentos" value="1.847" icon={<Description />} color={DMS_COLOR} sublabel="En el repositorio" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Documentos Activos" value="1.203" icon={<CheckCircle />} color="#16A34A" sublabel="Vigentes y publicados" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Documentos Vencidos" value="23" icon={<Warning />} color="#DC2626" sublabel="Requieren renovación" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Próximos a Vencer" value="67" icon={<Schedule />} color="#D97706" sublabel="Menos de 30 días" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Firmas Pendientes" value="14" icon={<Draw />} color="#2563EB" sublabel="Esperando firma digital" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Cumplimiento" value="91.4%" icon={<Shield />} color={DMS_COLOR} sublabel="Índice documental" />
          </Grid>
        </Grid>

        {/* ── Tabla Documentos Recientes ────────────────────────────────── */}
        <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
              <Typography fontWeight={700} fontSize={15}>
                Documentos Recientes
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Últimas modificaciones en el repositorio documental
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1.25, bgcolor: '#FAFAFA' } }}>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Versión</TableCell>
                    <TableCell>Área</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DOCUMENTOS_RECIENTES.map((doc) => (
                    <TableRow key={doc.codigo} hover sx={{ '& td': { fontSize: 12, py: 1 } }}>
                      <TableCell sx={{ fontWeight: 700, color: DMS_COLOR, fontFamily: 'monospace' }}>{doc.codigo}</TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography fontSize={12} noWrap>{doc.nombre}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={11} color="text.secondary">{doc.tipo}</Typography>
                      </TableCell>
                      <TableCell><EstadoChip estado={doc.estado} /></TableCell>
                      <TableCell>
                        <Chip label={doc.version} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(DMS_COLOR, 0.08), color: DMS_COLOR, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>{doc.area}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{doc.fecha}</TableCell>
                      <TableCell>
                        <Visibility sx={{ fontSize: 16, color: 'text.disabled', cursor: 'pointer', '&:hover': { color: DMS_COLOR } }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        {/* ── Fila inferior: Alertas + Actividad ────────────────────────── */}
        <Grid container spacing={2}>
          {/* Alertas Documentales */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={700} fontSize={15} mb={2}>
                  Alertas Documentales
                </Typography>
                <Stack spacing={1.5}>
                  {ALERTAS.map((a) => (
                    <Box
                      key={a.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: '10px',
                        borderLeft: `4px solid ${a.nivel === 'error' ? '#DC2626' : '#D97706'}`,
                        bgcolor: a.nivel === 'error' ? alpha('#DC2626', 0.04) : alpha('#D97706', 0.04),
                        border: `1px solid ${a.nivel === 'error' ? alpha('#DC2626', 0.2) : alpha('#D97706', 0.2)}`,
                        borderLeftWidth: 4,
                      }}
                    >
                      <Warning sx={{ fontSize: 18, color: a.nivel === 'error' ? '#DC2626' : '#D97706', flexShrink: 0 }} />
                      <Typography fontSize={12} flex={1} color="text.primary">{a.msg}</Typography>
                      <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 'unset', color: a.nivel === 'error' ? '#DC2626' : '#D97706', borderColor: a.nivel === 'error' ? '#DC2626' : '#D97706' }}>
                        Ver
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Actividad Reciente */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={700} fontSize={15} mb={1}>
                  Actividad Reciente
                </Typography>
                <List dense disablePadding>
                  {ACTIVIDAD_RECIENTE.map((ev, idx) => (
                    <React.Fragment key={ev.id}>
                      <ListItem disableGutters alignItems="flex-start" sx={{ py: 1 }}>
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Avatar sx={{ width: 34, height: 34, bgcolor: ev.color, fontSize: 13, fontWeight: 700 }}>
                            {ev.inicial}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography fontSize={12} color="text.primary">
                              <strong>{ev.usuario}</strong> {ev.accion}{' '}
                              <span style={{ color: DMS_COLOR }}>{ev.doc}</span>
                            </Typography>
                          }
                          secondary={
                            <Typography fontSize={11} color="text.disabled">{ev.tiempo}</Typography>
                          }
                        />
                      </ListItem>
                      {idx < ACTIVIDAD_RECIENTE.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Sección inferior: Categorías + Workflows ──────────────────── */}
        <Grid container spacing={2}>
          {/* Documentos por Categoría */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={700} fontSize={15} mb={2}>
                  Documentos por Categoría
                </Typography>
                <Stack spacing={1.5}>
                  {CATEGORIAS_CHART.map((cat) => (
                    <Box key={cat.nombre}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography fontSize={12} fontWeight={600}>{cat.nombre}</Typography>
                        <Typography fontSize={12} color="text.secondary">{cat.cantidad}</Typography>
                      </Stack>
                      <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#F3F4F6', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${cat.pct}%`,
                            borderRadius: 4,
                            bgcolor: DMS_COLOR,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Workflows Activos */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={700} fontSize={15} mb={2}>
                  Workflows Activos
                </Typography>
                <Stack spacing={2}>
                  {WORKFLOWS.map((wf) => (
                    <Box key={wf.id} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
                        <Typography fontSize={12} fontWeight={600} flex={1}>{wf.nombre}</Typography>
                        <Chip label={`${wf.progreso}%`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 700 }} />
                      </Stack>
                      <Typography fontSize={11} color="text.secondary" mb={0.75}>
                        Etapa: <strong>{wf.etapa}</strong> — Pendiente: {wf.pendiente}
                      </Typography>
                      <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#F3F4F6', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${wf.progreso}%`, borderRadius: 3, bgcolor: DMS_COLOR }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      </Box>
    </Layout>
  )
}
