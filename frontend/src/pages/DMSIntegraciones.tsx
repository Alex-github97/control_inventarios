import React, { useState } from 'react'
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
  Grid,
  Avatar,
  Button,
  Divider,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import {
  Hub,
  People,
  LocalShipping,
  DirectionsCar,
  Warehouse,
  Groups,
  ShoppingCart,
  AccountBalance,
  VerifiedUser,
  CheckCircle,
  Settings,
  Cancel,
  Sync,
  OpenInNew,
  Article,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoIntegracion = 'CONECTADO' | 'EN_CONFIGURACION' | 'NO_CONECTADO'

interface Modulo {
  id: string
  nombre: string
  sigla: string
  color: string
  estado: EstadoIntegracion
  descripcion: string
  documentos: string[]
  ultimaSync?: string
  cantidadDocs?: number
  icon: React.ReactNode
  pendiente?: string
}

interface DocSincronizado {
  modulo: string
  moduloColor: string
  tipo: string
  nombre: string
  fecha: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MODULOS: Modulo[] = [
  {
    id: 'hcm',
    nombre: 'Gestión Humana',
    sigla: 'HCM',
    color: '#BE185D',
    estado: 'CONECTADO',
    descripcion: 'Expedientes laborales y gestión del talento humano',
    documentos: ['Expedientes laborales', 'Contratos', 'Evaluaciones', 'Incapacidades'],
    ultimaSync: 'hace 5 min',
    cantidadDocs: 234,
    icon: <People />,
  },
  {
    id: 'tms',
    nombre: 'Transportation',
    sigla: 'TMS',
    color: '#0369A1',
    estado: 'CONECTADO',
    descripcion: 'Documentación de transporte y operaciones logísticas',
    documentos: ['Conductores', 'Viajes', 'Remesas', 'POD', 'Manifiestos'],
    ultimaSync: 'hace 12 min',
    cantidadDocs: 567,
    icon: <LocalShipping />,
  },
  {
    id: 'fms',
    nombre: 'Gestión de Flotas',
    sigla: 'FMS',
    color: '#7C3AED',
    estado: 'CONECTADO',
    descripcion: 'Documentación legal y técnica de vehículos',
    documentos: ['SOAT', 'RTM', 'Seguros', 'Mantenimientos'],
    ultimaSync: 'hace 3 min',
    cantidadDocs: 89,
    icon: <DirectionsCar />,
  },
  {
    id: 'wms',
    nombre: 'Warehouse',
    sigla: 'WMS',
    color: '#1E40AF',
    estado: 'CONECTADO',
    descripcion: 'Documentación de bodega y operaciones de almacenamiento',
    documentos: ['Recepciones', 'Despachos', 'Inventarios'],
    ultimaSync: 'hace 8 min',
    cantidadDocs: 145,
    icon: <Warehouse />,
  },
  {
    id: 'crm',
    nombre: 'Clientes',
    sigla: 'CRM',
    color: '#059669',
    estado: 'EN_CONFIGURACION',
    descripcion: 'Contratos y acuerdos con clientes comerciales',
    documentos: ['Contratos clientes', 'Acuerdos comerciales'],
    pendiente: 'Pendiente de configuración — credenciales del módulo CRM requeridas',
    icon: <Groups />,
  },
  {
    id: 'srm',
    nombre: 'Proveedores',
    sigla: 'SRM',
    color: '#D97706',
    estado: 'EN_CONFIGURACION',
    descripcion: 'Certificados y habilitaciones de proveedores',
    documentos: ['Certificados', 'Habilitaciones', 'Contratos'],
    pendiente: 'Pendiente de configuración — mapeo de categorías pendiente',
    icon: <ShoppingCart />,
  },
  {
    id: 'erp',
    nombre: 'Financiero',
    sigla: 'ERP',
    color: '#DC2626',
    estado: 'NO_CONECTADO',
    descripcion: 'Facturas, órdenes de compra y contratos financieros',
    documentos: ['Facturas', 'Órdenes de compra', 'Contratos'],
    pendiente: 'Requiere instalación del módulo ERP',
    icon: <AccountBalance />,
  },
  {
    id: 'qms',
    nombre: 'Calidad',
    sigla: 'QMS',
    color: '#0D9488',
    estado: 'NO_CONECTADO',
    descripcion: 'Procedimientos, instructivos y auditorías de calidad',
    documentos: ['Procedimientos', 'Instructivos', 'Auditorías'],
    pendiente: 'Requiere instalación del módulo QMS',
    icon: <VerifiedUser />,
  },
]

const DOCS_SINCRONIZADOS: DocSincronizado[] = [
  { modulo: 'TMS', moduloColor: '#0369A1', tipo: 'POD', nombre: 'Prueba de Entrega — Viaje VJ-8841 — Carulla Soacha', fecha: '20/06/2026 13:45' },
  { modulo: 'FMS', moduloColor: '#7C3AED', tipo: 'SOAT', nombre: 'SOAT 2026 — Camión Kenworth TT-984 — Placa ZXC-441', fecha: '20/06/2026 13:30' },
  { modulo: 'HCM', moduloColor: '#BE185D', tipo: 'Contrato', nombre: 'Contrato Laboral — Juan David Morales — Conductor C1', fecha: '20/06/2026 13:15' },
  { modulo: 'WMS', moduloColor: '#1E40AF', tipo: 'Recepción', nombre: 'Acta de Recepción — RA-2026-0441 — CEDI Bogotá', fecha: '20/06/2026 12:55' },
  { modulo: 'TMS', moduloColor: '#0369A1', tipo: 'Manifiesto', nombre: 'Manifiesto de Carga — MF-2026-3301 — Ruta Bogotá–Medellín', fecha: '20/06/2026 12:40' },
  { modulo: 'HCM', moduloColor: '#BE185D', tipo: 'Incapacidad', nombre: 'Incapacidad Médica — Pedro Álvarez — 5 días — EPS Sura', fecha: '20/06/2026 12:20' },
  { modulo: 'FMS', moduloColor: '#7C3AED', tipo: 'RTM', nombre: 'Revisión Técnico-Mecánica — Placa TYU-882 — Vigente 2027', fecha: '20/06/2026 12:00' },
  { modulo: 'WMS', moduloColor: '#1E40AF', tipo: 'Despacho', nombre: 'Guía de Despacho — GD-2026-0189 — Almacenes Éxito La 14', fecha: '20/06/2026 11:45' },
  { modulo: 'TMS', moduloColor: '#0369A1', tipo: 'Remesa', nombre: 'Remesa Terrestre — REM-2026-7722 — Cali–Buenaventura', fecha: '20/06/2026 11:30' },
  { modulo: 'HCM', moduloColor: '#BE185D', tipo: 'Evaluación', nombre: 'Evaluación de Desempeño — Gloria Morales — Semestre I/2026', fecha: '20/06/2026 11:10' },
]

// ─── Estado Config ─────────────────────────────────────────────────────────────

function EstadoChip({ estado }: { estado: EstadoIntegracion }) {
  const map = {
    CONECTADO: { label: 'Conectado', color: '#16a34a', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
    EN_CONFIGURACION: { label: 'En configuración', color: '#d97706', icon: <Settings sx={{ fontSize: 14 }} /> },
    NO_CONECTADO: { label: 'No conectado', color: '#6b7280', icon: <Cancel sx={{ fontSize: 14 }} /> },
  }
  const cfg = map[estado]
  return (
    <Chip
      label={cfg.label}
      size="small"
      icon={cfg.icon as any}
      sx={{
        bgcolor: alpha(cfg.color, 0.1),
        color: cfg.color,
        fontWeight: 700,
        fontSize: '0.68rem',
        '& .MuiChip-icon': { color: cfg.color },
      }}
    />
  )
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuloCard({ mod }: { mod: Modulo }) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        borderTop: `4px solid ${mod.color}`,
        height: '100%',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="flex-start" gap={1.5} mb={1.5}>
          <Avatar sx={{ bgcolor: alpha(mod.color, 0.12), color: mod.color, width: 44, height: 44 }}>
            {mod.icon}
          </Avatar>
          <Box flex={1}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={700}>{mod.nombre}</Typography>
              <Chip
                label={mod.sigla}
                size="small"
                sx={{ bgcolor: mod.color, color: '#fff', fontWeight: 800, fontSize: '0.65rem', height: 20 }}
              />
            </Stack>
            <EstadoChip estado={mod.estado} />
          </Box>
        </Stack>

        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          {mod.descripcion}
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1.5}>
          {mod.documentos.map(d => (
            <Chip
              key={d}
              label={d}
              size="small"
              sx={{ fontSize: '0.62rem', height: 18, bgcolor: alpha(mod.color, 0.08), color: mod.color }}
            />
          ))}
        </Stack>

        {mod.estado === 'CONECTADO' ? (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                <Sync sx={{ fontSize: 11, mr: 0.3, verticalAlign: 'middle' }} />
                Última sync: {mod.ultimaSync}
              </Typography>
              <Typography variant="caption" fontWeight={700} color={mod.color}>
                {mod.cantidadDocs} docs
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={100}
              sx={{ height: 3, borderRadius: 2, bgcolor: alpha(mod.color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: mod.color } }}
            />
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" fontStyle="italic">
            {mod.pendiente}
          </Typography>
        )}

        <Button
          fullWidth
          size="small"
          variant={mod.estado === 'CONECTADO' ? 'outlined' : 'contained'}
          endIcon={mod.estado === 'CONECTADO' ? <OpenInNew /> : <Settings />}
          sx={{
            mt: 1.5,
            borderColor: mod.color,
            color: mod.estado === 'CONECTADO' ? mod.color : '#fff',
            bgcolor: mod.estado === 'CONECTADO' ? 'transparent' : mod.color,
            fontSize: '0.72rem',
            '&:hover': {
              bgcolor: mod.estado === 'CONECTADO' ? alpha(mod.color, 0.08) : alpha(mod.color, 0.85),
              borderColor: mod.color,
            },
          }}
        >
          {mod.estado === 'CONECTADO' ? 'Ver documentos' : 'Configurar'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMSIntegraciones() {
  const conectados = MODULOS.filter(m => m.estado === 'CONECTADO').length
  const totalDocs = MODULOS.filter(m => m.cantidadDocs).reduce((acc, m) => acc + (m.cantidadDocs ?? 0), 0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
              <Hub sx={{ color: DMS_COLOR, fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700}>
                Hub de Integraciones DMS
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Conecta el DMS con los módulos operativos de la suite empresarial ICOLTRANS para sincronización documental automática
            </Typography>
          </Box>
          <Stack direction="row" gap={1.5}>
            <Paper sx={{ px: 2, py: 1, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color={DMS_COLOR}>{conectados}/8</Typography>
              <Typography variant="caption" color="text.secondary">Módulos activos</Typography>
            </Paper>
            <Paper sx={{ px: 2, py: 1, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="#7c3aed">{totalDocs.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">Docs sincronizados</Typography>
            </Paper>
          </Stack>
        </Stack>

        {/* Module Grid */}
        <Grid container spacing={2} mb={4}>
          {MODULOS.map(mod => (
            <Grid key={mod.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ModuloCard mod={mod} />
            </Grid>
          ))}
        </Grid>

        {/* Recent synced docs table */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
              <Article sx={{ color: DMS_COLOR }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Documentos Sincronizados Recientes
              </Typography>
              <Chip label="Tiempo real" size="small" sx={{ ml: 'auto', bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontSize: '0.65rem', fontWeight: 700 }} />
            </Stack>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(DMS_COLOR, 0.06) } }}>
                    <TableCell>Módulo origen</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Nombre del documento</TableCell>
                    <TableCell>Fecha sincronización</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DOCS_SINCRONIZADOS.map((doc, idx) => (
                    <TableRow key={idx} hover sx={{ '& td': { py: 1, fontSize: '0.8rem' } }}>
                      <TableCell>
                        <Chip
                          label={doc.modulo}
                          size="small"
                          sx={{
                            bgcolor: doc.moduloColor,
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={doc.tipo} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 380 }}>
                        <Typography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.nombre}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{doc.fecha}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="text" endIcon={<OpenInNew sx={{ fontSize: 12 }} />} sx={{ color: DMS_COLOR, fontSize: '0.7rem' }}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  )
}
