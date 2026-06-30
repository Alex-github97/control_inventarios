import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  Button,
  alpha,
  Divider,
} from '@mui/material'
import {
  Shield as GarantiaIcon,
  Warning as AlertaIcon,
  CheckCircle as VerificadoIcon,
  AccessTime as ProximoIcon,
  AttachMoney as DineroIcon,
  Gavel as ReclamoIcon,
  NotificationsActive as NotifIcon,
  Assignment as DocIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constantes de tema ───────────────────────────────────────────────────────

const EAM_COLOR = '#32AC5C'
const CARD_BG   = '#0F1E35'
const DARK_BG   = '#060C1A'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoGarantia   = 'ACTIVO' | 'REPUESTO' | 'SERVICIO'
type EstadoGarantia = 'VIGENTE' | 'VENCIDA' | 'RECLAMADA'
type EstadoReclamo  = 'EN_PROCESO' | 'APROBADA' | 'RECHAZADA' | 'CERRADA'

interface Garantia {
  id: number
  descripcion: string
  activo: string
  tipo: TipoGarantia
  proveedor: string
  numeroGarantia: string
  inicio: string
  vencimiento: string
  diasRestantes: number
  valorCubierto: string
  estado: EstadoGarantia
}

interface GarantiaVencer {
  id: number
  descripcion: string
  activo: string
  proveedor: string
  vencimiento: string
  diasRestantes: number
  valorCubierto: string
}

interface Reclamacion {
  id: number
  fecha: string
  garantia: string
  descripcionReclamo: string
  montoSolicitado: string
  montoRecuperado: string
  estado: EstadoReclamo
  proveedor: string
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

const GARANTIAS: Garantia[] = [
  {
    id: 1,
    descripcion: 'Motor Cummins ISX 15L – Tracto 001',
    activo: 'Tracto TF-001',
    tipo: 'ACTIVO',
    proveedor: 'Cummins Colombia S.A.S.',
    numeroGarantia: 'GAR-2024-0041',
    inicio: '2024-01-15',
    vencimiento: '2026-01-15',
    diasRestantes: 209,
    valorCubierto: '$85,000,000',
    estado: 'VIGENTE',
  },
  {
    id: 2,
    descripcion: 'Transmisión Eaton Fuller – Tracto 003',
    activo: 'Tracto TF-003',
    tipo: 'REPUESTO',
    proveedor: 'Eaton Distribuidores Ltda.',
    numeroGarantia: 'GAR-2024-0058',
    inicio: '2024-03-10',
    vencimiento: '2025-09-10',
    diasRestantes: 82,
    valorCubierto: '$42,000,000',
    estado: 'VIGENTE',
  },
  {
    id: 3,
    descripcion: 'Contrato Servicio Carrocería – Furgón FL-007',
    activo: 'Furgón FL-007',
    tipo: 'SERVICIO',
    proveedor: 'Carrocerías Andinas S.A.',
    numeroGarantia: 'GAR-2023-0112',
    inicio: '2023-06-01',
    vencimiento: '2025-06-01',
    diasRestantes: -19,
    valorCubierto: '$18,500,000',
    estado: 'VENCIDA',
  },
  {
    id: 4,
    descripcion: 'Montacargas Toyota 8FBN25 – Bodega Cali',
    activo: 'Montacargas MC-002',
    tipo: 'ACTIVO',
    proveedor: 'Toyota Tsusho Latam',
    numeroGarantia: 'GAR-2024-0077',
    inicio: '2024-05-20',
    vencimiento: '2027-05-20',
    diasRestantes: 699,
    valorCubierto: '$120,000,000',
    estado: 'VIGENTE',
  },
  {
    id: 5,
    descripcion: 'Eje Trasero Meritor – Bus BP-012',
    activo: 'Bus BP-012',
    tipo: 'REPUESTO',
    proveedor: 'Meritor WABCO Colombia',
    numeroGarantia: 'GAR-2024-0033',
    inicio: '2024-02-08',
    vencimiento: '2026-02-08',
    diasRestantes: 233,
    valorCubierto: '$28,000,000',
    estado: 'VIGENTE',
  },
  {
    id: 6,
    descripcion: 'Compresor HVAC – Camioneta CM-021',
    activo: 'Camioneta CM-021',
    tipo: 'REPUESTO',
    proveedor: 'Sanden Automotive',
    numeroGarantia: 'GAR-2023-0098',
    inicio: '2023-09-15',
    vencimiento: '2025-09-15',
    diasRestantes: 87,
    valorCubierto: '$8,200,000',
    estado: 'VIGENTE',
  },
  {
    id: 7,
    descripcion: 'Mantenimiento Preventivo Flota – Contrato Marco',
    activo: 'Flota General',
    tipo: 'SERVICIO',
    proveedor: 'AutoServicios del Valle S.A.',
    numeroGarantia: 'GAR-2024-0019',
    inicio: '2024-01-01',
    vencimiento: '2024-12-31',
    diasRestantes: -171,
    valorCubierto: '$95,000,000',
    estado: 'RECLAMADA',
  },
  {
    id: 8,
    descripcion: 'Diferencial Dana Spicer – Tracto TF-009',
    activo: 'Tracto TF-009',
    tipo: 'REPUESTO',
    proveedor: 'Dana Incorporated Colombia',
    numeroGarantia: 'GAR-2024-0091',
    inicio: '2024-06-01',
    vencimiento: '2026-06-01',
    diasRestantes: 346,
    valorCubierto: '$35,000,000',
    estado: 'VIGENTE',
  },
  {
    id: 9,
    descripcion: 'Sistema Frenos ABS – Camión CM-005',
    activo: 'Camión CM-005',
    tipo: 'REPUESTO',
    proveedor: 'Bosch Automotive Colombia',
    numeroGarantia: 'GAR-2023-0145',
    inicio: '2023-11-20',
    vencimiento: '2025-11-20',
    diasRestantes: 153,
    valorCubierto: '$15,600,000',
    estado: 'VIGENTE',
  },
  {
    id: 10,
    descripcion: 'Estructura Metálica Plataforma – PL-003',
    activo: 'Plataforma PL-003',
    tipo: 'ACTIVO',
    proveedor: 'Metalmecánica Industrial Ltda.',
    numeroGarantia: 'GAR-2022-0204',
    inicio: '2022-12-01',
    vencimiento: '2024-12-01',
    diasRestantes: -201,
    valorCubierto: '$22,000,000',
    estado: 'VENCIDA',
  },
]

const GARANTIAS_POR_VENCER: GarantiaVencer[] = [
  {
    id: 1,
    descripcion: 'Inyectores Bosch – Tracto TF-014',
    activo: 'Tracto TF-014',
    proveedor: 'Bosch Automotive Colombia',
    vencimiento: '2025-06-24',
    diasRestantes: 4,
    valorCubierto: '$12,400,000',
  },
  {
    id: 2,
    descripcion: 'Bomba Hidráulica – Montacargas MC-005',
    activo: 'Montacargas MC-005',
    proveedor: 'Toyota Tsusho Latam',
    vencimiento: '2025-06-27',
    diasRestantes: 7,
    valorCubierto: '$9,800,000',
  },
  {
    id: 3,
    descripcion: 'Alternador Prestolite – Bus BP-008',
    activo: 'Bus BP-008',
    proveedor: 'Prestolite Electric',
    vencimiento: '2025-07-02',
    diasRestantes: 12,
    valorCubierto: '$5,100,000',
  },
  {
    id: 4,
    descripcion: 'Turbocompresor Holset – Tracto TF-022',
    activo: 'Tracto TF-022',
    proveedor: 'Cummins Colombia S.A.S.',
    vencimiento: '2025-07-05',
    diasRestantes: 15,
    valorCubierto: '$18,700,000',
  },
  {
    id: 5,
    descripcion: 'Garantía Pintura Cabina – TF-016',
    activo: 'Tracto TF-016',
    proveedor: 'Carrocerías Andinas S.A.',
    vencimiento: '2025-07-10',
    diasRestantes: 20,
    valorCubierto: '$3,200,000',
  },
  {
    id: 6,
    descripcion: 'Filtros de Aire – Camión CM-011',
    activo: 'Camión CM-011',
    proveedor: 'Mann+Hummel Colombia',
    vencimiento: '2025-07-14',
    diasRestantes: 24,
    valorCubierto: '$1,800,000',
  },
  {
    id: 7,
    descripcion: 'Caja de Cambios ZF – Tracto TF-030',
    activo: 'Tracto TF-030',
    proveedor: 'ZF Friedrichshafen AG',
    vencimiento: '2025-07-18',
    diasRestantes: 28,
    valorCubierto: '$48,000,000',
  },
  {
    id: 8,
    descripcion: 'Suspensión Neumática – Semirremolque SR-007',
    activo: 'Semirremolque SR-007',
    proveedor: 'Wabco Holdings',
    vencimiento: '2025-07-20',
    diasRestantes: 30,
    valorCubierto: '$22,500,000',
  },
]

const RECLAMACIONES: Reclamacion[] = [
  {
    id: 1,
    fecha: '2025-03-10',
    garantia: 'GAR-2023-0098',
    descripcionReclamo: 'Falla prematura en compresor HVAC a 18 meses de instalación',
    montoSolicitado: '$8,200,000',
    montoRecuperado: '$7,500,000',
    estado: 'CERRADA',
    proveedor: 'Sanden Automotive',
  },
  {
    id: 2,
    fecha: '2025-04-02',
    garantia: 'GAR-2024-0019',
    descripcionReclamo: 'Incumplimiento en tiempos de respuesta del contrato de mantenimiento',
    montoSolicitado: '$95,000,000',
    montoRecuperado: '$68,000,000',
    estado: 'CERRADA',
    proveedor: 'AutoServicios del Valle S.A.',
  },
  {
    id: 3,
    fecha: '2025-04-28',
    garantia: 'GAR-2024-0041',
    descripcionReclamo: 'Consumo excesivo de aceite en motor ISX – defecto de manufactura',
    montoSolicitado: '$42,000,000',
    montoRecuperado: '$38,000,000',
    estado: 'APROBADA',
    proveedor: 'Cummins Colombia S.A.S.',
  },
  {
    id: 4,
    fecha: '2025-05-14',
    garantia: 'GAR-2023-0145',
    descripcionReclamo: 'Falla en sensor ABS a los 8 meses de instalación',
    montoSolicitado: '$15,600,000',
    montoRecuperado: '$0',
    estado: 'RECHAZADA',
    proveedor: 'Bosch Automotive Colombia',
  },
  {
    id: 5,
    fecha: '2025-05-30',
    garantia: 'GAR-2024-0058',
    descripcionReclamo: 'Desgaste anormal en sincronizadores de transmisión Eaton',
    montoSolicitado: '$28,000,000',
    montoRecuperado: '$21,500,000',
    estado: 'EN_PROCESO',
    proveedor: 'Eaton Distribuidores Ltda.',
  },
  {
    id: 6,
    fecha: '2025-06-10',
    garantia: 'GAR-2024-0077',
    descripcionReclamo: 'Fuga hidráulica en mástil de montacargas',
    montoSolicitado: '$12,000,000',
    montoRecuperado: '$0',
    estado: 'EN_PROCESO',
    proveedor: 'Toyota Tsusho Latam',
  },
]

// ─── Helpers de color ─────────────────────────────────────────────────────────

function colorPorDias(dias: number): string {
  if (dias <= 7) return '#EF4444'
  if (dias <= 15) return '#32AC5C'
  return '#EAB308'
}

function labelPorDias(dias: number): string {
  if (dias <= 7) return 'CRÍTICO'
  if (dias <= 15) return 'URGENTE'
  return 'PRÓXIMO'
}

function colorEstadoGarantia(estado: EstadoGarantia): string {
  switch (estado) {
    case 'VIGENTE':   return '#16A34A'
    case 'VENCIDA':   return '#6B7280'
    case 'RECLAMADA': return '#3B82F6'
  }
}

function colorEstadoReclamo(estado: EstadoReclamo): string {
  switch (estado) {
    case 'EN_PROCESO': return '#F59E0B'
    case 'APROBADA':   return '#16A34A'
    case 'RECHAZADA':  return '#EF4444'
    case 'CERRADA':    return '#6B7280'
  }
}

function labelEstadoReclamo(estado: EstadoReclamo): string {
  switch (estado) {
    case 'EN_PROCESO': return 'En Proceso'
    case 'APROBADA':   return 'Aprobada'
    case 'RECHAZADA':  return 'Rechazada'
    case 'CERRADA':    return 'Cerrada'
  }
}

function colorTipo(tipo: TipoGarantia): string {
  switch (tipo) {
    case 'ACTIVO':   return '#8B5CF6'
    case 'REPUESTO': return '#06B6D4'
    case 'SERVICIO': return '#F59E0B'
  }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface KPIBoxProps {
  label: string
  value: string
  color: string
  icon: React.ReactNode
  sub?: string
}

function KPIBox({ label, value, color, icon, sub }: KPIBoxProps) {
  return (
    <Card
      sx={{
        bgcolor: CARD_BG,
        border: `1px solid ${alpha(color, 0.25)}`,
        borderRadius: 2,
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography
            variant="caption"
            sx={{
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontSize: '0.68rem',
            }}
          >
            {label}
          </Typography>
        </Stack>
        <Typography variant="h5" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: '#6B7280', mt: 0.5, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tab 0: Garantías Vigentes ────────────────────────────────────────────────

function TabGarantiasVigentes() {
  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPIBox
            label="Garantías Vigentes"
            value="34"
            color="#16A34A"
            icon={<VerificadoIcon />}
            sub="Activas y en cobertura"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPIBox
            label="Por Vencer (<30 días)"
            value="8"
            color="#EAB308"
            icon={<ProximoIcon />}
            sub="Requieren atención"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPIBox
            label="Garantías Vencidas"
            value="12"
            color="#6B7280"
            icon={<AlertaIcon />}
            sub="Sin cobertura activa"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPIBox
            label="Valor Cubierto Total"
            value="$4.8B"
            color={EAM_COLOR}
            icon={<DineroIcon />}
            sub="Cobertura acumulada"
          />
        </Grid>
      </Grid>

      {/* Tabla */}
      <TableContainer
        component={Paper}
        sx={{
          bgcolor: CARD_BG,
          borderRadius: 2,
          border: `1px solid ${alpha('#fff', 0.06)}`,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  bgcolor: alpha(EAM_COLOR, 0.08),
                  color: '#9CA3AF',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  borderBottom: `1px solid ${alpha('#fff', 0.08)}`,
                },
              }}
            >
              <TableCell>Descripción</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Nº Garantía</TableCell>
              <TableCell>Inicio</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell align="center">Días Rest.</TableCell>
              <TableCell>Valor Cubierto</TableCell>
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {GARANTIAS.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  '&:hover': { bgcolor: alpha('#fff', 0.03) },
                  '& td': {
                    borderBottom: `1px solid ${alpha('#fff', 0.05)}`,
                    color: '#D1D5DB',
                    fontSize: '0.8rem',
                    py: 1.2,
                  },
                }}
              >
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ color: '#F3F4F6', fontSize: '0.8rem', fontWeight: 500 }}
                  >
                    {row.descripcion}
                  </Typography>
                </TableCell>
                <TableCell>{row.activo}</TableCell>
                <TableCell>
                  <Chip
                    label={row.tipo}
                    size="small"
                    sx={{
                      bgcolor: alpha(colorTipo(row.tipo), 0.15),
                      color: colorTipo(row.tipo),
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      height: 20,
                    }}
                  />
                </TableCell>
                <TableCell>{row.proveedor}</TableCell>
                <TableCell
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem !important',
                    color: '#9CA3AF !important',
                  }}
                >
                  {row.numeroGarantia}
                </TableCell>
                <TableCell>{row.inicio}</TableCell>
                <TableCell>{row.vencimiento}</TableCell>
                <TableCell align="center">
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color:
                        row.diasRestantes > 30
                          ? '#16A34A'
                          : row.diasRestantes > 0
                          ? '#EAB308'
                          : '#6B7280',
                    }}
                  >
                    {row.diasRestantes}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{ color: `${EAM_COLOR} !important`, fontWeight: 600 }}
                >
                  {row.valorCubierto}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={row.estado}
                    size="small"
                    sx={{
                      bgcolor: alpha(colorEstadoGarantia(row.estado), 0.15),
                      color: colorEstadoGarantia(row.estado),
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      height: 20,
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

// ─── Tab 1: Por Vencer ────────────────────────────────────────────────────────

function TabPorVencer() {
  return (
    <Box>
      <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 2 }}>
        Garantías ordenadas por proximidad de vencimiento. Se muestran las próximas a expirar en
        los siguientes 30 días.
      </Typography>
      <Stack spacing={2}>
        {GARANTIAS_POR_VENCER.map((g) => {
          const color = colorPorDias(g.diasRestantes)
          const nivel = labelPorDias(g.diasRestantes)
          return (
            <Card
              key={g.id}
              sx={{
                bgcolor: CARD_BG,
                border: `1px solid ${alpha(color, 0.35)}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  alignItems={{ md: 'center' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  {/* Info */}
                  <Box flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Chip
                        label={nivel}
                        size="small"
                        sx={{
                          bgcolor: alpha(color, 0.2),
                          color,
                          fontWeight: 700,
                          fontSize: '0.62rem',
                          height: 18,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        Vence: {g.vencimiento}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ color: '#F3F4F6', fontWeight: 600, mb: 0.5 }}
                    >
                      {g.descripcion}
                    </Typography>
                    <Stack direction="row" spacing={3} flexWrap="wrap">
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                        Activo:{' '}
                        <span style={{ color: '#D1D5DB' }}>{g.activo}</span>
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                        Proveedor:{' '}
                        <span style={{ color: '#D1D5DB' }}>{g.proveedor}</span>
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                        Valor:{' '}
                        <span style={{ color: EAM_COLOR, fontWeight: 600 }}>
                          {g.valorCubierto}
                        </span>
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Días restantes + acción */}
                  <Stack direction="row" alignItems="center" spacing={2} flexShrink={0}>
                    <Box textAlign="center">
                      <Typography
                        variant="h4"
                        sx={{ color, fontWeight: 800, lineHeight: 1 }}
                      >
                        {g.diasRestantes}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: '#6B7280', fontSize: '0.65rem' }}
                      >
                        días restantes
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<NotifIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{
                        borderColor: alpha(color, 0.5),
                        color,
                        fontSize: '0.72rem',
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          borderColor: color,
                          bgcolor: alpha(color, 0.08),
                        },
                      }}
                    >
                      Generar Alerta
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )
        })}
      </Stack>
    </Box>
  )
}

// ─── Tab 2: Reclamaciones ─────────────────────────────────────────────────────

function TabReclamaciones() {
  return (
    <Box>
      {/* KPIs de reclamaciones */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KPIBox
            label="Tasa de Recuperación"
            value="78%"
            color="#16A34A"
            icon={<VerificadoIcon />}
            sub="Sobre total reclamado"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KPIBox
            label="Total Reclamado"
            value="$420M"
            color="#EF4444"
            icon={<ReclamoIcon />}
            sub="Histórico acumulado"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KPIBox
            label="Total Recuperado"
            value="$327M"
            color={EAM_COLOR}
            icon={<DineroIcon />}
            sub="Valor efectivamente cobrado"
          />
        </Grid>
      </Grid>

      <Divider sx={{ borderColor: alpha('#fff', 0.07), mb: 3 }} />

      {/* Tabla de reclamaciones */}
      <TableContainer
        component={Paper}
        sx={{
          bgcolor: CARD_BG,
          borderRadius: 2,
          border: `1px solid ${alpha('#fff', 0.06)}`,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  bgcolor: alpha(EAM_COLOR, 0.08),
                  color: '#9CA3AF',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  borderBottom: `1px solid ${alpha('#fff', 0.08)}`,
                },
              }}
            >
              <TableCell>Fecha</TableCell>
              <TableCell>Garantía</TableCell>
              <TableCell>Descripción del Reclamo</TableCell>
              <TableCell>Monto Solicitado</TableCell>
              <TableCell>Monto Recuperado</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell>Proveedor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {RECLAMACIONES.map((r) => (
              <TableRow
                key={r.id}
                sx={{
                  '&:hover': { bgcolor: alpha('#fff', 0.03) },
                  '& td': {
                    borderBottom: `1px solid ${alpha('#fff', 0.05)}`,
                    color: '#D1D5DB',
                    fontSize: '0.8rem',
                    py: 1.2,
                  },
                }}
              >
                <TableCell
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem !important',
                    color: '#9CA3AF !important',
                  }}
                >
                  {r.fecha}
                </TableCell>
                <TableCell
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem !important',
                    color: '#9CA3AF !important',
                  }}
                >
                  {r.garantia}
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#F3F4F6',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      maxWidth: 300,
                    }}
                  >
                    {r.descripcionReclamo}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: '#EF4444 !important', fontWeight: 600 }}>
                  {r.montoSolicitado}
                </TableCell>
                <TableCell
                  sx={{
                    color: `${r.montoRecuperado === '$0' ? '#6B7280' : '#16A34A'} !important`,
                    fontWeight: 600,
                  }}
                >
                  {r.montoRecuperado}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={labelEstadoReclamo(r.estado)}
                    size="small"
                    sx={{
                      bgcolor: alpha(colorEstadoReclamo(r.estado), 0.15),
                      color: colorEstadoReclamo(r.estado),
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      height: 20,
                    }}
                  />
                </TableCell>
                <TableCell>{r.proveedor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EAMGarantias() {
  const [tabActual, setTabActual] = useState(0)

  return (
    <Layout>
      <Box sx={{ bgcolor: DARK_BG, minHeight: '100vh', p: { xs: 2, md: 3 } }}>
        {/* Encabezado */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: alpha(EAM_COLOR, 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: EAM_COLOR,
              flexShrink: 0,
            }}
          >
            <GarantiaIcon />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{ color: '#F9FAFB', fontWeight: 700, lineHeight: 1.2 }}
            >
              Gestión de Garantías
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              EAM · ICOLTRANS — Control de cobertura, alertas y reclamaciones
            </Typography>
          </Box>
          <Box flex={1} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<DocIcon sx={{ fontSize: '0.9rem' }} />}
            sx={{
              borderColor: alpha(EAM_COLOR, 0.4),
              color: EAM_COLOR,
              fontSize: '0.75rem',
              textTransform: 'none',
              '&:hover': {
                borderColor: EAM_COLOR,
                bgcolor: alpha(EAM_COLOR, 0.06),
              },
            }}
          >
            Exportar Reporte
          </Button>
        </Stack>

        {/* Tabs */}
        <Paper
          sx={{
            bgcolor: CARD_BG,
            borderRadius: 2,
            border: `1px solid ${alpha('#fff', 0.07)}`,
            mb: 3,
          }}
        >
          <Tabs
            value={tabActual}
            onChange={(_e, v: number) => setTabActual(v)}
            TabIndicatorProps={{ style: { backgroundColor: EAM_COLOR } }}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                color: '#6B7280',
                textTransform: 'none',
                fontSize: '0.85rem',
                minHeight: 48,
                '&.Mui-selected': { color: EAM_COLOR, fontWeight: 600 },
              },
            }}
          >
            <Tab label="Garantías Vigentes" />
            <Tab
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>Por Vencer</span>
                  <Chip
                    label="8"
                    size="small"
                    sx={{
                      bgcolor: alpha('#EAB308', 0.2),
                      color: '#EAB308',
                      height: 16,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                </Stack>
              }
            />
            <Tab label="Reclamaciones" />
          </Tabs>
        </Paper>

        {/* Contenido de tabs */}
        <Box>
          {tabActual === 0 && <TabGarantiasVigentes />}
          {tabActual === 1 && <TabPorVencer />}
          {tabActual === 2 && <TabReclamaciones />}
        </Box>
      </Box>
    </Layout>
  )
}
