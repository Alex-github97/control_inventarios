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
  Snackbar,
  Alert,
  CircularProgress,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  InputAdornment,
  alpha,
} from '@mui/material'
import {
  Draw,
  CheckCircle,
  Cancel,
  PictureAsPdf,
  Fingerprint,
  Security,
  Verified,
  Schedule,
  Person,
  VpnKey,
  QrCode,
  Download,
  Visibility,
  Assignment,
  Search,
  Close,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface PendingDocument {
  id: number
  name: string
  type: string
  requestedBy: string
  deadline: string
  signatureOrder: string
  version: string
  signantType: string
}

interface SignedDocument {
  id: number
  name: string
  signaType: string
  firmante: string
  date: string
  ip: string
  status: 'Firmado' | 'Rechazado'
  verificationCode: string
  hash: string
  allFirmantes: FirmanteRecord[]
}

interface FirmanteRecord {
  order: number
  name: string
  role: string
  requestedDate: string
  signedDate: string | null
  status: 'Firmado' | 'Pendiente' | 'Rechazado'
  ip?: string
}

interface DocumentByName {
  id: number
  name: string
  type: string
  firmantes: FirmanteRecord[]
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const PENDING_DOCUMENTS: PendingDocument[] = [
  {
    id: 1,
    name: 'Contrato Laboral - Carlos Martínez',
    type: 'Contrato',
    requestedBy: 'María López',
    deadline: '2026-06-25',
    signatureOrder: '1 de 3',
    version: 'v2.1',
    signantType: 'Electrónica',
  },
  {
    id: 2,
    name: 'Acuerdo de Confidencialidad - ICL',
    type: 'NDA',
    requestedBy: 'Carlos Pérez',
    deadline: '2026-06-22',
    signatureOrder: '2 de 3',
    version: 'v1.0',
    signantType: 'Digital',
  },
  {
    id: 3,
    name: 'Póliza SOAT Flota 2024',
    type: 'Póliza',
    requestedBy: 'Ana Gómez',
    deadline: '2026-06-30',
    signatureOrder: '1 de 2',
    version: 'v3.0',
    signantType: 'Electrónica',
  },
  {
    id: 4,
    name: 'Contrato Servicio Transporte - Éxito',
    type: 'Contrato',
    requestedBy: 'María López',
    deadline: '2026-07-01',
    signatureOrder: '3 de 4',
    version: 'v1.2',
    signantType: 'Digital',
  },
  {
    id: 5,
    name: 'Otrosí Modificación Ruta - Bogotá Norte',
    type: 'Otrosí',
    requestedBy: 'Carlos Pérez',
    deadline: '2026-06-28',
    signatureOrder: '1 de 2',
    version: 'v1.0',
    signantType: 'Electrónica',
  },
  {
    id: 6,
    name: 'Acta Entrega Vehículo - Tractocamión 845',
    type: 'Acta',
    requestedBy: 'Ana Gómez',
    deadline: '2026-06-24',
    signatureOrder: '2 de 2',
    version: 'v1.0',
    signantType: 'Electrónica',
  },
]

const SIGNED_DOCUMENTS: SignedDocument[] = [
  {
    id: 101,
    name: 'Contrato Marco - Alpina S.A.',
    signaType: 'Digital',
    firmante: 'María López',
    date: '2026-06-19 09:14:32',
    ip: '192.168.1.45',
    status: 'Firmado',
    verificationCode: 'VER-2024-001234',
    hash: 'a3f8c2e1d9b7456f890abc123def4567890abcdef1234567890abcdef12345678',
    allFirmantes: [
      { order: 1, name: 'María López', role: 'Gerente', requestedDate: '2026-06-17', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.45' },
      { order: 2, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-17', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.62' },
      { order: 3, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-17', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.78' },
    ],
  },
  {
    id: 102,
    name: 'Addendum Tarifas Combustible Q2',
    signaType: 'Electrónica',
    firmante: 'Carlos Pérez',
    date: '2026-06-19 10:45:00',
    ip: '192.168.1.62',
    status: 'Firmado',
    verificationCode: 'VER-2024-001235',
    hash: 'b9d4f1c8e6a3257f901bcd234efg5678901bcdefg2345678901bcdefg23456789',
    allFirmantes: [
      { order: 1, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-18', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.62' },
      { order: 2, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-18', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.78' },
    ],
  },
  {
    id: 103,
    name: 'Reglamento Interno de Trabajo v5',
    signaType: 'Digital',
    firmante: 'Ana Gómez',
    date: '2026-06-18 14:22:10',
    ip: '192.168.1.78',
    status: 'Firmado',
    verificationCode: 'VER-2024-001201',
    hash: 'c1e5g3d7f2b8468h012cde345fhi6789012cdefhi3456789012cdefhi34567890',
    allFirmantes: [
      { order: 1, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-16', signedDate: '2026-06-18', status: 'Firmado', ip: '192.168.1.78' },
    ],
  },
  {
    id: 104,
    name: 'Acuerdo SLA Mantenimiento Flota',
    signaType: 'Electrónica',
    firmante: 'María López',
    date: '2026-06-18 11:05:55',
    ip: '192.168.1.45',
    status: 'Rechazado',
    verificationCode: 'VER-2024-001198',
    hash: 'd2f6h4e8g3c9579i123def456gij7890123defgij4567890123defgij45678901',
    allFirmantes: [
      { order: 1, name: 'María López', role: 'Gerente', requestedDate: '2026-06-15', signedDate: '2026-06-18', status: 'Rechazado', ip: '192.168.1.45' },
    ],
  },
  {
    id: 105,
    name: 'Contrato Arrendamiento Bodega Zona Franca',
    signaType: 'Digital',
    firmante: 'Carlos Pérez',
    date: '2026-06-17 16:33:44',
    ip: '192.168.1.62',
    status: 'Firmado',
    verificationCode: 'VER-2024-001182',
    hash: 'e3g7i5f9h4d0680j234efg567hij8901234efghij5678901234efghij56789012',
    allFirmantes: [
      { order: 1, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-14', signedDate: '2026-06-17', status: 'Firmado', ip: '192.168.1.62' },
      { order: 2, name: 'María López', role: 'Gerente', requestedDate: '2026-06-14', signedDate: '2026-06-17', status: 'Firmado', ip: '192.168.1.45' },
    ],
  },
  {
    id: 106,
    name: 'Poder Especial Licitación IDU 2026',
    signaType: 'Digital',
    firmante: 'Ana Gómez',
    date: '2026-06-16 09:58:21',
    ip: '192.168.1.78',
    status: 'Firmado',
    verificationCode: 'VER-2024-001170',
    hash: 'f4h8j6g0i5e1791k345fgh678ijk9012345fghijk6789012345fghijk67890123',
    allFirmantes: [
      { order: 1, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-13', signedDate: '2026-06-16', status: 'Firmado', ip: '192.168.1.78' },
      { order: 2, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-13', signedDate: '2026-06-16', status: 'Firmado', ip: '192.168.1.62' },
    ],
  },
  {
    id: 107,
    name: 'Minuta Compraventa Camión Kenworth T680',
    signaType: 'Electrónica',
    firmante: 'María López',
    date: '2026-06-15 13:12:09',
    ip: '192.168.1.45',
    status: 'Firmado',
    verificationCode: 'VER-2024-001155',
    hash: 'g5i9k7h1j6f2802l456ghi789jkl0123456ghijkl7890123456ghijkl78901234',
    allFirmantes: [
      { order: 1, name: 'María López', role: 'Gerente', requestedDate: '2026-06-12', signedDate: '2026-06-15', status: 'Firmado', ip: '192.168.1.45' },
    ],
  },
  {
    id: 108,
    name: 'Convenio Interadministrativo Municipio Facatativá',
    signaType: 'Digital',
    firmante: 'Carlos Pérez',
    date: '2026-06-14 08:47:30',
    ip: '192.168.1.62',
    status: 'Firmado',
    verificationCode: 'VER-2024-001141',
    hash: 'h6j0l8i2k7g3913m567hij890klm1234567hijklm8901234567hijklm89012345',
    allFirmantes: [
      { order: 1, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-11', signedDate: '2026-06-14', status: 'Firmado', ip: '192.168.1.62' },
      { order: 2, name: 'María López', role: 'Gerente', requestedDate: '2026-06-11', signedDate: '2026-06-14', status: 'Firmado', ip: '192.168.1.45' },
      { order: 3, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-11', signedDate: '2026-06-14', status: 'Firmado', ip: '192.168.1.78' },
    ],
  },
  {
    id: 109,
    name: 'Carta de Intención Fusión ICL-LogiCol',
    signaType: 'Digital',
    firmante: 'Ana Gómez',
    date: '2026-06-13 17:22:58',
    ip: '192.168.1.78',
    status: 'Rechazado',
    verificationCode: 'VER-2024-001128',
    hash: 'i7k1m9j3l8h4024n678ijk901lmn2345678ijklmn9012345678ijklmn90123456',
    allFirmantes: [
      { order: 1, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-10', signedDate: '2026-06-13', status: 'Rechazado', ip: '192.168.1.78' },
    ],
  },
  {
    id: 110,
    name: 'Acuerdo Marco Distribución Zona Centro',
    signaType: 'Electrónica',
    firmante: 'María López',
    date: '2026-06-12 10:03:14',
    ip: '192.168.1.45',
    status: 'Firmado',
    verificationCode: 'VER-2024-001115',
    hash: 'j8l2n0k4m9i5135o789jkl012mno3456789jklmno0123456789jklmno01234567',
    allFirmantes: [
      { order: 1, name: 'María López', role: 'Gerente', requestedDate: '2026-06-09', signedDate: '2026-06-12', status: 'Firmado', ip: '192.168.1.45' },
      { order: 2, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-09', signedDate: '2026-06-12', status: 'Firmado', ip: '192.168.1.62' },
    ],
  },
]

const DOCUMENTS_BY_NAME: DocumentByName[] = [
  {
    id: 201,
    name: 'Contrato Laboral - Carlos Martínez',
    type: 'Contrato',
    firmantes: [
      { order: 1, name: 'María López', role: 'Gerente', requestedDate: '2026-06-17', signedDate: null, status: 'Pendiente' },
      { order: 2, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-17', signedDate: null, status: 'Pendiente' },
      { order: 3, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-17', signedDate: null, status: 'Pendiente' },
    ],
  },
  {
    id: 202,
    name: 'Contrato Marco - Alpina S.A.',
    type: 'Contrato',
    firmantes: [
      { order: 1, name: 'María López', role: 'Gerente', requestedDate: '2026-06-17', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.45' },
      { order: 2, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-17', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.62' },
      { order: 3, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-17', signedDate: '2026-06-19', status: 'Firmado', ip: '192.168.1.78' },
    ],
  },
  {
    id: 203,
    name: 'Acuerdo SLA Mantenimiento Flota',
    type: 'SLA',
    firmantes: [
      { order: 1, name: 'María López', role: 'Gerente', requestedDate: '2026-06-15', signedDate: '2026-06-18', status: 'Rechazado', ip: '192.168.1.45' },
      { order: 2, name: 'Carlos Pérez', role: 'Director', requestedDate: '2026-06-15', signedDate: null, status: 'Pendiente' },
    ],
  },
  {
    id: 204,
    name: 'Póliza SOAT Flota 2024',
    type: 'Póliza',
    firmantes: [
      { order: 1, name: 'Ana Gómez', role: 'Revisora Legal', requestedDate: '2026-06-18', signedDate: null, status: 'Pendiente' },
      { order: 2, name: 'María López', role: 'Gerente', requestedDate: '2026-06-18', signedDate: null, status: 'Pendiente' },
    ],
  },
]

// ─── KPI Card Component ────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: alpha(color, 0.2),
        borderRadius: 2,
        background: alpha(color, 0.04),
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h3" fontWeight={700} sx={{ color, lineHeight: 1 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {label}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: alpha(color, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Firma Dialog ──────────────────────────────────────────────────────────────

interface FirmaDialogProps {
  open: boolean
  document: PendingDocument | null
  onClose: () => void
  onSuccess: () => void
}

function FirmaDialog({ open, document, onClose, onSuccess }: FirmaDialogProps) {
  const [password, setPassword] = useState('')
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = () => {
    if (!password) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setPassword('')
      setObservations('')
      onSuccess()
      onClose()
    }, 2000)
  }

  const handleClose = () => {
    setPassword('')
    setObservations('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2,
        }}
      >
        <Fingerprint />
        <Typography variant="h6" fontWeight={600}>
          Firma Electrónica
        </Typography>
        <IconButton onClick={handleClose} sx={{ ml: 'auto', color: '#fff' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Document Preview */}
        <Box
          sx={{
            background: '#f3f4f6',
            border: '2px dashed #d1d5db',
            borderRadius: 2,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            mb: 3,
          }}
        >
          <PictureAsPdf sx={{ fontSize: 48, color: '#ef4444' }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary" textAlign="center">
            {document?.name}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Vista previa del documento — {document?.version}
          </Typography>
        </Box>

        {/* Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color={DMS_COLOR} sx={{ mb: 1.5 }}>
            Resumen del documento
          </Typography>
          <Stack spacing={1}>
            {[
              { label: 'Documento', value: document?.name },
              { label: 'Versión', value: document?.version },
              { label: 'Firmante', value: 'Usuario Actual' },
              { label: 'Tipo de firma', value: document?.signantType },
              { label: 'Orden de firma', value: document?.signatureOrder },
            ].map(({ label, value }) => (
              <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Auth Fields */}
        <Stack spacing={2}>
          <TextField
            label="Contraseña de confirmación"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <VpnKey sx={{ fontSize: 18, color: DMS_COLOR }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Observaciones (opcional)"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
          />
        </Stack>

        {/* IP Info */}
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            background: alpha(DMS_COLOR, 0.06),
            borderRadius: 1,
            border: `1px solid ${alpha(DMS_COLOR, 0.15)}`,
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Security sx={{ fontSize: 16, color: DMS_COLOR }} />
            <Typography variant="caption" color="text.secondary">
              IP de origen:{' '}
              <strong style={{ color: DMS_COLOR }}>192.168.1.45</strong> — La firma quedará registrada con esta información.
            </Typography>
          </Stack>
        </Box>

        {loading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!password || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Fingerprint />}
          sx={{
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`,
            '&:hover': { background: `linear-gradient(135deg, #0c6478 0%, #0779a0 100%)` },
          }}
        >
          {loading ? 'Procesando...' : 'Confirmar Firma'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Certificate Dialog ────────────────────────────────────────────────────────

interface CertificateDialogProps {
  open: boolean
  document: SignedDocument | null
  onClose: () => void
}

function CertificateDialog({ open, document, onClose }: CertificateDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, #065f46 0%, #047857 100%)`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2,
        }}
      >
        <Verified />
        <Typography variant="h6" fontWeight={600}>
          Certificado de Firma
        </Typography>
        <IconButton onClick={onClose} sx={{ ml: 'auto', color: '#fff' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          {/* Verification Code */}
          <Box sx={{ background: alpha('#10b981', 0.06), borderRadius: 2, p: 2, border: `1px solid ${alpha('#10b981', 0.2)}` }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Código de verificación
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#065f46', fontFamily: 'monospace', mt: 0.5 }}>
              {document?.verificationCode}
            </Typography>
          </Box>

          {/* Hash */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Hash SHA-256
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: '#374151',
                background: '#f9fafb',
                p: 1,
                borderRadius: 1,
                display: 'block',
                border: '1px solid #e5e7eb',
              }}
            >
              {document?.hash}
            </Typography>
          </Box>

          {/* Timestamp */}
          <Stack direction="row" alignItems="center" gap={1}>
            <Schedule sx={{ fontSize: 18, color: DMS_COLOR }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Marca de tiempo
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {document?.date}
              </Typography>
            </Box>
          </Stack>

          <Divider />

          {/* All Firmantes */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color={DMS_COLOR} sx={{ mb: 1.5 }}>
              Firmantes del documento
            </Typography>
            <Stack spacing={1}>
              {document?.allFirmantes.map((f) => (
                <Stack
                  key={f.order}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ p: 1.5, background: '#f9fafb', borderRadius: 1 }}
                >
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {f.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {f.role} • {f.ip}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={f.status}
                    size="small"
                    color={f.status === 'Firmado' ? 'success' : f.status === 'Rechazado' ? 'error' : 'warning'}
                  />
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* QR Simulated */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" fontWeight={700} color={DMS_COLOR} sx={{ mb: 1.5 }}>
              Código QR de verificación
            </Typography>
            <Box
              sx={{
                width: 120,
                height: 120,
                background: '#e5e7eb',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                border: '2px solid #d1d5db',
              }}
            >
              <Stack alignItems="center" gap={0.5}>
                <QrCode sx={{ fontSize: 32, color: '#6b7280' }} />
                <Typography variant="caption" color="text.secondary">
                  QR
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button startIcon={<Download />} variant="contained" sx={{ background: '#065f46', '&:hover': { background: '#064e3b' } }}>
          Descargar Certificado
        </Button>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Tab 1: Pendientes de Firma ────────────────────────────────────────────────

function TabPendientes() {
  const [firmaOpen, setFirmaOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null)
  const [snackOpen, setSnackOpen] = useState(false)

  return (
    <>
      <Grid container spacing={2}>
        {PENDING_DOCUMENTS.map((doc) => (
          <Grid key={doc.id} size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: alpha(DMS_COLOR, 0.15),
                borderRadius: 2,
                height: '100%',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: `0 4px 20px ${alpha(DMS_COLOR, 0.12)}` },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  {/* Header */}
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                    <Stack direction="row" gap={1} alignItems="flex-start" flex={1}>
                      <PictureAsPdf sx={{ color: '#ef4444', mt: 0.2, flexShrink: 0 }} />
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={700} lineHeight={1.3}>
                          {doc.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {doc.type} • {doc.version}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip
                      label={doc.signantType}
                      size="small"
                      sx={{ background: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 600, fontSize: 11 }}
                    />
                  </Stack>

                  <Divider />

                  {/* Details */}
                  <Stack spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between">
                      <Stack direction="row" gap={0.5} alignItems="center">
                        <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          Solicitado por
                        </Typography>
                      </Stack>
                      <Typography variant="caption" fontWeight={600}>
                        {doc.requestedBy}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Stack direction="row" gap={0.5} alignItems="center">
                        <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          Vencimiento
                        </Typography>
                      </Stack>
                      <Typography variant="caption" fontWeight={600} color="#dc2626">
                        {doc.deadline}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Stack direction="row" gap={0.5} alignItems="center">
                        <Assignment sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          Orden de firma
                        </Typography>
                      </Stack>
                      <Typography variant="caption" fontWeight={600}>
                        {doc.signatureOrder}
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Action */}
                  <Button
                    variant="contained"
                    startIcon={<Draw />}
                    fullWidth
                    onClick={() => {
                      setSelectedDoc(doc)
                      setFirmaOpen(true)
                    }}
                    sx={{
                      background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`,
                      '&:hover': { background: `linear-gradient(135deg, #0c6478 0%, #0779a0 100%)` },
                      mt: 0.5,
                    }}
                  >
                    Firmar
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <FirmaDialog
        open={firmaOpen}
        document={selectedDoc}
        onClose={() => setFirmaOpen(false)}
        onSuccess={() => setSnackOpen(true)}
      />

      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackOpen(false)} severity="success" variant="filled">
          Documento firmado exitosamente. El certificado ha sido generado.
        </Alert>
      </Snackbar>
    </>
  )
}

// ─── Tab 2: Firmados ───────────────────────────────────────────────────────────

function TabFirmados() {
  const [certOpen, setCertOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<SignedDocument | null>(null)

  return (
    <>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: alpha(DMS_COLOR, 0.06) }}>
              {['Documento', 'Tipo Firma', 'Firmante', 'Fecha y Hora', 'IP', 'Estado', 'Acciones'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: DMS_COLOR, fontSize: 12, py: 1.5 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {SIGNED_DOCUMENTS.map((doc) => (
              <TableRow key={doc.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <PictureAsPdf sx={{ fontSize: 16, color: '#ef4444' }} />
                    <Typography variant="caption" fontWeight={600}>
                      {doc.name}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={doc.signaType}
                    size="small"
                    sx={{ background: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 600, fontSize: 11 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{doc.firmante}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {doc.date}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {doc.ip}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={doc.status}
                    size="small"
                    icon={doc.status === 'Firmado' ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : <Cancel sx={{ fontSize: '14px !important' }} />}
                    color={doc.status === 'Firmado' ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Visibility sx={{ fontSize: 14 }} />}
                    onClick={() => {
                      setSelectedDoc(doc)
                      setCertOpen(true)
                    }}
                    sx={{ fontSize: 11, color: DMS_COLOR }}
                  >
                    Ver certificado
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <CertificateDialog open={certOpen} document={selectedDoc} onClose={() => setCertOpen(false)} />
    </>
  )
}

// ─── Tab 3: Por Documento ──────────────────────────────────────────────────────

function TabPorDocumento() {
  const [search, setSearch] = useState('')

  const filtered = DOCUMENTS_BY_NAME.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.type.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (s: string) => {
    if (s === 'Firmado') return 'success'
    if (s === 'Rechazado') return 'error'
    return 'warning'
  }

  return (
    <Stack spacing={3}>
      <TextField
        placeholder="Buscar por nombre o tipo de documento..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ maxWidth: 480 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />

      {filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">No se encontraron documentos con ese criterio.</Typography>
        </Box>
      )}

      {filtered.map((doc) => (
        <Card
          key={doc.id}
          elevation={0}
          sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}
        >
          <CardContent sx={{ p: 2.5 }}>
            {/* Doc header */}
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
              <PictureAsPdf sx={{ color: '#ef4444' }} />
              <Box flex={1}>
                <Typography variant="body1" fontWeight={700}>
                  {doc.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {doc.type}
                </Typography>
              </Box>
              <Chip
                label={`${doc.firmantes.filter((f) => f.status === 'Firmado').length} / ${doc.firmantes.length} firmados`}
                size="small"
                sx={{ background: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 600 }}
              />
            </Stack>

            {/* Progress */}
            <LinearProgress
              variant="determinate"
              value={(doc.firmantes.filter((f) => f.status === 'Firmado').length / doc.firmantes.length) * 100}
              sx={{ mb: 2, height: 6, borderRadius: 3, background: '#e5e7eb', '& .MuiLinearProgress-bar': { background: DMS_COLOR } }}
            />

            {/* Stepper timeline */}
            <Stepper orientation="vertical" nonLinear>
              {doc.firmantes.map((f) => (
                <Step key={f.order} active completed={f.status === 'Firmado'}>
                  <StepLabel
                    icon={
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background:
                            f.status === 'Firmado'
                              ? '#10b981'
                              : f.status === 'Rechazado'
                              ? '#ef4444'
                              : alpha(DMS_COLOR, 0.15),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: f.status === 'Pendiente' ? DMS_COLOR : '#fff',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {f.status === 'Firmado' ? (
                          <CheckCircle sx={{ fontSize: 16 }} />
                        ) : f.status === 'Rechazado' ? (
                          <Cancel sx={{ fontSize: 16 }} />
                        ) : (
                          f.order
                        )}
                      </Box>
                    }
                  >
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={600}>
                        {f.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {f.role}
                      </Typography>
                      <Chip label={f.status} size="small" color={statusColor(f.status) as 'success' | 'error' | 'warning'} />
                    </Stack>
                  </StepLabel>
                  <StepContent>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Fecha Solicitado', 'Fecha Firmado', 'IP'].map((h) => (
                              <TableCell key={h} sx={{ fontSize: 11, color: 'text.secondary', py: 0.5, pl: 0 }}>
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontSize: 12, py: 0.75, pl: 0 }}>{f.requestedDate}</TableCell>
                            <TableCell sx={{ fontSize: 12, py: 0.75 }}>{f.signedDate ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, py: 0.75, fontFamily: 'monospace', color: 'text.secondary' }}>
                              {f.ip ?? '—'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DMSFirmas() {
  const [activeTab, setActiveTab] = useState(0)

  const kpis = [
    { label: 'Pendientes de Firma', value: 6, icon: <Schedule />, color: '#f59e0b' },
    { label: 'Firmados Hoy', value: 12, icon: <CheckCircle />, color: '#10b981' },
    { label: 'Rechazados', value: 2, icon: <Cancel />, color: '#ef4444' },
    { label: 'Firmantes Activos', value: 8, icon: <Person />, color: DMS_COLOR },
  ]

  return (
    <Layout title="Firma Electrónica y Digital">
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Page Header */}
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #0891b2 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Fingerprint sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Firma Electrónica y Digital
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión centralizada de firmas de documentos — ICL Transporte
            </Typography>
          </Box>
        </Stack>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard {...kpi} />
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
          <Box sx={{ borderBottom: '1px solid #e5e7eb' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                px: 2,
                '& .MuiTab-root': { fontWeight: 600, fontSize: 13, textTransform: 'none', minHeight: 48 },
                '& .Mui-selected': { color: DMS_COLOR },
                '& .MuiTabs-indicator': { background: DMS_COLOR },
              }}
            >
              <Tab
                label={
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Schedule sx={{ fontSize: 16 }} />
                    Pendientes de Firma
                    <Chip label="6" size="small" sx={{ height: 18, fontSize: 10, background: alpha('#f59e0b', 0.15), color: '#b45309' }} />
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Verified sx={{ fontSize: 16 }} />
                    Firmados
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Assignment sx={{ fontSize: 16 }} />
                    Por Documento
                  </Stack>
                }
              />
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {activeTab === 0 && <TabPendientes />}
            {activeTab === 1 && <TabFirmados />}
            {activeTab === 2 && <TabPorDocumento />}
          </Box>
        </Card>
      </Box>
    </Layout>
  )
}
