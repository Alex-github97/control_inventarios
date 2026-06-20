import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  Divider,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  alpha,
} from '@mui/material'
import {
  Policy,
  Archive,
  Delete,
  SwapHoriz,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Info,
  History,
  Add,
  Lock,
  Description,
  Gavel,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RetentionPolicy {
  id: number
  nombre: string
  tipoDocumental: string
  retencionActiva: number
  retencionTotal: number
  accionAlVencer: 'Archivar' | 'Eliminar' | 'Transferir'
  normativa: string
  activo: boolean
}

interface DocumentRecord {
  codigo: string
  nombre: string
  categoria: string
  fechaVencimiento: string
  dias: number
  politica: string
}

interface HistoryEntry {
  id: number
  documento: string
  accion: 'Archivado' | 'Eliminado' | 'Transferido'
  fecha: string
  usuario: string
  resultado: string
}

interface NewPolicyForm {
  nombre: string
  tipoDocumental: string
  retencionActiva: string
  retencionTotal: string
  accionAlVencimiento: string
  normativa: string
  activo: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockPolicies: RetentionPolicy[] = [
  {
    id: 1,
    nombre: 'Contratos Laborales',
    tipoDocumental: 'Contratos/RRHH',
    retencionActiva: 1825,
    retencionTotal: 3650,
    accionAlVencer: 'Archivar',
    normativa: 'Código Sustantivo del Trabajo',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Facturas de Venta',
    tipoDocumental: 'Documentos Tributarios',
    retencionActiva: 1825,
    retencionTotal: 3650,
    accionAlVencer: 'Archivar',
    normativa: 'Estatuto Tributario Art. 632',
    activo: true,
  },
  {
    id: 3,
    nombre: 'Pólizas de Seguro',
    tipoDocumental: 'Seguros',
    retencionActiva: 365,
    retencionTotal: 1095,
    accionAlVencer: 'Transferir',
    normativa: 'Circular 050 Superfinanciera',
    activo: true,
  },
  {
    id: 4,
    nombre: 'Órdenes de Compra',
    tipoDocumental: 'Compras',
    retencionActiva: 730,
    retencionTotal: 2190,
    accionAlVencer: 'Archivar',
    normativa: 'NIIF-IFRS',
    activo: true,
  },
  {
    id: 5,
    nombre: 'Registros de Capacitación',
    tipoDocumental: 'RRHH',
    retencionActiva: 1095,
    retencionTotal: 2190,
    accionAlVencer: 'Archivar',
    normativa: 'Decreto 1072 de 2015',
    activo: true,
  },
  {
    id: 6,
    nombre: 'Soportes Contables',
    tipoDocumental: 'Contabilidad',
    retencionActiva: 1825,
    retencionTotal: 3650,
    accionAlVencer: 'Archivar',
    normativa: 'Estatuto Tributario Art. 632',
    activo: true,
  },
  {
    id: 7,
    nombre: 'Registros de Accidentes',
    tipoDocumental: 'SST',
    retencionActiva: 2190,
    retencionTotal: 4380,
    accionAlVencer: 'Transferir',
    normativa: 'Decreto 1295 de 1994',
    activo: true,
  },
  {
    id: 8,
    nombre: 'Actas de Reunión',
    tipoDocumental: 'Administrativo',
    retencionActiva: 365,
    retencionTotal: 730,
    accionAlVencer: 'Eliminar',
    normativa: 'Política Interna',
    activo: true,
  },
]

const mockExpiredDocs: DocumentRecord[] = [
  {
    codigo: 'FAC-2019-08234',
    nombre: 'Factura de Venta Transportes Bogotá',
    categoria: 'Documentos Tributarios',
    fechaVencimiento: '2024-01-15',
    dias: -155,
    politica: 'Facturas de Venta',
  },
  {
    codigo: 'OC-2019-04567',
    nombre: 'Orden de Compra Repuestos Vehículos',
    categoria: 'Compras',
    fechaVencimiento: '2024-02-28',
    dias: -111,
    politica: 'Órdenes de Compra',
  },
  {
    codigo: 'CTR-2018-12001',
    nombre: 'Contrato Operador Logístico Medellín',
    categoria: 'Contratos/RRHH',
    fechaVencimiento: '2024-03-10',
    dias: -100,
    politica: 'Contratos Laborales',
  },
]

const mockUpcoming30: DocumentRecord[] = [
  {
    codigo: 'FAC-2019-09001',
    nombre: 'Factura Proveedor Llantas SAS',
    categoria: 'Documentos Tributarios',
    fechaVencimiento: '2026-07-05',
    dias: 16,
    politica: 'Facturas de Venta',
  },
  {
    codigo: 'OC-2020-00123',
    nombre: 'Orden de Compra Combustible Enero',
    categoria: 'Compras',
    fechaVencimiento: '2026-07-08',
    dias: 19,
    politica: 'Órdenes de Compra',
  },
  {
    codigo: 'POL-2023-00456',
    nombre: 'Póliza Todo Riesgo Flota Norte',
    categoria: 'Seguros',
    fechaVencimiento: '2026-07-12',
    dias: 23,
    politica: 'Pólizas de Seguro',
  },
  {
    codigo: 'CAP-2023-00789',
    nombre: 'Registro Capacitación Conductores',
    categoria: 'RRHH',
    fechaVencimiento: '2026-07-15',
    dias: 26,
    politica: 'Registros de Capacitación',
  },
  {
    codigo: 'FAC-2019-09345',
    nombre: 'Factura Servicios Mantenimiento',
    categoria: 'Documentos Tributarios',
    fechaVencimiento: '2026-07-18',
    dias: 29,
    politica: 'Facturas de Venta',
  },
  {
    codigo: 'CTR-2021-00234',
    nombre: 'Contrato Prestación Servicios TI',
    categoria: 'Contratos/RRHH',
    fechaVencimiento: '2026-07-01',
    dias: 12,
    politica: 'Contratos Laborales',
  },
  {
    codigo: 'SC-2019-01122',
    nombre: 'Soporte Contable Nómina Diciembre',
    categoria: 'Contabilidad',
    fechaVencimiento: '2026-07-03',
    dias: 14,
    politica: 'Soportes Contables',
  },
  {
    codigo: 'ACC-2019-00091',
    nombre: 'Registro Accidente Vía Bogotá-Tunja',
    categoria: 'SST',
    fechaVencimiento: '2026-07-10',
    dias: 21,
    politica: 'Registros de Accidentes',
  },
]

const mockUpcoming90: DocumentRecord[] = [
  {
    codigo: 'ACTA-2024-00301',
    nombre: 'Acta Reunión Gerencia Enero',
    categoria: 'Administrativo',
    fechaVencimiento: '2026-08-10',
    dias: 52,
    politica: 'Actas de Reunión',
  },
  {
    codigo: 'FAC-2019-10001',
    nombre: 'Factura Compra Equipos Oficina',
    categoria: 'Documentos Tributarios',
    fechaVencimiento: '2026-08-20',
    dias: 62,
    politica: 'Facturas de Venta',
  },
  {
    codigo: 'OC-2020-00456',
    nombre: 'Orden de Compra Papelería',
    categoria: 'Compras',
    fechaVencimiento: '2026-08-25',
    dias: 67,
    politica: 'Órdenes de Compra',
  },
  {
    codigo: 'CAP-2023-00890',
    nombre: 'Registro Inducción Personal Nuevo',
    categoria: 'RRHH',
    fechaVencimiento: '2026-09-01',
    dias: 74,
    politica: 'Registros de Capacitación',
  },
  {
    codigo: 'SC-2019-01234',
    nombre: 'Soporte Contable Cierre Fiscal',
    categoria: 'Contabilidad',
    fechaVencimiento: '2026-09-05',
    dias: 78,
    politica: 'Soportes Contables',
  },
  {
    codigo: 'POL-2023-00567',
    nombre: 'Póliza Responsabilidad Civil',
    categoria: 'Seguros',
    fechaVencimiento: '2026-09-10',
    dias: 83,
    politica: 'Pólizas de Seguro',
  },
  {
    codigo: 'ACTA-2024-00345',
    nombre: 'Acta Reunión Comité SST',
    categoria: 'Administrativo',
    fechaVencimiento: '2026-09-12',
    dias: 85,
    politica: 'Actas de Reunión',
  },
  {
    codigo: 'CTR-2021-00345',
    nombre: 'Contrato Arrendamiento Bodega Cali',
    categoria: 'Contratos/RRHH',
    fechaVencimiento: '2026-09-15',
    dias: 88,
    politica: 'Contratos Laborales',
  },
  {
    codigo: 'ACC-2019-00102',
    nombre: 'Registro Accidente Operario Almacén',
    categoria: 'SST',
    fechaVencimiento: '2026-09-17',
    dias: 90,
    politica: 'Registros de Accidentes',
  },
  {
    codigo: 'FAC-2019-10234',
    nombre: 'Factura Servicios Logísticos',
    categoria: 'Documentos Tributarios',
    fechaVencimiento: '2026-08-30',
    dias: 72,
    politica: 'Facturas de Venta',
  },
  {
    codigo: 'OC-2020-00567',
    nombre: 'Orden de Compra Uniformes',
    categoria: 'Compras',
    fechaVencimiento: '2026-09-03',
    dias: 76,
    politica: 'Órdenes de Compra',
  },
  {
    codigo: 'SC-2019-01345',
    nombre: 'Soporte Contable Inventario',
    categoria: 'Contabilidad',
    fechaVencimiento: '2026-09-08',
    dias: 81,
    politica: 'Soportes Contables',
  },
  {
    codigo: 'CAP-2023-00901',
    nombre: 'Registro Capacitación Primeros Auxilios',
    categoria: 'RRHH',
    fechaVencimiento: '2026-09-14',
    dias: 87,
    politica: 'Registros de Capacitación',
  },
  {
    codigo: 'ACTA-2024-00367',
    nombre: 'Acta Junta Directiva Febrero',
    categoria: 'Administrativo',
    fechaVencimiento: '2026-09-16',
    dias: 89,
    politica: 'Actas de Reunión',
  },
  {
    codigo: 'POL-2023-00589',
    nombre: 'Póliza Manejo Empresa',
    categoria: 'Seguros',
    fechaVencimiento: '2026-09-18',
    dias: 91,
    politica: 'Pólizas de Seguro',
  },
]

const mockHistory: HistoryEntry[] = [
  {
    id: 1,
    documento: 'FAC-2018-00123',
    accion: 'Archivado',
    fecha: '2026-06-15 09:32:00',
    usuario: 'admin.sistema',
    resultado: 'Exitoso',
  },
  {
    id: 2,
    documento: 'ACTA-2022-00145',
    accion: 'Eliminado',
    fecha: '2026-06-14 14:18:00',
    usuario: 'm.lopez',
    resultado: 'Exitoso',
  },
  {
    id: 3,
    documento: 'POL-2020-00321',
    accion: 'Transferido',
    fecha: '2026-06-13 11:05:00',
    usuario: 'c.martinez',
    resultado: 'Exitoso',
  },
  {
    id: 4,
    documento: 'OC-2018-00567',
    accion: 'Archivado',
    fecha: '2026-06-12 16:44:00',
    usuario: 'admin.sistema',
    resultado: 'Exitoso',
  },
  {
    id: 5,
    documento: 'CTR-2016-00890',
    accion: 'Archivado',
    fecha: '2026-06-11 10:22:00',
    usuario: 'j.rodriguez',
    resultado: 'Exitoso',
  },
  {
    id: 6,
    documento: 'SC-2017-00112',
    accion: 'Archivado',
    fecha: '2026-06-10 08:55:00',
    usuario: 'm.lopez',
    resultado: 'Exitoso',
  },
  {
    id: 7,
    documento: 'ACC-2014-00234',
    accion: 'Transferido',
    fecha: '2026-06-09 13:30:00',
    usuario: 'c.martinez',
    resultado: 'Exitoso',
  },
  {
    id: 8,
    documento: 'CAP-2020-00456',
    accion: 'Archivado',
    fecha: '2026-06-08 15:10:00',
    usuario: 'admin.sistema',
    resultado: 'Exitoso',
  },
  {
    id: 9,
    documento: 'ACTA-2022-00210',
    accion: 'Eliminado',
    fecha: '2026-06-07 09:48:00',
    usuario: 'j.rodriguez',
    resultado: 'Exitoso',
  },
  {
    id: 10,
    documento: 'FAC-2018-01234',
    accion: 'Archivado',
    fecha: '2026-06-06 11:25:00',
    usuario: 'm.lopez',
    resultado: 'Exitoso',
  },
  {
    id: 11,
    documento: 'POL-2020-00456',
    accion: 'Transferido',
    fecha: '2026-06-05 14:00:00',
    usuario: 'c.martinez',
    resultado: 'Exitoso',
  },
  {
    id: 12,
    documento: 'OC-2018-00789',
    accion: 'Archivado',
    fecha: '2026-06-04 10:15:00',
    usuario: 'admin.sistema',
    resultado: 'Exitoso',
  },
]

const TIPO_DOCUMENTAL_OPTIONS = [
  'Contratos/RRHH',
  'Documentos Tributarios',
  'Seguros',
  'Compras',
  'RRHH',
  'Contabilidad',
  'SST',
  'Administrativo',
]

// ─── Helper Components ────────────────────────────────────────────────────────

function AccionChip({ accion }: { accion: 'Archivar' | 'Eliminar' | 'Transferir' }) {
  const config = {
    Archivar: { color: '#0E7490', bg: alpha('#0E7490', 0.12), icon: <Archive sx={{ fontSize: 14 }} /> },
    Eliminar: { color: '#DC2626', bg: alpha('#DC2626', 0.12), icon: <Delete sx={{ fontSize: 14 }} /> },
    Transferir: { color: '#7C3AED', bg: alpha('#7C3AED', 0.12), icon: <SwapHoriz sx={{ fontSize: 14 }} /> },
  }
  const c = config[accion]
  return (
    <Chip
      icon={c.icon}
      label={accion}
      size="small"
      sx={{ color: c.color, bgcolor: c.bg, fontWeight: 600, '& .MuiChip-icon': { color: c.color } }}
    />
  )
}

function HistoryAccionChip({ accion }: { accion: 'Archivado' | 'Eliminado' | 'Transferido' }) {
  const config = {
    Archivado: { color: '#0E7490', bg: alpha('#0E7490', 0.12) },
    Eliminado: { color: '#DC2626', bg: alpha('#DC2626', 0.12) },
    Transferido: { color: '#7C3AED', bg: alpha('#7C3AED', 0.12) },
  }
  const c = config[accion]
  return (
    <Chip
      label={accion}
      size="small"
      sx={{ color: c.color, bgcolor: c.bg, fontWeight: 600 }}
    />
  )
}

function DiasChip({ dias }: { dias: number }) {
  if (dias < 0) {
    return (
      <Chip
        label={`${dias} días`}
        size="small"
        sx={{ color: '#DC2626', bgcolor: alpha('#DC2626', 0.12), fontWeight: 700 }}
      />
    )
  }
  if (dias <= 30) {
    return (
      <Chip
        label={`${dias} días`}
        size="small"
        sx={{ color: '#D97706', bgcolor: alpha('#D97706', 0.12), fontWeight: 700 }}
      />
    )
  }
  return (
    <Chip
      label={`${dias} días`}
      size="small"
      sx={{ color: '#059669', bgcolor: alpha('#059669', 0.12), fontWeight: 700 }}
    />
  )
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function PoliciesTab({
  policies,
  onAddPolicy,
}: {
  policies: RetentionPolicy[]
  onAddPolicy: () => void
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddPolicy}
          sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: alpha(DMS_COLOR, 0.85) } }}
        >
          Nueva Política
        </Button>
      </Box>
      <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(DMS_COLOR, 0.06) }}>
              <TableCell sx={{ fontWeight: 700, color: DMS_COLOR }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 700, color: DMS_COLOR }}>Tipo Documental</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: DMS_COLOR }}>
                Retención Activa (días)
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: DMS_COLOR }}>
                Retención Total (días)
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: DMS_COLOR }}>
                Acción al Vencer
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: DMS_COLOR }}>Normativa / Base Legal</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: DMS_COLOR }}>
                Estado
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Description sx={{ fontSize: 16, color: DMS_COLOR }} />
                    <Typography variant="body2" fontWeight={600}>
                      {p.nombre}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {p.tipoDocumental}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={600}>
                    {p.retencionActiva.toLocaleString('es-CO')}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={600}>
                    {p.retencionTotal.toLocaleString('es-CO')}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <AccionChip accion={p.accionAlVencer} />
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Gavel sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {p.normativa}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: 14 }} />}
                    label="Activo"
                    size="small"
                    sx={{
                      color: '#059669',
                      bgcolor: alpha('#059669', 0.12),
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: '#059669' },
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

function DocumentsTab({ onAction }: { onAction: () => void }) {
  return (
    <Stack spacing={3}>
      {/* Vencidos */}
      <Box>
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{ mb: 1.5, borderRadius: 2, fontWeight: 600 }}
        >
          3 documentos vencidos requieren acción inmediata
        </Alert>
        <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#DC2626', 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Documento</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fecha Vencimiento</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Días Vencido
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Política</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Acción
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockExpiredDocs.map((doc) => (
                <TableRow key={doc.codigo} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="error.main">
                      {doc.codigo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{doc.nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {doc.categoria}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="error.main">
                      {doc.fechaVencimiento}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <DiasChip dias={doc.dias} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {doc.politica}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Archive sx={{ fontSize: 14 }} />}
                        onClick={onAction}
                        sx={{ fontSize: 11, borderColor: DMS_COLOR, color: DMS_COLOR }}
                      >
                        Archivar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Delete sx={{ fontSize: 14 }} />}
                        onClick={onAction}
                        color="error"
                        sx={{ fontSize: 11 }}
                      >
                        Eliminar
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Próximos 30 días */}
      <Box>
        <Alert
          severity="warning"
          icon={<Warning />}
          sx={{ mb: 1.5, borderRadius: 2, fontWeight: 600 }}
        >
          8 documentos vencen en los próximos 30 días
        </Alert>
        <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#D97706', 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Documento</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Días Restantes
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Política Aplicable</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Acción
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockUpcoming30.map((doc) => (
                <TableRow key={doc.codigo} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#D97706' }}>
                      {doc.codigo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{doc.nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {doc.categoria}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <DiasChip dias={doc.dias} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {doc.politica}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Archive sx={{ fontSize: 14 }} />}
                      onClick={onAction}
                      sx={{ fontSize: 11, borderColor: '#D97706', color: '#D97706' }}
                    >
                      Programar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Próximos 90 días */}
      <Box>
        <Alert
          severity="info"
          icon={<Info />}
          sx={{ mb: 1.5, borderRadius: 2, fontWeight: 600 }}
        >
          15 documentos vencen en los próximos 90 días — planificar retención
        </Alert>
        <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(DMS_COLOR, 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Documento</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Días Restantes
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Política</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockUpcoming90.map((doc) => (
                <TableRow key={doc.codigo} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} sx={{ color: DMS_COLOR }}>
                      {doc.codigo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{doc.nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {doc.categoria}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <DiasChip dias={doc.dias} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {doc.politica}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  )
}

function HistoryTab() {
  return (
    <Box>
      <Alert
        severity="info"
        icon={<Lock />}
        sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
      >
        Registro inmutable — No se pueden modificar las entradas
      </Alert>
      <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(DMS_COLOR, 0.06) }}>
              <TableCell sx={{ fontWeight: 700, color: DMS_COLOR }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700, color: DMS_COLOR }}>Documento</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: DMS_COLOR }}>
                Acción
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: DMS_COLOR }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700, color: DMS_COLOR }}>Usuario</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: DMS_COLOR }}>
                Resultado
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockHistory.map((entry) => (
              <TableRow key={entry.id} hover>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {entry.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    {entry.documento}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <HistoryAccionChip accion={entry.accion} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {entry.fecha}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{entry.usuario}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: 14 }} />}
                    label={entry.resultado}
                    size="small"
                    sx={{
                      color: '#059669',
                      bgcolor: alpha('#059669', 0.12),
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: '#059669' },
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

// ─── New Policy Dialog ────────────────────────────────────────────────────────

const emptyForm: NewPolicyForm = {
  nombre: '',
  tipoDocumental: '',
  retencionActiva: '',
  retencionTotal: '',
  accionAlVencimiento: '',
  normativa: '',
  activo: true,
}

function NewPolicyDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState<NewPolicyForm>(emptyForm)

  function handleChange(field: keyof NewPolicyForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    onSave()
    setForm(emptyForm)
  }

  function handleClose() {
    setForm(emptyForm)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Policy sx={{ color: DMS_COLOR }} />
          <Typography variant="h6" fontWeight={700}>
            Nueva Política de Retención
          </Typography>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Nombre"
            fullWidth
            size="small"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Tipo Documental</InputLabel>
            <Select
              label="Tipo Documental"
              value={form.tipoDocumental}
              onChange={(e) => handleChange('tipoDocumental', e.target.value)}
            >
              {TIPO_DOCUMENTAL_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Retención Activa (días)"
                fullWidth
                size="small"
                type="number"
                value={form.retencionActiva}
                onChange={(e) => handleChange('retencionActiva', e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Retención Total (días)"
                fullWidth
                size="small"
                type="number"
                value={form.retencionTotal}
                onChange={(e) => handleChange('retencionTotal', e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
          <FormControl fullWidth size="small">
            <InputLabel>Acción al Vencimiento</InputLabel>
            <Select
              label="Acción al Vencimiento"
              value={form.accionAlVencimiento}
              onChange={(e) => handleChange('accionAlVencimiento', e.target.value)}
            >
              <MenuItem value="Archivar">Archivar</MenuItem>
              <MenuItem value="Eliminar">Eliminar</MenuItem>
              <MenuItem value="Transferir">Transferir</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Normativa / Base Legal"
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={form.normativa}
            onChange={(e) => handleChange('normativa', e.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.activo}
                onChange={(e) => handleChange('activo', e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: DMS_COLOR },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    bgcolor: DMS_COLOR,
                  },
                }}
              />
            }
            label="Activo"
          />
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: alpha(DMS_COLOR, 0.85) } }}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DMSRetencion() {
  const [activeTab, setActiveTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [policies, setPolicies] = useState<RetentionPolicy[]>(mockPolicies)

  function handleSavePolicy() {
    setDialogOpen(false)
    setSnackbarOpen(true)
  }

  function handleDocAction() {
    setSnackbarOpen(true)
  }

  return (
    <Layout title="Retención Documental">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(DMS_COLOR, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Policy sx={{ color: DMS_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Retención Documental
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Matriz de retención documental ISO 15489
            </Typography>
          </Box>
        </Stack>

        <Alert
          severity="info"
          icon={<Info />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={600}>
            ISO 15489 — Gestión de documentos y archivos | Política de retención documental empresarial
          </Typography>
        </Alert>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              variant="outlined"
              sx={{ borderRadius: 2, borderColor: alpha(DMS_COLOR, 0.3), bgcolor: alpha(DMS_COLOR, 0.04) }}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Policy sx={{ color: DMS_COLOR, fontSize: 32 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700} color={DMS_COLOR}>
                      8
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Políticas activas
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              variant="outlined"
              sx={{ borderRadius: 2, borderColor: alpha('#DC2626', 0.3), bgcolor: alpha('#DC2626', 0.04) }}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <ErrorIcon sx={{ color: '#DC2626', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700} color="#DC2626">
                      3
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Documentos vencidos
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              variant="outlined"
              sx={{ borderRadius: 2, borderColor: alpha('#D97706', 0.3), bgcolor: alpha('#D97706', 0.04) }}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Warning sx={{ color: '#D97706', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700} color="#D97706">
                      8
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Próximos 30 días
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              variant="outlined"
              sx={{ borderRadius: 2, borderColor: alpha('#059669', 0.3), bgcolor: alpha('#059669', 0.04) }}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <History sx={{ color: '#059669', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700} color="#059669">
                      12
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Acciones registradas
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                px: 2,
                '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
                '& .Mui-selected': { color: DMS_COLOR },
                '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
              }}
            >
              <Tab
                icon={<Policy sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Políticas de Retención"
              />
              <Tab
                icon={<Warning sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Documentos Próximos a Vencer"
              />
              <Tab
                icon={<History sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Historial de Acciones"
              />
            </Tabs>
          </Box>

          <CardContent sx={{ p: 2.5 }}>
            {activeTab === 0 && (
              <PoliciesTab
                policies={policies}
                onAddPolicy={() => setDialogOpen(true)}
              />
            )}
            {activeTab === 1 && <DocumentsTab onAction={handleDocAction} />}
            {activeTab === 2 && <HistoryTab />}
          </CardContent>
        </Card>
      </Box>

      {/* New Policy Dialog */}
      <NewPolicyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSavePolicy}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          icon={<CheckCircle />}
          onClose={() => setSnackbarOpen(false)}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Acción registrada exitosamente
        </Alert>
      </Snackbar>
    </Layout>
  )
}
